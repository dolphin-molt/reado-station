#!/usr/bin/env tsx
/**
 * sync-sources.ts
 *
 * 从飞书多维表格同步信息源配置到本地 config/ 目录
 * 飞书 = source of truth, GitHub = 备份
 *
 * 执行策略：
 * 1. 尝试从飞书拉取「信息源」表 → config/sources.json
 * 2. 尝试从飞书拉取「关注对象」表 → 按平台转换配置
 * 3. 失败则降级使用 GitHub 备份 (config/ 已有文件)
 */
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import {
  isCommandAvailable,
  runCommand,
  readJSON,
  writeJSON,
  writeText,
  getConfigDir,
  getProjectRoot,
  log,
} from './lib/utils.js'

// ─── Types ───────────────────────────────────────────────────────────

interface BitableSource {
  源ID: string
  名称: string
  采集策略: string
  适配器: string
  URL: string
  分类: string
  关键词: string
  时间窗口: number
  启用: boolean
  状态: string
  备注: string
}

interface BitableFollow {
  平台: string
  标识: string
  显示名: string
  描述: string
  分类: string
  启用: boolean
  备注: string
}

interface SourceConfig {
  id: string
  name: string
  adapter: string
  url: string
  hours: number
  topics: string[]
  enabled: boolean
  category: string
}

// ─── Platform conversion rules ───────────────────────────────────────

function followToSource(follow: BitableFollow): SourceConfig | null {
  if (!follow.启用) return null

  const platform = follow.平台
  const id = follow.标识
  const name = follow.显示名 || id

  switch (platform) {
    case 'Twitter':
      return {
        id: `tw-${id}`,
        name: `Twitter @${id}`,
        adapter: 'twitter',
        url: `https://x.com/${id}`,
        hours: 24,
        topics: [],
        enabled: true,
        category: follow.分类 || 'Twitter',
      }

    case 'Reddit':
      return {
        id: `reddit-${id.toLowerCase()}`,
        name: `r/${id}`,
        adapter: 'reddit',
        url: `https://www.reddit.com/r/${id}`,
        hours: 24,
        topics: [],
        enabled: true,
        category: follow.分类 || '社区',
      }

    case 'YouTube':
      return {
        id: `yt-${id.substring(0, 10).toLowerCase()}`,
        name,
        adapter: 'rss',
        url: `https://www.youtube.com/feeds/videos.xml?channel_id=${id}`,
        hours: 168,
        topics: [],
        enabled: true,
        category: follow.分类 || '科技媒体',
      }

    case 'arXiv':
      return {
        id: `arxiv-${id.replace('.', '-')}`,
        name: `arXiv ${id}`,
        adapter: 'rss',
        url: `https://rss.arxiv.org/rss/${id}`,
        hours: 24,
        topics: [],
        enabled: true,
        category: '学术',
      }

    case 'Telegram':
      return {
        id: `tg-${id}`,
        name,
        adapter: 'telegram',
        url: `https://t.me/${id}`,
        hours: 24,
        topics: [],
        enabled: true,
        category: follow.分类 || '社区',
      }

    case 'GitHub':
      return {
        id: `gh-trending${id ? `-${id}` : ''}`,
        name: id ? `GitHub Trending (${id})` : 'GitHub Trending',
        adapter: 'github-trending',
        url: id ? `https://github.com/trending/${id}` : 'https://github.com/trending',
        hours: 24,
        topics: [],
        enabled: true,
        category: '开发者',
      }

    case 'Medium':
      return {
        id: `medium-${id}`,
        name: `Medium: ${name}`,
        adapter: 'opencli',
        url: '',
        hours: 24,
        topics: [],
        enabled: true,
        category: follow.分类 || '科技媒体',
      }

    case 'Substack':
      return {
        id: `substack-${id}`,
        name: `Substack: ${name}`,
        adapter: 'opencli',
        url: '',
        hours: 168,
        topics: [],
        enabled: true,
        category: follow.分类 || '科技媒体',
      }

    case 'HuggingFace':
      return {
        id: `hf-${id}`,
        name: `HuggingFace ${name}`,
        adapter: 'rss',
        url: `https://huggingface.co/api/${id}`,
        hours: 24,
        topics: [],
        enabled: true,
        category: '学术',
      }

    default:
      log.warn(`Unknown platform: ${platform}, skipping ${id}`)
      return null
  }
}

// ─── Feishu sync via lark-cli ────────────────────────────────────────

