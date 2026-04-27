#!/usr/bin/env tsx
/**
 * Process queued workspace backfill jobs.
 *
 * X backfill uses reado CLI only. For low-cost testing, run:
 *   npm run backfill:run -- --limit 1 --max-items 1
 */
import dayjs from 'dayjs'

import { postCollectionToD1Api } from './lib/d1-api.js'
import { deduplicateItems, isCommandAvailable, log, runCommandAsync, type CollectedData, type InfoItem } from './lib/utils.js'

interface BackfillJob {
  id: string
  workspaceId: string
  sourceId: string
  sourceType: string
  backfillHours: number
  sourceName: string
  sourceUrl: string
  adapter: string
}

interface Args {
  limit: number
  maxItems: number
}

const READO_TIMEOUT = 300_000

function env(name: string): string | undefined {
  return process.env[name]
}

function apiBaseUrl(): string | null {
  return env('READO_D1_API_BASE_URL') ?? env('READO_D1_API_URL') ?? null
}

function apiSecret(): string | null {
  return env('READO_D1_API_SECRET') ?? env('READO_API_SECRET') ?? null
}

function parseArgs(): Args {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    console.log([
      'Usage: npm run backfill:run -- [--limit 1] [--max-items 1]',
      '',
      'Environment:',
      '  READO_D1_API_BASE_URL   Base URL of the deployed web app',
      '  READO_D1_API_SECRET     API secret for /api/backfill/run and /api/ingest',
      '',
      'Low-cost X test:',
      '  npm run backfill:run -- --limit 1 --max-items 1',
    ].join('\n'))
    process.exit(0)
  }

  const readNumber = (flag: string, fallback: number): number => {
    const index = args.indexOf(flag)
    if (index < 0) return fallback
    const value = Number(args[index + 1])
    return Number.isFinite(value) && value > 0 ? value : fallback
  }

  return {
    limit: Math.min(readNumber('--limit', 1), 20),
    maxItems: Math.min(readNumber('--max-items', Number(env('READO_BACKFILL_MAX_ITEMS') ?? 10)), 100),
  }
}

async function callBackfillApi(payload: Record<string, unknown>): Promise<any> {
  const baseUrl = apiBaseUrl()
  const secret = apiSecret()
  if (!baseUrl) throw new Error('READO_D1_API_BASE_URL or READO_D1_API_URL is not configured')
  if (!secret) throw new Error('READO_D1_API_SECRET or READO_API_SECRET is not configured')

  const response = await fetch(new URL('/api/backfill/run', baseUrl), {
    method: 'POST',
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Backfill API failed: ${response.status} ${text.slice(0, 500)}`)
  }

  return response.json()
}

function usernameFromSource(job: BackfillJob): string {
  const fromId = job.sourceId.replace(/^tw-/i, '')
  if (fromId) return fromId
  try {
    return new URL(job.sourceUrl).pathname.split('/').filter(Boolean)[0] ?? ''
  } catch {
    return ''
  }
}

function shellArg(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`
}

async function collectXJob(job: BackfillJob, maxItems: number): Promise<InfoItem[]> {
  const username = usernameFromSource(job)
  if (!username) throw new Error(`Cannot infer X username for ${job.sourceId}`)

  const cmd = [
    'reado',
    'twitter',
    'timeline',
    shellArg(username),
    '-t',
    String(Math.max(1, Number(job.backfillHours) || 24)),
    '-l',
    String(maxItems),
    '--no-cache',
    '-f',
    'json',
  ].join(' ')

  log.info(`[${job.id}] ${cmd}`)
  const { stdout } = await runCommandAsync(cmd, { timeout: READO_TIMEOUT })
  const data = JSON.parse(stdout) as { items?: InfoItem[] }
  return (data.items ?? [])
    .filter((item) => item.url)
    .slice(0, maxItems)
    .map((item) => ({
      ...item,
      source: item.source || job.sourceId,
      sourceName: item.sourceName || job.sourceName,
    }))
}

function groupItemsByDate(items: InfoItem[]): Map<string, InfoItem[]> {
  const grouped = new Map<string, InfoItem[]>()
  const today = dayjs().format('YYYY-MM-DD')

  for (const item of items) {
    const date = item.publishedAt ? dayjs(item.publishedAt).format('YYYY-MM-DD') : today
    const bucket = date === 'Invalid Date' ? today : date
    grouped.set(bucket, [...(grouped.get(bucket) ?? []), item])
  }

  return grouped
}

async function postItems(job: BackfillJob, items: InfoItem[]): Promise<number> {
  const { items: uniqueItems } = deduplicateItems(items)
  const grouped = groupItemsByDate(uniqueItems)
  let posted = 0

  for (const [date, dateItems] of grouped.entries()) {
    const payload: CollectedData = {
      fetchedAt: new Date().toISOString(),
      stats: {
        totalSources: 1,
        successSources: 1,
        failedSources: 0,
        totalItems: dateItems.length,
        deduplicatedItems: 0,
        contributingSources: 1,
        successSourceIds: [job.sourceId],
        failedSourceIds: [],
      },
      items: dateItems,
    }

    await postCollectionToD1Api(payload, {
      date,
      batch: 'backfill',
      mode: 'backfill',
    })
    posted += dateItems.length
  }

  return posted
}

async function processJob(job: BackfillJob, maxItems: number): Promise<void> {
  if (job.sourceType !== 'x') {
    await callBackfillApi({ action: 'fail', jobId: job.id, error: `Unsupported backfill source type: ${job.sourceType}` })
    return
  }

  try {
    const items = await collectXJob(job, maxItems)
    const posted = await postItems(job, items)
    await callBackfillApi({ action: 'complete', jobId: job.id, creditsUsed: posted })
    log.success(`[${job.id}] completed with ${posted} item(s)`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await callBackfillApi({ action: 'fail', jobId: job.id, error: message })
    log.error(`[${job.id}] failed: ${message}`)
  }
}

async function main() {
  const args = parseArgs()
  if (!isCommandAvailable('reado')) {
    throw new Error('reado CLI not found. Install with: npm install -g @dolphin-molt/reado')
  }

  const claimed = (await callBackfillApi({ action: 'claim', limit: args.limit })) as { jobs?: BackfillJob[] }
  const jobs = claimed.jobs ?? []
  if (jobs.length === 0) {
    log.info('No queued backfill jobs')
    return
  }

  for (const job of jobs) {
    await processJob(job, args.maxItems)
  }
}

main().catch((error) => {
  log.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
