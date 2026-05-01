import type { DigestData, DigestStory, SiteItem } from '../../../../packages/shared/src'

import { upsertDigestPayload } from '@/lib/d1-write'
import type { XContentType } from '@/lib/x-content-preferences'

interface DigestItemRow {
  id: string
  title: string
  url: string
  summary: string | null
  publishedAt: string | null
  source: string
  sourceName: string
  category: string
  date: string
  batch: string
}

export interface DigestGenerationResult {
  status: 'generated' | 'skipped'
  reason?: string
  date?: string
  itemCount?: number
  headline?: string
  clusterCount?: number
}

export interface DigestGenerationInput {
  workspaceId?: string | null
  windowStart?: string | null
  windowEnd?: string | null
  scope?: 'daily' | 'hourly'
  allowedContentTypes?: XContentType[]
}

const X_CONTENT_TYPES = new Set<XContentType>([
  'original_post',
  'thread',
  'thread_part',
  'longform_post',
  'quote',
  'reply',
  'repost',
  'media_post',
])

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function normalizeDigestGenerationInput(value: unknown): DigestGenerationInput {
  const record = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
  const allowedContentTypes = Array.isArray(record.allowedContentTypes)
    ? [...new Set(record.allowedContentTypes.filter((entry): entry is XContentType => typeof entry === 'string' && X_CONTENT_TYPES.has(entry as XContentType)))]
    : undefined

  return {
    workspaceId: stringValue(record.workspaceId),
    scope: record.scope === 'hourly' ? 'hourly' : 'daily',
    windowStart: stringValue(record.windowStart),
    windowEnd: stringValue(record.windowEnd),
    allowedContentTypes,
  }
}

function rowToItem(row: DigestItemRow): SiteItem {
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    summary: row.summary ?? '',
    publishedAt: row.publishedAt ?? '',
    source: row.source,
    sourceName: row.sourceName,
    category: row.category,
    date: row.date,
    batch: row.batch,
    imageUrl: `/placeholders/${row.category}.svg`,
  }
}

function workspaceVisibleDigestSql(): string {
  return `
    EXISTS (
      SELECT 1
      FROM workspace_source_subscriptions wss
      WHERE wss.workspace_id = ?
        AND lower(wss.source_id) = lower(items.source)
    )
  `
}

function addDigestInputFilters(filters: string[], bindings: Array<string | number>, input: DigestGenerationInput): void {
  if (input.workspaceId) {
    filters.push(workspaceVisibleDigestSql())
    bindings.push(input.workspaceId)
  }
  if (input.windowStart) {
    filters.push('published_at >= ?')
    bindings.push(input.windowStart)
  }
  if (input.windowEnd) {
    filters.push('published_at <= ?')
    bindings.push(input.windowEnd)
  }
  if (input.allowedContentTypes?.length) {
    filters.push(`COALESCE(json_extract(metadata_json, '$.content_type'), 'original_post') IN (${input.allowedContentTypes.map(() => '?').join(', ')})`)
    bindings.push(...input.allowedContentTypes)
  }
}

async function loadLatestDate(db: D1Database, input: DigestGenerationInput): Promise<string | null> {
  const filters = ['hidden_at IS NULL']
  const bindings: Array<string | number> = []
  addDigestInputFilters(filters, bindings, input)
  const row = await db
    .prepare(
      `
        SELECT date
        FROM items
        WHERE ${filters.join(' AND ')}
        GROUP BY date
        ORDER BY date DESC
        LIMIT 1
      `,
    )
    .bind(...bindings)
    .first<{ date: string }>()

  return row?.date ?? null
}

async function loadItemsForDigest(db: D1Database, date: string, input: DigestGenerationInput, limit = 80): Promise<SiteItem[]> {
  const filters = ['date = ?', 'hidden_at IS NULL']
  const bindings: Array<string | number> = [date]
  addDigestInputFilters(filters, bindings, input)
  const { results = [] } = await db
    .prepare(
      `
        SELECT
          id,
          title,
          url,
          summary,
          published_at AS publishedAt,
          source,
          source_name AS sourceName,
          category,
          date,
          batch
        FROM items
        WHERE ${filters.join(' AND ')}
        ORDER BY published_at DESC, id ASC
        LIMIT ?
      `,
    )
    .bind(...bindings, limit)
    .all<DigestItemRow>()

  return results.map(rowToItem)
}

function formatItems(items: SiteItem[]): string {
  return items
    .map((item, index) => [
      `[${index + 1}] ${item.title}`,
      `来源: ${item.sourceName} (${item.category})`,
      `链接: ${item.url}`,
      item.publishedAt ? `时间: ${item.publishedAt}` : '',
      item.summary ? `摘要: ${item.summary}` : '',
    ].filter(Boolean).join('\n'))
    .join('\n\n')
}

