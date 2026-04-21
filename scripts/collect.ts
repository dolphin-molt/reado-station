#!/usr/bin/env tsx
/**
 * collect.ts
 *
 * 数据采集主脚本。读取 config/sources.json，按 adapter 分组调用 reado CLI。
 *
 * 模式：
 * --mode cloud   只采集 RSS/API 源（GitHub Actions 环境）
 * --mode local   只采集 cookie 源 via opencli（本地 Mac 环境）
 * --mode all     采集全部（默认，本地开发）
 *
 * 输出：data/YYYY/MM/DD/{batch}/raw.json 或 local.json
 */
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import dayjs from 'dayjs'
import {
  collectedDataStatements,
  wrapTransaction,
} from './lib/d1-sql.js'
import {
  isD1ApiWriteRequired,
  postCollectionToD1Api,
} from './lib/d1-api.js'
import {
  isCommandAvailable,
  runCommandAsync,
  readJSON,
  writeJSON,
  writeText,
  readText,
  getDataDir,
  getConfigDir,
  getProjectRoot,
  deduplicateItems,
  log,
  type CollectedData,
  type InfoItem,
  type CollectionResult,
} from './lib/utils.js'

// ─── Types ──────────────────────────────────────────────────────────

interface SourceConfig {
  id: string
  name: string
  adapter: string       // rss | wordpress | opencli | github-trending | twitter | telegram
  url?: string
  hours?: number
  enabled?: boolean
  category?: string
  topics?: string[]
}

// ─── Config ──────────────────────────────────────────────────────────

const READO_TIMEOUT = 600_000   // 10 min per command
const BATCH_SIZE = 15           // max sources per reado search call
const CONCURRENCY = 3           // max parallel reado calls

// ─── Parse arguments ─────────────────────────────────────────────────

type Mode = 'cloud' | 'local' | 'all'

function parseArgs(): { mode: Mode } {
  const args = process.argv.slice(2)
  const modeIdx = args.indexOf('--mode')
  const mode = modeIdx >= 0 ? (args[modeIdx + 1] as Mode) : 'all'

  if (!['cloud', 'local', 'all'].includes(mode)) {
    log.error(`Invalid mode: ${mode}. Use cloud, local, or all.`)
    process.exit(1)
  }

  return { mode }
}

// ─── Load sources from config ────────────────────────────────────────

function loadSources(): SourceConfig[] {
  const configDir = getConfigDir()
  const sourcesPath = join(configDir, 'sources.json')

  if (!existsSync(sourcesPath)) {
    log.error(`sources.json not found at ${sourcesPath}`)
    process.exit(1)
  }

  const data = readJSON<any>(sourcesPath)
  const sources: SourceConfig[] = data?.sources || data || []
  const enabled = sources.filter(s => s.enabled !== false)

  log.info(`Loaded ${enabled.length}/${sources.length} enabled sources from sources.json`)
  return enabled
}

// ─── Categorize sources by collection method ─────────────────────────

interface SourceGroups {
  // Cloud-safe: can run in CI without browser
  reado: SourceConfig[]           // rss, wordpress — use `reado search -s`
  hackernews: SourceConfig[]      // hackernews adapter
  githubTrending: SourceConfig[]  // github-trending adapter

  // Local-only: need opencli + browser cookies
  opencli: SourceConfig[]         // opencli adapter (reddit, medium, etc.)
  twitter: SourceConfig[]         // twitter adapter
  telegram: SourceConfig[]        // telegram adapter
}

function groupSources(sources: SourceConfig[]): SourceGroups {
  const groups: SourceGroups = {
    reado: [],
    hackernews: [],
    githubTrending: [],
    opencli: [],
    twitter: [],
    telegram: [],
  }

  for (const s of sources) {
    switch (s.adapter) {
      case 'rss':
      case 'wordpress':
        groups.reado.push(s)
        break
      case 'hackernews':
        groups.hackernews.push(s)
        break
      case 'github-trending':
        groups.githubTrending.push(s)
        break
      case 'opencli':
        groups.opencli.push(s)
        break
      case 'twitter':
        groups.twitter.push(s)
        break
      case 'telegram':
        groups.telegram.push(s)
        break
      default:
        log.warn(`Unknown adapter "${s.adapter}" for source "${s.id}", skipping`)
    }
  }

  return groups
}

