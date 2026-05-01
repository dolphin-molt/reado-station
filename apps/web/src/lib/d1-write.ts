import { parseDigestMarkdown, type DigestData, type SiteItem } from '../../../../packages/shared/src'

interface CollectionStats {
  totalSources?: number
  successSources?: number
  failedSources?: number
  totalItems?: number
  deduplicatedItems?: number
  successSourceIds?: string[]
  failedSourceIds?: string[]
}

export interface IngestResult {
  date: string
  batch: string
  itemCount: number
  mode: string
}

export interface DigestWriteResult {
  date: string
  batch: string
  headline: string
  clusterCount: number
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []
}

function stableJson(value: unknown): string {
  return JSON.stringify(value ?? null)
}

function stableItemId(item: Record<string, unknown>, date: string, batch: string, index: number): string {
  const source = asString(item.source, 'unknown')
  const contentKey = asString(item.url) || asString(item.title) || String(index)
  const key = [source, contentKey].join('|')
  let hash = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return `${date}-${batch}-${hash.toString(36)}`
}

function sanitizeText(text: string, maxLength: number): string {
  return text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

function categorizeSource(source: string): string {
  const normalized = source.toLowerCase()
  if (normalized.includes('twitter') || normalized.includes('nitter') || normalized.startsWith('tw-')) return 'twitter'
  if (normalized.includes('github') || normalized.includes('gh-trending')) return 'opensource'
  if (normalized.includes('arxiv') || normalized.includes('huggingface') || normalized.includes('hf-')) return 'academic'
  if (normalized.includes('hackernews') || normalized.startsWith('hn-') || normalized === 'hn') return 'community'
  if (normalized.includes('reddit') || normalized.includes('v2ex') || normalized.includes('lobsters') || normalized.includes('devto')) return 'community'
  if (normalized.includes('36kr') || normalized.includes('huxiu') || normalized.includes('tmtpost') || normalized.includes('leiphone') || normalized.includes('qbitai')) return 'china-media'
  if (normalized.includes('openai') || normalized.includes('anthropic') || normalized.includes('deepmind') || normalized.includes('meta-ai')) return 'ai-company'
  return 'tech-media'
}

function normalizeSiteItem(value: unknown, date: string, batch: string, index: number): SiteItem | null {
  const item = asRecord(value)
  const title = sanitizeText(asString(item.title), 200)
  const url = asString(item.url)
  const source = asString(item.source, 'unknown')
  const category = asString(item.category, categorizeSource(source))

  if (!title || !url) return null

  return {
    id: stableItemId(item, date, batch, index),
    title,
    titleZh: asOptionalString(item.titleZh) ?? undefined,
    url,
    summary: sanitizeText(asString(item.summary), 400),
    summaryZh: asOptionalString(item.summaryZh) ?? undefined,
    publishedAt: asString(item.publishedAt),
    source,
    sourceName: asString(item.sourceName, source),
    category,
    imageUrl: asString(item.imageUrl, `/placeholders/${category}.svg`),
    date,
    batch,
  }
}

function normalizeStats(value: unknown): CollectionStats {
  const stats = asRecord(value)
  return {
    totalSources: asNumber(stats.totalSources) ?? undefined,
    successSources: asNumber(stats.successSources) ?? undefined,
    failedSources: asNumber(stats.failedSources) ?? undefined,
    totalItems: asNumber(stats.totalItems) ?? undefined,
    deduplicatedItems: asNumber(stats.deduplicatedItems) ?? undefined,
    successSourceIds: asStringArray(stats.successSourceIds),
    failedSourceIds: asStringArray(stats.failedSourceIds),
  }
}

export async function upsertIngestPayload(db: D1Database, payload: unknown): Promise<IngestResult> {
  const body = asRecord(payload)
  const date = asString(body.date)
  const batch = asString(body.batch)
  const mode = asString(body.mode, 'api')
  const fetchedAt = asOptionalString(body.fetchedAt)
  const updatedAt = asOptionalString(body.updatedAt) ?? fetchedAt ?? new Date().toISOString()
  const rawItems = Array.isArray(body.items) ? body.items : []
  const items = rawItems
    .map((item, index) => normalizeSiteItem(item, date, batch, index))
    .filter((item): item is SiteItem => item !== null)
  const stats = normalizeStats(body.stats)

  if (!date || !batch) {
    throw new Error('date and batch are required')
  }

  const sourceIdsToReplace = [
    ...new Set([
      ...items.map((item) => item.source),
      ...(stats.successSourceIds ?? []),
      ...(stats.failedSourceIds ?? []),
    ].filter(Boolean)),
  ]

  const statements = sourceIdsToReplace.length > 0
    ? [
        db.prepare(
          `DELETE FROM items WHERE date = ? AND batch = ? AND hidden_at IS NULL AND source IN (${sourceIdsToReplace.map(() => '?').join(', ')})`,
        ).bind(date, batch, ...sourceIdsToReplace),
      ]
    : []

  statements.push(...items.map((item) =>
    db.prepare(
      `
        INSERT INTO items (
          id, title, title_zh, url, summary, summary_zh, published_at,
          source, source_name, category, image_url, date, batch, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          title_zh = excluded.title_zh,
          url = excluded.url,
          summary = excluded.summary,
          summary_zh = excluded.summary_zh,
          published_at = excluded.published_at,
          source = excluded.source,
          source_name = excluded.source_name,
          category = excluded.category,
          image_url = excluded.image_url,
          date = excluded.date,
          batch = excluded.batch,
          updated_at = excluded.updated_at
      `,
    ).bind(
      item.id,
      item.title,
      item.titleZh ?? null,
      item.url,
      item.summary,
      item.summaryZh ?? null,
      item.publishedAt,
      item.source,
      item.sourceName,
      item.category,
      item.imageUrl,
      item.date,
      item.batch,
      updatedAt,
    ),
  ))

  statements.push(
    db.prepare(
      `
        INSERT OR REPLACE INTO collection_runs (
          date, batch, mode, fetched_at, total_sources, success_sources,
          failed_sources, total_items, deduplicated, failed_source_ids,
          success_source_ids
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    ).bind(
      date,
      batch,
      mode,
      fetchedAt,
      stats.totalSources ?? null,
      stats.successSources ?? null,
      stats.failedSources ?? null,
      stats.totalItems ?? items.length,
      stats.deduplicatedItems ?? null,
      stableJson(stats.failedSourceIds ?? []),
      stableJson(stats.successSourceIds ?? []),
    ),
  )

  await db.batch(statements)

  return {
    date,
    batch,
    mode,
    itemCount: items.length,
  }
}

function normalizeDigestPayload(payload: unknown): {
  date: string
  batch: string
  digest: DigestData
  markdown: string | null
  headlineZh: string | null
  observationTextZh: string | null
} {
  const body = asRecord(payload)
  const nestedDigest = asRecord(body.digest)
  const markdown = asOptionalString(body.markdown) ?? asOptionalString(body.rawMarkdown)
  const date = asString(body.date, asString(nestedDigest.date))
  const batch = asString(body.batch, 'latest')
  const parsed = markdown ? parseDigestMarkdown(markdown, date) : null
  const digest: DigestData = {
    date,
    headline: asString(body.headline, asString(nestedDigest.headline, parsed?.headline ?? '')),
    observationText: asString(body.observationText, asString(nestedDigest.observationText, parsed?.observationText ?? '')),
    observations: Array.isArray(nestedDigest.observations) ? nestedDigest.observations as DigestData['observations'] : parsed?.observations ?? [],
    clusters: Array.isArray(nestedDigest.clusters) ? nestedDigest.clusters as DigestData['clusters'] : parsed?.clusters ?? [],
  }

  if (!digest.date) throw new Error('date is required')

  return {
    date: digest.date,
    batch,
    digest,
    markdown,
    headlineZh: asOptionalString(body.headlineZh),
    observationTextZh: asOptionalString(body.observationTextZh),
  }
}

export async function upsertDigestPayload(db: D1Database, payload: unknown): Promise<DigestWriteResult> {
  const normalized = normalizeDigestPayload(payload)
  const updatedAt = new Date().toISOString()

  await db.prepare(
    `
      INSERT INTO digests (
        date, batch, headline, headline_zh, observation_text, observation_text_zh,
        observations, clusters, raw_markdown, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(date, batch) DO UPDATE SET
        headline = CASE WHEN excluded.headline IS NOT NULL AND excluded.headline != '' THEN excluded.headline ELSE digests.headline END,
        headline_zh = COALESCE(excluded.headline_zh, digests.headline_zh),
        observation_text = CASE WHEN excluded.observation_text IS NOT NULL AND excluded.observation_text != '' THEN excluded.observation_text ELSE digests.observation_text END,
        observation_text_zh = COALESCE(excluded.observation_text_zh, digests.observation_text_zh),
        observations = CASE WHEN excluded.observations IS NOT NULL AND excluded.observations != '[]' THEN excluded.observations ELSE digests.observations END,
        clusters = CASE WHEN excluded.clusters IS NOT NULL AND excluded.clusters != '[]' THEN excluded.clusters ELSE digests.clusters END,
        raw_markdown = COALESCE(excluded.raw_markdown, digests.raw_markdown),
        updated_at = excluded.updated_at
    `,
  ).bind(
    normalized.date,
    normalized.batch,
    normalized.digest.headline,
    normalized.headlineZh,
    normalized.digest.observationText,
    normalized.observationTextZh,
    stableJson(normalized.digest.observations),
    stableJson(normalized.digest.clusters),
    normalized.markdown,
    updatedAt,
  ).run()

  return {
    date: normalized.date,
    batch: normalized.batch,
    headline: normalized.digest.headline,
    clusterCount: normalized.digest.clusters.length,
  }
}

export async function readOpsState(db: D1Database, key?: string | null): Promise<Record<string, unknown>> {
  const statement = key
    ? db.prepare('SELECT key, value FROM ops_state WHERE key = ?').bind(key)
    : db.prepare('SELECT key, value FROM ops_state ORDER BY key ASC')
  const { results = [] } = await statement.all<{ key: string; value: string }>()

  const state: Record<string, unknown> = {}
  for (const row of results) {
    try {
      state[row.key] = JSON.parse(row.value) as unknown
    } catch {
      state[row.key] = row.value
    }
  }

  return state
}

export async function upsertOpsState(db: D1Database, payload: unknown): Promise<{ keys: string[] }> {
  const body = asRecord(payload)
  const entries: Array<[string, unknown]> = body.state && typeof body.state === 'object' && !Array.isArray(body.state)
    ? Object.entries(body.state as Record<string, unknown>)
    : [[asString(body.key), body.value]]
  const updatedAt = new Date().toISOString()
  const statements = entries
    .filter(([key]) => key.length > 0)
    .map(([key, value]) =>
      db.prepare('INSERT OR REPLACE INTO ops_state (key, value, updated_at) VALUES (?, ?, ?)')
        .bind(key, stableJson(value), updatedAt),
    )

  if (statements.length === 0) throw new Error('key/value or state object is required')
  await db.batch(statements)

  return { keys: entries.map(([key]) => key).filter(Boolean) }
}