async function fetchBitableRecords<T>(tableId: string): Promise<T[]> {
  const appToken = process.env.FEISHU_BITABLE_APP_TOKEN
  if (!appToken) throw new Error('FEISHU_BITABLE_APP_TOKEN not set')

  try {
    const output = runCommand(
      `lark-cli base record list --app-token ${appToken} --table-id ${tableId} -f json`,
      { timeout: 30_000 }
    )
    const parsed = JSON.parse(output)
    return (parsed.items || parsed.records || parsed) as T[]
  } catch (err) {
    throw new Error(`Failed to fetch bitable records: ${err}`)
  }
}

function extractTwitterHandles(follows: BitableFollow[]): string[] {
  return follows
    .filter(f => f.平台 === 'Twitter' && f.启用)
    .map(f => f.标识)
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  log.step('Syncing source configuration...')

  const configDir = getConfigDir()
  const sourcesPath = join(configDir, 'sources.json')
  const twitterWatchlistPath = join(configDir, 'twitter-watchlist.txt')

  // Check if lark-cli is available and Feishu is configured
  const hasLarkCli = isCommandAvailable('lark-cli')
  const hasFeishuConfig = !!(
    process.env.FEISHU_BITABLE_APP_TOKEN &&
    process.env.FEISHU_BITABLE_SOURCES_TABLE
  )

  if (!hasLarkCli || !hasFeishuConfig) {
    if (!hasLarkCli) {
      log.warn('lark-cli not installed. Using GitHub backup config.')
    } else {
      log.warn('Feishu Bitable not configured. Using GitHub backup config.')
    }

    // Fallback: use existing config or copy from reado defaults
    if (!existsSync(sourcesPath)) {
      log.info('No local sources.json found. Copying reado defaults...')
      const readoDefaults = join(
        getProjectRoot(),
        '..', 'reado', 'config', 'default-sources.json'
      )
      if (existsSync(readoDefaults)) {
        const defaults = readJSON<{ sources: SourceConfig[] }>(readoDefaults)
        if (defaults) {
          writeJSON(sourcesPath, defaults)
          log.success(`Copied ${defaults.sources.length} sources from reado defaults`)
        }
      } else {
        log.error('No default sources found. Create config/sources.json manually.')
        process.exit(1)
      }
    } else {
      log.info(`Using existing ${sourcesPath}`)
    }

    return
  }

  // ─── Feishu sync path ─────────────────────────────

  log.info('Fetching sources from Feishu Bitable...')

  try {
    // 1. Fetch URL-based sources (表 A)
    const sourcesTableId = process.env.FEISHU_BITABLE_SOURCES_TABLE!
    const rawSources = await fetchBitableRecords<BitableSource>(sourcesTableId)

    const sources: SourceConfig[] = rawSources
      .filter(s => s.启用)
      .map(s => ({
        id: s.源ID,
        name: s.名称,
        adapter: s.适配器,
        url: s.URL || '',
        hours: s.时间窗口 || 24,
        topics: s.关键词 ? s.关键词.split(',').map(k => k.trim()) : [],
        enabled: true,
        category: s.分类 || '',
      }))

    log.success(`Fetched ${sources.length} URL sources from Feishu`)

    // 2. Fetch follow targets (表 B)
    const followsTableId = process.env.FEISHU_BITABLE_FOLLOWS_TABLE
    let followSources: SourceConfig[] = []
    let twitterHandles: string[] = []

    if (followsTableId) {
      const rawFollows = await fetchBitableRecords<BitableFollow>(followsTableId)

      followSources = rawFollows
        .map(followToSource)
        .filter((s): s is SourceConfig => s !== null)

      twitterHandles = extractTwitterHandles(rawFollows)
      log.success(`Fetched ${followSources.length} follow sources, ${twitterHandles.length} Twitter handles`)
    }

    // 3. Merge and write
    const allSources = [...sources, ...followSources]
    writeJSON(sourcesPath, { sources: allSources })
    log.success(`Written ${allSources.length} sources to ${sourcesPath}`)

    // 4. Write Twitter watchlist
    if (twitterHandles.length > 0) {
      writeText(twitterWatchlistPath, twitterHandles.join('\n') + '\n')
      log.success(`Written ${twitterHandles.length} Twitter handles to ${twitterWatchlistPath}`)
    }

  } catch (err) {
    log.error(`Feishu sync failed: ${err}`)
    log.warn('Falling back to GitHub backup config...')

    if (!existsSync(sourcesPath)) {
      log.error('No backup config found either. Cannot proceed.')
      process.exit(1)
    }
  }
}

main().catch(err => {
  log.error(`sync-sources failed: ${err}`)
  process.exit(1)
})
