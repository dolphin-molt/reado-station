#!/usr/bin/env tsx
/**
 * summarize.ts
 *
 * 使用 Claude API 将采集的原始数据生成结构化 AI 日报。
 *
 * 流程：
 * 1. 读取 raw.json
 * 2. 按分类拆分数据
 * 3. 分别调用 Claude 生成各板块摘要
 * 4. 组装最终日报
 * 5. 输出 digest.md + 终端打印
 *
 * 使用 Claude Haiku 模型（成本低、速度快、质量足够）
 */
import 'dotenv/config'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import dayjs from 'dayjs'
import Anthropic from '@anthropic-ai/sdk'
import {
  readJSON,
  readText,
  writeText,
  getDataDir,
  getPromptsDir,
  categorizeItems,
  log,
  type CollectedData,
  type InfoItem,
} from './lib/utils.js'

// ─── Config ──────────────────────────────────────────────────────────

const MODEL = 'claude-haiku-4-20250414'
const MAX_TOKENS = 8192
const MAX_ITEMS_PER_SECTION = 50 // Avoid context overflow

// ─── Claude Client ───────────────────────────────────────────────────

function createClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    log.error('ANTHROPIC_API_KEY not set. Add it to .env or environment.')
    process.exit(1)
  }
  return new Anthropic({ apiKey })
}

// ─── Prompt Helpers ──────────────────────────────────────────────────

function formatItemsForPrompt(items: InfoItem[], limit: number = MAX_ITEMS_PER_SECTION): string {
  return items
    .slice(0, limit)
    .map((item, i) => {
      const parts = [
        `[${i + 1}] ${item.title}`,
        `    来源: ${item.sourceName} (${item.source})`,
        `    链接: ${item.url}`,
        item.publishedAt ? `    时间: ${item.publishedAt}` : '',
        item.summary ? `    摘要: ${item.summary}` : '',
      ].filter(Boolean)
      return parts.join('\n')
    })
    .join('\n\n')
}

// ─── Section Summarizers ─────────────────────────────────────────────

async function summarizeSection(
  client: Anthropic,
  systemPrompt: string,
  items: InfoItem[],
  sectionName: string,
): Promise<string> {
  if (items.length === 0) {
    log.info(`[${sectionName}] No items, skipping`)
    return ''
  }

  log.info(`[${sectionName}] Summarizing ${items.length} items...`)

  const formattedItems = formatItemsForPrompt(items)

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `以下是采集到的 ${sectionName} 数据（共 ${items.length} 条）。请按照 system prompt 中的格式要求生成摘要。\n\n${formattedItems}`,
        },
      ],
    })

    const text = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('')

    log.success(`[${sectionName}] Done (${response.usage.input_tokens}+${response.usage.output_tokens} tokens)`)
    return text
  } catch (err) {
    log.error(`[${sectionName}] Claude API error: ${err}`)
    return `> ⚠️ ${sectionName} 摘要生成失败\n`
  }
}

// ─── Assemble Final Report ───────────────────────────────────────────

