#!/usr/bin/env tsx
/**
 * collect.ts
 *
 * 数据采集主脚本。调用 reado CLI 从 165+ 信息源采集数据。
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
  isCommandAvailable,
  runCommand,
  runCommandAsync,
  readJSON,
  writeJSON,
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

// ─── Config ──────────────────────────────────────────────────────────

const READO_TIMEOUT = 180_000  // 3 min per command
const COLLECTION_COMMANDS = {
  // Cloud-safe commands (no browser/cookie needed)
  cloud: [
    {
      name: 'ai-bundle',
      cmd: 'reado search --bundle ai -t 24 --no-cache -f json',
      description: 'AI 全源采集 (66 源)',
    },
    {
      name: 'hackernews',
      cmd: 'reado hackernews top -t 24 -f json',
      description: 'Hacker News 热门',
    },
    {
      name: 'github-trending',
      cmd: 'reado search -s github-trending -f json',
      description: 'GitHub Trending',
    },
  ],
  // Local-only commands (require opencli + Chrome cookies)
  local: [
    {
      name: 'twitter',
      cmd: '', // Dynamic: built from twitter-watchlist.txt
      description: 'Twitter 关注列表',
    },
  ],
}

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

// ─── Build Twitter command ───────────────────────────────────────────

function buildTwitterCommand(): string | null {
  const configDir = getConfigDir()

  // Priority 1: config/twitter-watchlist.txt (from Feishu sync)
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

  // Priority 2: ~/.reado/twitter-watchlist.txt (reado default)
  const readoWatchlist = join(process.env.HOME || '~', '.reado', 'twitter-watchlist.txt')
  if (existsSync(readoWatchlist)) {
    log.info('Twitter: using ~/.reado/twitter-watchlist.txt')
    return 'reado twitter timeline -t 24 --no-cache -f json'
  }

  log.warn('Twitter: no watchlist found, skipping')
  return null
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

  log.step(`Starting data collection (mode: ${mode})`)
  log.info(`Date: ${dayjs().format('YYYY-MM-DD HH:mm')}`)

  // Check prerequisites
  if (!isCommandAvailable('reado')) {
    log.error('reado CLI not found. Install with: npm install -g reado')
    process.exit(1)
  }

  // Build command list based on mode
  const commands: Array<{ name: string; cmd: string; description: string }> = []

  if (mode === 'cloud' || mode === 'all') {
    commands.push(...COLLECTION_COMMANDS.cloud)
  }

  if (mode === 'local' || mode === 'all') {
    // Check opencli for local sources
    if (isCommandAvailable('opencli')) {
      const twitterCmd = buildTwitterCommand()
      if (twitterCmd) {
        commands.push({
          name: 'twitter',
          cmd: twitterCmd,
          description: 'Twitter 关注列表',
        })
      }
    } else {
      log.warn('opencli not found. Local cookie sources will be skipped.')
    }
  }

  if (commands.length === 0) {
    log.error('No collection commands to run.')
    process.exit(1)
  }

  log.info(`Running ${commands.length} collection commands...`)

  // Run all collections in parallel
  const results = await Promise.all(
    commands.map(c => runCollection(c.name, c.cmd, c.description))
  )

  // Aggregate results
  const successCount = results.filter(r => r.success).length
  const failCount = results.filter(r => !r.success).length
  const allItems = results.flatMap(r => r.items)

  if (allItems.length === 0 && successCount === 0) {
    log.error('All collections failed. Check network and tool installations.')
    process.exit(1)
  }

  // Get data directory
  const dataDir = getDataDir()

  // For cloud mode, merge with local.json if it exists
  let mergedItems = allItems
  if (mode === 'cloud') {
    mergedItems = mergeLocalData(dataDir, allItems)
  }

  // Deduplicate
  const { items: uniqueItems, removedCount } = deduplicateItems(mergedItems)

  // Build output
  const output: CollectedData = {
    fetchedAt: dayjs().toISOString(),
    stats: {
      totalSources: commands.length,
      successSources: successCount,
      failedSources: failCount,
      totalItems: uniqueItems.length,
      deduplicatedItems: removedCount,
    },
    items: uniqueItems,
  }

  // Write output
  const outputFile = mode === 'local' ? 'local.json' : 'raw.json'
  const outputPath = join(dataDir, outputFile)
  writeJSON(outputPath, output)

  // Summary
  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1)
  log.step('Collection complete!')
  log.data('Output', outputPath)
  log.data('Sources', `${successCount}/${commands.length} succeeded`)
  log.data('Items', `${uniqueItems.length} unique (${removedCount} duplicates removed)`)
  log.data('Duration', `${totalDuration}s`)

  // Print warnings for failed sources
  const failed = results.filter(r => !r.success)
  if (failed.length > 0) {
    log.warn('Failed sources:')
    for (const r of failed) {
      log.data(`  ${r.name}`, r.error || 'Unknown error')
    }
  }
}

main().catch(err => {
  log.error(`collect.ts crashed: ${err}`)
  process.exit(1)
})
