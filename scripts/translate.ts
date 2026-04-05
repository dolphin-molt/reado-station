/**
 * translate.ts
 *
 * 批量翻译 items.json 中的英文标题和摘要为中文。
 * 使用 SiliconFlow API (Qwen3-8B)，成本极低。
 *
 * Usage:  npx tsx scripts/translate.ts
 * Env:    SILICONFLOW_API_KEY (or falls back to hardcoded key)
 */

import 'dotenv/config'
import { readJSON, writeJSON, log, getProjectRoot } from './lib/utils.js'
import { join } from 'node:path'
import pLimit from 'p-limit'

// ─── Config ─────────────────────────────────────────────────────────

const API_URL = 'https://api.siliconflow.cn/v1/chat/completions'
const MODEL = process.env.TRANSLATE_MODEL || 'Qwen/Qwen3-8B'
const API_KEY = process.env.SILICONFLOW_API_KEY || ''
const CONCURRENCY = 3
const BATCH_SIZE = 5  // 每次翻译多条，减少 API 调用次数
const TIMEOUT = 30_000

// ─── Paths ──────────────────────────────────────────────────────────

const root = getProjectRoot()
const ITEMS_JSON = join(root, 'site', 'src', 'data', 'items.json')

// ─── Types ──────────────────────────────────────────────────────────

interface SiteItem {
  id: string
  title: string
  summary: string
  titleZh?: string
  summaryZh?: string
  [key: string]: any
}

// ─── Helpers ────────────────────────────────────────────────────────

function isLikelyChinese(text: string): boolean {
  if (!text) return true
  const chineseChars = text.match(/[\u4e00-\u9fff]/g)
  return (chineseChars?.length || 0) / text.length > 0.15
}

async function callLLM(messages: { role: string; content: string }[]): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.1,
        max_tokens: 4096,
        // Disable Qwen3 thinking/reasoning mode for faster translation
        enable_thinking: false,
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`API ${res.status}: ${body}`)
    }

    const data = await res.json() as any
    return data.choices?.[0]?.message?.content || ''
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 批量翻译一组 items 的 title + summary
 */
async function translateBatch(items: SiteItem[]): Promise<Map<string, { titleZh: string; summaryZh: string }>> {
  const results = new Map<string, { titleZh: string; summaryZh: string }>()

  // 构建翻译 prompt
  const entries = items.map((item, i) => {
    return `[${i}]\nTitle: ${item.title}\nSummary: ${item.summary || '(empty)'}`
  }).join('\n\n')

  const systemPrompt = `You are a professional translator. Translate the following English news titles and summaries into natural, fluent Chinese.

Rules:
- Keep proper nouns (company names, product names, person names) in their original form
- Keep technical terms commonly used in English as-is (e.g. API, GPU, LLM, token)
- Be concise and natural, like a Chinese tech news editor
- If the text is already in Chinese, return it as-is
- Output format: for each [N], output exactly:
[N]
标题: <translated title>
摘要: <translated summary>

Do NOT add any extra text or explanation.`

  const reply = await callLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: entries },
  ])

  // 解析返回结果 — 按 标题/摘要 对来分割，顺序匹配
  const titleMatches = [...reply.matchAll(/标题[:：]\s*(.+?)(?:\n|$)/g)]
  const summaryMatches = [...reply.matchAll(/摘要[:：]\s*(.+?)(?:\n|$)/g)]

  for (let idx = 0; idx < items.length && idx < titleMatches.length; idx++) {
    const titleZh = titleMatches[idx]?.[1]?.trim()
    const summaryZh = summaryMatches[idx]?.[1]?.trim()
      ?.replace(/\(empty\)/i, '')
      ?.replace(/（空）/g, '') || ''

    if (titleZh) {
      results.set(items[idx].id, { titleZh, summaryZh })
    }
  }

  return results
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  if (!API_KEY) {
    log.error('Missing SILICONFLOW_API_KEY environment variable')
    log.info('Set it with: export SILICONFLOW_API_KEY=sk-...')
    process.exit(1)
  }

  log.step(`Translate items (model: ${MODEL})`)

  const items = readJSON<SiteItem[]>(ITEMS_JSON)
  if (!items?.length) {
    log.error('No items found')
    process.exit(1)
  }

  // 筛选需要翻译的条目：英文内容 + 还没翻译过的
  const needTranslation = items.filter(item => {
    if (item.titleZh) return false  // 已翻译
    if (isLikelyChinese(item.title)) return false  // 本身就是中文
    return true
  })

  log.info(`Total: ${items.length}, Need translation: ${needTranslation.length}, Already done: ${items.length - needTranslation.length}`)

  if (needTranslation.length === 0) {
    log.success('Nothing to translate')
    return
  }

  // 分批翻译
  const batches: SiteItem[][] = []
  for (let i = 0; i < needTranslation.length; i += BATCH_SIZE) {
    batches.push(needTranslation.slice(i, i + BATCH_SIZE))
  }

  const limit = pLimit(CONCURRENCY)
  let successCount = 0
  let failCount = 0

  const tasks = batches.map((batch, batchIdx) =>
    limit(async () => {
      try {
        const results = await translateBatch(batch)
        for (const item of batch) {
          const translation = results.get(item.id)
          if (translation) {
            item.titleZh = translation.titleZh
            item.summaryZh = translation.summaryZh
            successCount++
          } else {
            failCount++
          }
        }
        log.success(`  Batch ${batchIdx + 1}/${batches.length}: ${results.size}/${batch.length} translated`)
      } catch (err: any) {
        failCount += batch.length
        log.warn(`  Batch ${batchIdx + 1}/${batches.length} failed: ${err.message}`)
      }
    })
  )

  await Promise.all(tasks)

  // 写回
  writeJSON(ITEMS_JSON, items)

  log.step('Done')
  log.info(`Translated: ${successCount}, Failed: ${failCount}`)
}

main().catch(err => {
  log.error(err.message ?? err)
  process.exit(1)
})