function assembleReport(options: {
  date: string
  fetchedAt: string
  stats: CollectedData['stats']
  newsSummary: string
  twitterSummary: string
  opensourceSummary: string
  communitySummary: string
}): string {
  const {
    date, fetchedAt, stats,
    newsSummary, twitterSummary, opensourceSummary, communitySummary,
  } = options

  const time = dayjs(fetchedAt).format('HH:mm')
  const sections: string[] = []

  // Header
  sections.push(`# AI 日报 · ${date}\n`)
  sections.push(`> 采集时间 ${time} | 信息源: ${stats.totalSources} | 条目: ${stats.totalItems}\n`)

  // Sections (skip empty)
  if (newsSummary.trim()) {
    sections.push(newsSummary)
  }

  if (twitterSummary.trim()) {
    // Only add if not marked as failed
    sections.push(twitterSummary)
  }

  if (opensourceSummary.trim()) {
    sections.push(opensourceSummary)
  }

  if (communitySummary.trim()) {
    sections.push(communitySummary)
  }

  // Stats footer
  sections.push(`---\n`)
  sections.push(`## 采集统计\n`)
  sections.push(`| 指标 | 数值 |`)
  sections.push(`|------|------|`)
  sections.push(`| 信息源总数 | ${stats.totalSources} |`)
  sections.push(`| 成功采集 | ${stats.successSources} |`)
  sections.push(`| 条目总数 | ${stats.totalItems} |`)
  sections.push(`| 去重移除 | ${stats.deduplicatedItems} |`)

  return sections.join('\n\n')
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now()
  log.step('Starting AI summarization...')

  // Load raw data
  const dataDir = getDataDir()
  const rawPath = join(dataDir, 'raw.json')

  if (!existsSync(rawPath)) {
    log.error(`raw.json not found at ${rawPath}. Run collect.ts first.`)
    process.exit(1)
  }

  const rawData = readJSON<CollectedData>(rawPath)
  if (!rawData || !rawData.items?.length) {
    log.error('raw.json is empty or malformed.')
    process.exit(1)
  }

  log.info(`Loaded ${rawData.items.length} items from raw.json`)

  // Load prompts
  const promptsDir = getPromptsDir()
  const newsPrompt = readText(join(promptsDir, 'summarize-news.md'))
  const tweetsPrompt = readText(join(promptsDir, 'summarize-tweets.md'))
  const opensourcePrompt = readText(join(promptsDir, 'summarize-opensource.md'))
  const digestPrompt = readText(join(promptsDir, 'digest-intro.md'))

  // Categorize items
  const { news, twitter, opensource, community } = categorizeItems(rawData.items)
  log.info(`Categories: news=${news.length}, twitter=${twitter.length}, opensource=${opensource.length}, community=${community.length}`)

  // Create Claude client
  const client = createClient()

  // Generate summaries in parallel (news + community share prompt, but different data)
  const newsAndCompanyPrompt = `${digestPrompt}\n\n---\n\n${newsPrompt}\n\n你的任务：从以下数据中选出最重要的 3-5 个事件作为"重大新闻"，其余分类到"公司动态"。输出两个板块：\n\n## 重大新闻\n...\n\n## 公司动态\n...`

  const [newsSummary, twitterSummary, opensourceSummary, communitySummary] = await Promise.all([
    summarizeSection(client, newsAndCompanyPrompt, news, '新闻/公司动态'),
    twitter.length > 0
      ? summarizeSection(client, tweetsPrompt, twitter, 'Twitter/X 精选')
      : Promise.resolve('## Twitter/X 精选\n\n> Twitter 数据未采集（opencli 未连接）'),
    summarizeSection(client, opensourcePrompt, opensource, '论文与开源'),
    summarizeSection(client, `${digestPrompt}\n\n你的任务：整理社区热点讨论。输出板块：\n\n## 社区热点\n...`, community, '社区热点'),
  ])

  // Assemble final report
  const date = dayjs().format('YYYY-MM-DD')
  const report = assembleReport({
    date,
    fetchedAt: rawData.fetchedAt,
    stats: rawData.stats,
    newsSummary,
    twitterSummary,
    opensourceSummary,
    communitySummary,
  })

  // Write digest.md
  const digestPath = join(dataDir, 'digest.md')
  writeText(digestPath, report)

  // Also write to ~/ai-daily/ for backward compatibility
  const homeDigestDir = join(process.env.HOME || '~', 'ai-daily')
  try {
    const { mkdirSync } = await import('node:fs')
    mkdirSync(homeDigestDir, { recursive: true })
    writeText(join(homeDigestDir, `${date}.md`), report)
  } catch {
    // Non-critical
  }

  // Print to terminal
  console.log('\n' + '='.repeat(60))
  console.log(report)
  console.log('='.repeat(60) + '\n')

  const duration = ((Date.now() - startTime) / 1000).toFixed(1)
  log.step('Summarization complete!')
  log.data('Output', digestPath)
  log.data('Duration', `${duration}s`)
}

main().catch(err => {
  log.error(`summarize.ts crashed: ${err}`)
  process.exit(1)
})