function trimText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, maxLength) : ''
}

function normalizeStories(value: unknown): DigestStory[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, 8).map((entry) => {
    const story = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {}
    const rawSources = Array.isArray(story.sources) ? story.sources : []
    return {
      title: trimText(story.title, 160),
      summary: trimText(story.summary, 500),
      impact: trimText(story.impact, 240) || undefined,
      sources: rawSources.slice(0, 4).map((source) => {
        const sourceRecord = source && typeof source === 'object' ? source as Record<string, unknown> : {}
        return {
          name: trimText(sourceRecord.name, 80) || 'Source',
          url: trimText(sourceRecord.url, 500),
        }
      }).filter((source) => source.url),
    }
  }).filter((story) => story.title && story.summary && story.sources.length > 0)
}

function parseDigestJson(text: string, date: string): DigestData {
  const jsonText = text.match(/```json\s*([\s\S]*?)```/i)?.[1] ?? text
  const parsed = JSON.parse(jsonText) as {
    headline?: unknown
    observationText?: unknown
    clusters?: unknown
  }
  const rawClusters = Array.isArray(parsed.clusters) ? parsed.clusters : []
  const clusters = rawClusters.slice(0, 4).map((entry) => {
    const cluster = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {}
    return {
      name: trimText(cluster.name, 80) || '精选',
      stories: normalizeStories(cluster.stories),
    }
  }).filter((cluster) => cluster.stories.length > 0)

  if (clusters.length === 0) throw new Error('Digest response did not include any usable stories')

  return {
    date,
    headline: trimText(parsed.headline, 120) || `AI 日报 · ${date}`,
    observationText: trimText(parsed.observationText, 900),
    observations: [],
    clusters,
  }
}

async function callSiliconFlow(env: CloudflareEnv, prompt: string): Promise<string> {
  const apiKey = env.SILICONFLOW_API_KEY
  if (!apiKey) throw new Error('SILICONFLOW_API_KEY is not configured')

  const baseUrl = env.SILICONFLOW_API_BASE_URL ?? 'https://api.siliconflow.cn/v1'
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.LLM_MODEL ?? 'Qwen/Qwen3-32B',
      temperature: 0.2,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: '你是 reado 的 AI 资讯编辑。你只输出合法 JSON，不输出 Markdown。',
        },
        { role: 'user', content: prompt },
      ],
    }),
  })

  const text = await response.text()
  if (!response.ok) throw new Error(`SiliconFlow API error ${response.status}: ${text.slice(0, 500)}`)
  const data = JSON.parse(text) as { choices?: Array<{ message?: { content?: string } }> }
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('SiliconFlow response is empty')
  return content
}

async function generateDigestWithLlm(env: CloudflareEnv, date: string, items: SiteItem[]): Promise<DigestData> {
  const prompt = [
    `日期：${date}`,
    '请从下面资讯中生成首页使用的 AI 解读和精选资讯。',
    '要求：',
    '1. observationText 是一段中文总览，300-600 字，说明今天最重要的趋势和变化。',
    '2. clusters 需要 2-4 个主题，每个主题 1-3 条 story。',
    '3. story 必须引用给定资讯中的来源链接，不要编造链接。',
    '4. 只输出 JSON，格式：{"headline":"AI 日报 · YYYY-MM-DD","observationText":"...","clusters":[{"name":"重大新闻","stories":[{"title":"...","summary":"...","impact":"...","sources":[{"name":"...","url":"..."}]}]}]}',
    '',
    formatItems(items),
  ].join('\n')

  const provider = env.LLM_PROVIDER ?? 'siliconflow'
  if (provider !== 'siliconflow') {
    throw new Error(`Unsupported program digest provider: ${provider}`)
  }
  return parseDigestJson(await callSiliconFlow(env, prompt), date)
}

export async function generateLatestDigest(db: D1Database, env: CloudflareEnv, rawInput?: unknown): Promise<DigestGenerationResult> {
  const input = normalizeDigestGenerationInput(rawInput)
  const date = await loadLatestDate(db, input)
  if (!date) return { status: 'skipped', reason: 'no items' }

  const items = await loadItemsForDigest(db, date, input)
  if (items.length === 0) return { status: 'skipped', reason: 'no items', date }
  if (!env.SILICONFLOW_API_KEY) return { status: 'skipped', reason: 'SILICONFLOW_API_KEY is not configured', date, itemCount: items.length }

  const digest = await generateDigestWithLlm(env, date, items)

  const result = await upsertDigestPayload(db, {
    date,
    batch: input.scope === 'hourly' ? 'hourly' : 'latest',
    digest,
  })

  return {
    status: 'generated',
    date,
    itemCount: items.length,
    headline: result.headline,
    clusterCount: result.clusterCount,
  }
}
