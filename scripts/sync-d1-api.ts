#!/usr/bin/env tsx
/**
 * Backfill local repository data through the same HTTP APIs used by collection.
 */
import { existsSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'

import type { CollectedData } from './lib/utils.js'
import { postCollectionToD1Api, postDigestToD1Api, putOpsStateToD1Api, type D1ApiResult } from './lib/d1-api.js'
import { getProjectRoot, readJSON, readText } from './lib/utils.js'

interface SyncOptions {
  dryRun: boolean
  requireWrites: boolean
}

interface CollectionJob {
  date: string
  batch: string
  path: string
}

interface DigestJob {
  date: string
  batch: string
  path: string
}

interface SyncStats {
  collections: number
  collectionItems: number
  digests: number
  opsStateKeys: number
}

function parseArgs(args: string[]): SyncOptions {
  const options: SyncOptions = {
    dryRun: false,
    requireWrites: false,
  }

  for (const arg of args) {
    if (arg === '--dry-run') {
      options.dryRun = true
    } else if (arg === '--require') {
      options.requireWrites = true
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: npm run d1:sync-api -- [--dry-run] [--require]')
      process.exit(0)
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  return options
}

function datePartsToDate(year: string, month: string, day: string): string {
  return `${year}-${month}-${day}`
}

function collectJobs(projectRoot: string): { collections: CollectionJob[]; digests: DigestJob[] } {
  const dataRoot = join(projectRoot, 'data')
  const collections: CollectionJob[] = []
  const digests: DigestJob[] = []
  if (!existsSync(dataRoot)) return { collections, digests }

  const years = readdirSync(dataRoot).filter((entry) => /^\d{4}$/.test(entry)).sort()
  for (const year of years) {
    const yearDir = join(dataRoot, year)
    const months = readdirSync(yearDir).filter((entry) => /^\d{2}$/.test(entry)).sort()
    for (const month of months) {
      const monthDir = join(yearDir, month)
      const days = readdirSync(monthDir).filter((entry) => /^\d{2}$/.test(entry)).sort()
      for (const day of days) {
        const date = datePartsToDate(year, month, day)
        const dayDir = join(monthDir, day)
        const batches = readdirSync(dayDir).sort()
        for (const batch of batches) {
          const batchDir = join(dayDir, batch)
          const rawPath = join(batchDir, 'raw.json')
          const digestPath = join(batchDir, 'digest.md')
          if (existsSync(rawPath)) collections.push({ date, batch, path: rawPath })
          if (existsSync(digestPath)) digests.push({ date, batch, path: digestPath })
        }
      }
    }
  }

  return { collections, digests }
}

function assertPosted(result: D1ApiResult, label: string, requireWrites: boolean): void {
  if (result.status === 'posted') return
  const message = `${label} skipped: ${result.reason ?? 'unknown reason'}`
  if (requireWrites) throw new Error(message)
  console.warn(message)
}

async function syncCollections(jobs: CollectionJob[], projectRoot: string, options: SyncOptions): Promise<{ count: number; items: number }> {
  let count = 0
  let items = 0

  for (const job of jobs) {
    const data = readJSON<CollectedData>(job.path)
    if (!data) throw new Error(`Failed to read collection JSON: ${job.path}`)
    const itemCount = data.items?.length ?? 0
    items += itemCount

    if (options.dryRun) {
      console.log(`[dry-run] collection ${job.date}/${job.batch}: ${itemCount} items`)
      count += 1
      continue
    }

    const result = await postCollectionToD1Api(data, {
      date: job.date,
      batch: job.batch,
      mode: 'backfill',
    })
    assertPosted(result, `collection ${relative(projectRoot, job.path)}`, options.requireWrites)
    if (result.status === 'posted') {
      console.log(`synced collection ${job.date}/${job.batch}: ${itemCount} items`)
      count += 1
    }
  }

  return { count, items }
}

async function syncDigests(jobs: DigestJob[], projectRoot: string, options: SyncOptions): Promise<number> {
  let count = 0

  for (const job of jobs) {
    const markdown = readText(job.path)
    if (!markdown.trim()) continue
    const headline = markdown.match(/^#\s+(.+)$/m)?.[1]

    if (options.dryRun) {
      console.log(`[dry-run] digest ${job.date}/${job.batch}`)
      count += 1
      continue
    }

    const result = await postDigestToD1Api({
      date: job.date,
      batch: job.batch,
      headline,
      markdown,
    })
    assertPosted(result, `digest ${relative(projectRoot, job.path)}`, options.requireWrites)
    if (result.status === 'posted') {
      console.log(`synced digest ${job.date}/${job.batch}`)
      count += 1
    }
  }

  return count
}

async function syncOpsState(projectRoot: string, options: SyncOptions): Promise<number> {
  const opsStatePath = join(projectRoot, 'data', 'ops-state.json')
  if (!existsSync(opsStatePath)) return 0
  const state = readJSON<Record<string, unknown>>(opsStatePath)
  if (!state) throw new Error(`Failed to read ops state: ${opsStatePath}`)
  const keys = Object.keys(state)

  if (options.dryRun) {
    console.log(`[dry-run] ops-state: ${keys.length} keys`)
    return keys.length
  }

  const result = await putOpsStateToD1Api(state)
  assertPosted(result, `ops-state ${relative(projectRoot, opsStatePath)}`, options.requireWrites)
  if (result.status === 'posted') {
    console.log(`synced ops-state: ${keys.length} keys`)
    return keys.length
  }
  return 0
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const projectRoot = getProjectRoot()
  const { collections, digests } = collectJobs(projectRoot)

  const stats: SyncStats = {
    collections: 0,
    collectionItems: 0,
    digests: 0,
    opsStateKeys: 0,
  }

  const collectionStats = await syncCollections(collections, projectRoot, options)
  stats.collections = collectionStats.count
  stats.collectionItems = collectionStats.items
  stats.digests = await syncDigests(digests, projectRoot, options)
  stats.opsStateKeys = await syncOpsState(projectRoot, options)

  console.log(JSON.stringify({ status: options.dryRun ? 'dry-run' : 'ok', stats }, null, 2))
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