// ─── Run a single collection command ─────────────────────────────────

async function runCollection(name: string, cmd: string, description: string): Promise<CollectionResult> {
  const start = Date.now()
  log.info(`[${name}] ${description}...`)

  try {
    const { stdout } = await runCommandAsync(cmd, { timeout: READO_TIMEOUT })
    const data = JSON.parse(stdout) as CollectedData
    const items = data.items || []

    log.success(`[${name}] ${items.length} items (${((Date.now() - start) / 1000).toFixed(1)}s)`)

    return {
      name,
      success: true,
      items,
      duration: Date.now() - start,
    }
  } catch (err: any) {
    const duration = Date.now() - start
    const errMsg = err.stderr?.slice(0, 200) || err.message?.slice(0, 200) || 'Unknown error'

    log.error(`[${name}] Failed (${(duration / 1000).toFixed(1)}s): ${errMsg}`)

    return {
      name,
      success: false,
      items: [],
      error: errMsg,
      duration,
    }
  }
}

// ─── Run collections with concurrency control ────────────────────────

async function runWithConcurrency(
  tasks: Array<{ name: string; cmd: string; description: string }>,
  concurrency: number
): Promise<CollectionResult[]> {
  const results: CollectionResult[] = []

  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency)
    const batchResults = await Promise.all(
      batch.map(t => runCollection(t.name, t.cmd, t.description))
    )
    results.push(...batchResults)
  }

  return results
}

// ─── Build cloud collection tasks ────────────────────────────────────

function buildCloudTasks(groups: SourceGroups): Array<{ name: string; cmd: string; description: string }> {
  const tasks: Array<{ name: string; cmd: string; description: string }> = []

  // 1. RSS/WordPress sources — batch into groups of BATCH_SIZE
  if (groups.reado.length > 0) {
    for (let i = 0; i < groups.reado.length; i += BATCH_SIZE) {
      const batch = groups.reado.slice(i, i + BATCH_SIZE)
      const ids = batch.map(s => s.id).join(' ')
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(groups.reado.length / BATCH_SIZE)

      tasks.push({
        name: `rss-batch-${batchNum}`,
        cmd: `reado search -s ${ids} -t 24 --no-cache -f json`,
        description: `RSS 源 batch ${batchNum}/${totalBatches} (${batch.length} 源: ${batch.slice(0, 3).map(s => s.id).join(', ')}${batch.length > 3 ? '...' : ''})`,
      })
    }
  }

  // 2. Hacker News
  if (groups.hackernews.length > 0) {
    tasks.push({
      name: 'hackernews',
      cmd: 'reado hackernews top -t 24 -f json',
      description: 'Hacker News 热门',
    })
  }

  // 3. GitHub Trending
  for (const s of groups.githubTrending) {
    const suffix = s.id === 'github-trending' ? '' : `-${s.id.replace('github-trending-', '')}`
    tasks.push({
      name: s.id,
      cmd: `reado search -s ${s.id} -f json`,
      description: `GitHub Trending${suffix ? ' (' + suffix.slice(1) + ')' : ''}`,
    })
  }

  return tasks
}

// ─── Build local collection tasks ────────────────────────────────────

function buildLocalTasks(groups: SourceGroups): Array<{ name: string; cmd: string; description: string }> {
  const tasks: Array<{ name: string; cmd: string; description: string }> = []

  // 1. Twitter — build from watchlist
  if (groups.twitter.length > 0) {
    const twitterCmd = buildTwitterCommand()
    if (twitterCmd) {
      tasks.push({
        name: 'twitter',
        cmd: twitterCmd,
        description: 'Twitter 关注列表',
      })
    }
  }

  // 2. opencli sources (Reddit, Medium, etc.)
  for (const s of groups.opencli) {
    // Map source config to opencli command
    const cmd = buildOpencliCommand(s)
    if (cmd) {
      tasks.push({
        name: s.id,
        cmd,
        description: `${s.name} (opencli)`,
      })
    }
  }

  return tasks
}

