#!/usr/bin/env tsx
/**
 * summarize.ts  [v2.0 预留 — 当前可选]
 *
 * 使用外部 LLM API 将采集的原始数据生成结构化 AI 日报。
 * 适用于无人值守的自动化场景（GitHub Actions 定时任务）。
 *
 * v1.0 中日报由执行 Agent 自身生成（见 .claude/skills/ai-daily/SKILL.md），
 * 不需要此脚本。此脚本仅在需要全自动无人值守时使用。
 *
 * 支持的 LLM 后端（通过 LLM_PROVIDER 环境变量切换）：
 * - anthropic: Claude Haiku
 * - siliconflow: SiliconFlow OpenAI-compatible chat completions
 *
 * 流程：
 * 1. 读取 raw.json
 * 2. 按分类拆分数据
 * 3. 分别调用 LLM 生成各板块摘要
 * 4. 组装最终日报
 * 5. 输出 digest.md + 终端打印
 */
import 'dotenv/config'
import { basename, join } from 'node:path'
import { existsSync } from 'node:fs'
import dayjs from 'dayjs'
import Anthropic from '@anthropic-ai/sdk'
import {
  digestMarkdownStatement,
  wrapTransaction,
} from './lib/d1-sql.js'
import {
  isD1ApiWriteRequired,
  postDigestToD1Api,
} from './lib/d1-api.js'
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

const PROVIDER = process.env.LLM_PROVIDER ?? (process.env.SILICONFLOW_API_KEY ? 'siliconflow' : 'anthropic')
const MODEL = process.env.LLM_MODEL ?? (PROVIDER === 'siliconflow' ? 'Qwen/Qwen3-32B' : 'claude-haiku-4-20250414')
const MAX_TOKENS = 8192
const MAX_ITEMS_PER_SECTION = 50 // Avoid context overflow

// ─── LLM Clients ─────────────────────────────────────────────────────

interface LlmCompletion {
  text: string
  inputTokens?: number
  outputTokens?: number
}

interface LlmClient {
  complete(system: string, content: string): Promise<LlmCompletion>
}

function createAnthropicClient(): LlmClient {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    log.error('ANTHROPIC_API_KEY not set. Add it to .env or environment, or set LLM_PROVIDER=siliconflow.')
    process.exit(1)
  }
  const client = new Anthropic({ apiKey })
  return {
    async complete(system, content) {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system,
        messages: [{ role: 'user', content }],
      })

      return {
        text: response.content
          .filter(block => block.type === 'text')
          .map(block => (block as any).text)
          .join(''),
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      }
    },
  }
}

function createSiliconFlowClient(): LlmClient {
  const apiKey = process.env.SILICONFLOW_API_KEY
  if (!apiKey) {
    log.error('SILICONFLOW_API_KEY not set. Add it to .env or environment, or set LLM_PROVIDER=anthropic.')
    process.exit(1)
  }
  const baseUrl = process.env.SILICONFLOW_API_BASE_URL ?? 'https://api.siliconflow.cn/v1'
  return {
    async complete(system, content) {
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          temperature: 0.2,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content },
          ],
        }),
      })

      const text = await response.text()
      if (!response.ok) throw new Error(`SiliconFlow API error ${response.status}: ${text.slice(0, 500)}`)

      const data = JSON.parse(text) as {
        choices?: Array<{ message?: { content?: string } }>
        usage?: { prompt_tokens?: number; completion_tokens?: number }
      }
      return {
        text: data.choices?.[0]?.message?.content ?? '',
        inputTokens: data.usage?.prompt_tokens,
        outputTokens: data.usage?.completion_tokens,
      }
    },
  }
}

function createClient(): LlmClient {
  if (PROVIDER === 'siliconflow') return createSiliconFlowClient()
  if (PROVIDER === 'anthropic') return createAnthropicClient()
  log.error(`Unsupported LLM_PROVIDER: ${PROVIDER}`)
  process.exit(1)
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
  client: LlmClient,
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
    const response = await client.complete(
      systemPrompt,
      `以下是采集到的 ${sectionName} 数据（共 ${items.length} 条）。请按照 system prompt 中的格式要求生成摘要。\n\n${formattedItems}`,
    )

    log.success(`[${sectionName}] Done (${response.inputTokens ?? '?'}+${response.outputTokens ?? '?'} tokens)`)
    return response.text
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

  const batch = basename(dataDir)
  const headline = report.match(/^#\s+(.+)$/m)?.[1]

  try {
    const shadowSqlPath = join(dataDir, 'd1-digest.sql')
    const shadowSql = wrapTransaction(
      'reado-station digest shadow write',
      [
        digestMarkdownStatement({
          date,
          batch,
          headline,
          markdown: report,
          updatedAt: new Date().toISOString(),
        }),
      ],
    )
    writeText(shadowSqlPath, shadowSql)
    log.data('D1 shadow SQL', shadowSqlPath)
  } catch (err: any) {
    log.warn(`D1 digest shadow SQL write skipped: ${err?.message ?? err}`)
  }

  try {
    const result = await postDigestToD1Api({
      date,
      batch,
      headline,
      markdown: report,
    })
    if (result.status === 'posted') {
      log.data('D1 API write', result.url ?? 'posted')
    } else if (isD1ApiWriteRequired()) {
      throw new Error(result.reason ?? 'D1 API write skipped')
    }
  } catch (err: any) {
    if (isD1ApiWriteRequired()) {
      log.error(`D1 digest API write failed: ${err?.message ?? err}`)
      process.exit(1)
    }
    log.warn(`D1 digest API write skipped: ${err?.message ?? err}`)
  }

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