// ─── Build Twitter command ───────────────────────────────────────────

function buildTwitterCommand(): string | null {
  const configDir = getConfigDir()

  const watchlistPath = join(configDir, 'twitter-watchlist.txt')
  if (existsSync(watchlistPath)) {
    const handles = readText(watchlistPath)
      .split('\n')
      .map(h => h.trim().replace(/^@/, ''))
      .filter(Boolean)

    if (handles.length > 0) {
      log.info(`Twitter: ${handles.length} handles from config/twitter-watchlist.txt`)
      return `reado twitter timeline ${handles.join(' ')} -t 24 --no-cache -f json`
    }
  }

  const readoWatchlist = join(process.env.HOME || '~', '.reado', 'twitter-watchlist.txt')
  if (existsSync(readoWatchlist)) {
    const readoHandles = readText(readoWatchlist)
      .split('\n')
      .map(line => line.replace(/#.*$/, '').trim())
      .filter(h => h && !h.startsWith('#'))
      .map(h => h.replace(/^@/, ''))

    if (readoHandles.length > 0) {
      log.info(`Twitter: ${readoHandles.length} handles from ~/.reado/twitter-watchlist.txt`)
      return `reado twitter timeline ${readoHandles.join(' ')} -t 24 --no-cache -f json`
    }

    log.info('Twitter: using ~/.reado/twitter-watchlist.txt (reado default)')
    return 'reado twitter timeline -t 24 --no-cache -f json'
  }

  log.warn('Twitter: no watchlist found, skipping')
  return null
}

// ─── Build opencli command from source config ────────────────────────

function buildOpencliCommand(source: SourceConfig): string | null {
  // opencli sources use `reado search -s {id}` which internally calls opencli
  // These need Chrome cookies so only work locally
  return `reado search -s ${source.id} -t ${source.hours || 24} --no-cache -f json`
}

// ─── Merge local.json into raw.json ──────────────────────────────────

function mergeLocalData(dataDir: string, cloudItems: InfoItem[]): InfoItem[] {
  const localPath = join(dataDir, 'local.json')
  if (!existsSync(localPath)) {
    log.info('No local.json found, using cloud data only')
    return cloudItems
  }

  const localData = readJSON<CollectedData>(localPath)
  if (!localData?.items?.length) {
    log.info('local.json is empty')
    return cloudItems
  }

  log.info(`Merging ${localData.items.length} local items with ${cloudItems.length} cloud items`)
  return [...cloudItems, ...localData.items]
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  const { mode } = parseArgs()
  const startTime = Date.now()
  const runStartedAt = dayjs()
  const runDate = runStartedAt.format('YYYY-MM-DD')
  const runBatch: 'morning' | 'evening' = runStartedAt.hour() < 14 ? 'morning' : 'evening'

  log.step(`Starting data collection (mode: ${mode})`)
  log.info(`Date: ${runStartedAt.format('YYYY-MM-DD HH:mm')}`)

  // Check prerequisites
  if (!isCommandAvailable('reado')) {
    log.error('reado CLI not found. Install with: npm install -g @dolphin-molt/reado')
    process.exit(1)
  }

  // Load and group sources
  const sources = loadSources()
  const groups = groupSources(sources)

  log.info(`Source breakdown: ${groups.reado.length} RSS, ${groups.hackernews.length} HN, ${groups.githubTrending.length} GitHub, ${groups.opencli.length} opencli, ${groups.twitter.length} Twitter, ${groups.telegram.length} Telegram`)

  // Build tasks based on mode
  const tasks: Array<{ name: string; cmd: string; description: string }> = []

  if (mode === 'cloud' || mode === 'all') {
    tasks.push(...buildCloudTasks(groups))
  }

  if (mode === 'local' || mode === 'all') {
    if (isCommandAvailable('opencli')) {
      tasks.push(...buildLocalTasks(groups))
    } else if (mode === 'all') {
      log.warn('opencli not found. Local cookie sources will be skipped.')
      // Still run cloud tasks
    } else {
      log.error('opencli not found. Required for local mode.')
      process.exit(1)
    }
  }

  if (tasks.length === 0) {
    log.error('No collection tasks to run.')
    process.exit(1)
  }

  log.info(`Running ${tasks.length} collection tasks (concurrency: ${CONCURRENCY})...`)

  // Run with concurrency control
  const results = await runWithConcurrency(tasks, CONCURRENCY)

  // Aggregate results
  const successCount = results.filter(r => r.success).length
  const failCount = results.filter(r => !r.success).length
  const allItems = results.flatMap(r => r.items)
  const totalSourcesAttempted = groups.reado.length + groups.hackernews.length +
    groups.githubTrending.length + (mode !== 'cloud' ? groups.opencli.length + groups.twitter.length : 0)

  if (allItems.length === 0 && successCount === 0) {
    log.error('All collections failed. Check network and tool installations.')
    process.exit(1)
  }

  // Get data directory
  const dataDir = getDataDir(runBatch)

  // For cloud mode, merge with local.json if it exists
  let mergedItems = allItems
  if (mode === 'cloud') {
    mergedItems = mergeLocalData(dataDir, allItems)
  }

  // Deduplicate
  const { items: uniqueItems, removedCount } = deduplicateItems(mergedItems)

  // Track which actual sources contributed items
  const contributingSources = new Set(uniqueItems.map(i => i.source))

  // Build output
  const output: CollectedData = {
    fetchedAt: dayjs().toISOString(),
    stats: {
      totalSources: totalSourcesAttempted,
      successSources: successCount,
      failedSources: failCount,
      totalItems: uniqueItems.length,
      deduplicatedItems: removedCount,
      contributingSources: contributingSources.size,
      successSourceIds: [...contributingSources],
      failedSourceIds: results.filter(r => !r.success).map(r => r.name),
    },
    items: uniqueItems,
  }

  // Write output
  const outputFile = mode === 'local' ? 'local.json' : 'raw.json'
  const outputPath = join(dataDir, outputFile)
  writeJSON(outputPath, output)

  try {
    const shadowSqlPath = join(dataDir, mode === 'local' ? 'd1-local.sql' : 'd1-raw.sql')
    const shadowSql = wrapTransaction(
      `reado-station ${mode} collection shadow write`,
      collectedDataStatements(output, {
        date: runDate,
        batch: runBatch,
        mode,
        updatedAt: output.fetchedAt,
      }),
      output.fetchedAt,
    )
    writeText(shadowSqlPath, shadowSql)
    log.data('D1 shadow SQL', shadowSqlPath)
  } catch (err: any) {
    log.warn(`D1 shadow SQL write skipped: ${err?.message ?? err}`)
  }

  try {
    const result = await postCollectionToD1Api(output, {
      date: runDate,
      batch: runBatch,
      mode,
    })
    if (result.status === 'posted') {
      log.data('D1 API write', result.url ?? 'posted')
    } else if (isD1ApiWriteRequired()) {
      throw new Error(result.reason ?? 'D1 API write skipped')
    }
  } catch (err: any) {
    if (isD1ApiWriteRequired()) {
      log.error(`D1 API write failed: ${err?.message ?? err}`)
      process.exit(1)
    }
    log.warn(`D1 API write skipped: ${err?.message ?? err}`)
  }

  // Summary
  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1)
  log.step('Collection complete!')
  log.data('Output', outputPath)
  log.data('Sources', `${contributingSources.size} contributing / ${successCount} tasks ok / ${tasks.length} total tasks`)
  log.data('Items', `${uniqueItems.length} unique (${removedCount} duplicates removed)`)
  log.data('Duration', `${totalDuration}s`)

  // Print warnings for failed sources
  const failed = results.filter(r => !r.success)
  if (failed.length > 0) {
    log.warn(`Failed tasks (${failed.length}):`)
    for (const r of failed) {
      log.data(`  ${r.name}`, r.error || 'Unknown error')
    }
  }
}

main().catch(err => {
  log.error(`collect.ts crashed: ${err}`)
  process.exit(1)
})
