import type { DigestData, InfoItem, SiteItem } from '../../packages/shared/src/index.ts'
import type { CollectedData } from './utils.js'
import { categorizeSite, sanitizeText } from './utils.js'

export type SqlValue = string | number | boolean | null | undefined

export interface SourceConfig {
  id: string
  name: string
  adapter: string
  url?: string
  hours?: number
  enabled?: boolean
  category?: string
  topics?: string[]
  fallbackAdapter?: string
  fallbackUrl?: string
  fallback_adapter?: string
  fallback_url?: string
  googleNewsQuery?: string
  command?: string[]
  strategy?: string
  searchable?: boolean
  searchCommand?: string[]
}

export interface CollectionRunRow {
  date: string
  batch: string
  mode: string
  fetchedAt: string | null
  totalSources: number | null
  successSources: number | null
  failedSources: number | null
  totalItems: number | null
  deduplicated: number | null
  failedSourceIds: string[]
  successSourceIds: string[]
}

export interface DigestMarkdownRow {
  date: string
  batch: string
  markdown: string
  headline?: string
  updatedAt?: string
}

export function sqlString(value: SqlValue): string {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL'
  if (typeof value === 'boolean') return value ? '1' : '0'
  return `'${value.replace(/'/g, "''")}'`
}

export function stableJson(value: unknown): string {
  return JSON.stringify(value ?? null)
}

export function stableItemId(item: InfoItem, date: string, batch: string, index: number): string {
  const key = [date, batch, item.source, item.url || item.title || String(index)].join('|')
  let hash = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return `${date}-${batch}-${hash.toString(36)}`
}

export function insertOrReplace(table: string, columns: string[], values: SqlValue[]): string {
  if (columns.length !== values.length) {
    throw new Error(`Column/value length mismatch for ${table}: ${columns.length} !== ${values.length}`)
  }
  return `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${values.map(sqlString).join(', ')});`
}

export function upsertOnConflict(
  table: string,
  columns: string[],
  values: SqlValue[],
  conflictColumns: string[],
  updateColumns: string[],
): string {
  if (columns.length !== values.length) {
    throw new Error(`Column/value length mismatch for ${table}: ${columns.length} !== ${values.length}`)
  }
  if (conflictColumns.length === 0 || updateColumns.length === 0) {
    throw new Error(`Conflict and update columns are required for ${table}`)
  }

  return [
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.map(sqlString).join(', ')})`,
    `ON CONFLICT(${conflictColumns.join(', ')}) DO UPDATE SET ${updateColumns.map((column) => `${column} = excluded.${column}`).join(', ')};`,
  ].join(' ')
}

export function wrapTransaction(label: string, statements: string[], generatedAt = new Date().toISOString()): string {
  return [
    `-- ${label}`,
    `-- Generated at ${generatedAt}`,
    'PRAGMA foreign_keys = OFF;',
    'BEGIN TRANSACTION;',
    ...statements,
    'COMMIT;',
    'PRAGMA foreign_keys = ON;',
    '',
  ].join('\n')
}

export function sourceStatement(source: SourceConfig, updatedAt = new Date().toISOString()): string {
  return insertOrReplace(
    'sources',
    [
      'id',
      'name',
      'adapter',
      'url',
      'hours',
      'enabled',
      'category',
      'topics',
      'fallback_adapter',
      'fallback_url',
      'google_news_query',
      'command',
      'strategy',
      'searchable',
      'search_command',
      'updated_at',
    ],
    [
      source.id,
      source.name,
      source.adapter,
      source.url,
      source.hours ?? 24,
      source.enabled !== false,
      source.category,
      stableJson(source.topics ?? []),
      source.fallbackAdapter ?? source.fallback_adapter,
      source.fallbackUrl ?? source.fallback_url,
      source.googleNewsQuery,
      stableJson(source.command ?? []),
      source.strategy,
      source.searchable === true,
      stableJson(source.searchCommand ?? []),
      updatedAt,
    ],
  )
}

export function siteItemStatement(item: SiteItem, updatedAt = new Date().toISOString()): string {
  return insertOrReplace(
    'items',
    [
      'id',
      'title',
      'title_zh',
      'url',
      'summary',
      'summary_zh',
      'published_at',
      'source',
      'source_name',
      'category',
      'image_url',
      'date',
      'batch',
      'updated_at',
    ],
    [
      item.id,
      item.title,
      item.titleZh,
      item.url,
      item.summary,
      item.summaryZh,
      item.publishedAt,
      item.source,
      item.sourceName,
      item.category,
      item.imageUrl,
      item.date,
      item.batch,
      updatedAt,
    ],
  )
}

export function digestStatement(digest: DigestData, batch = 'latest', updatedAt = new Date().toISOString()): string {
  return upsertOnConflict(
    'digests',
    [
      'date',
      'batch',
      'headline',
      'observation_text',
      'observations',
      'clusters',
      'updated_at',
    ],
    [
      digest.date,
      batch,
      digest.headline,
      digest.observationText,
      stableJson(digest.observations),
      stableJson(digest.clusters),
      updatedAt,
    ],
    ['date', 'batch'],
    ['headline', 'observation_text', 'observations', 'clusters', 'updated_at'],
  )
}

export function digestMarkdownStatement(row: DigestMarkdownRow): string {
  return [
    `INSERT INTO digests (date, batch, headline, raw_markdown, updated_at) VALUES (${[
      row.date,
      row.batch,
      row.headline,
      row.markdown,
      row.updatedAt ?? new Date().toISOString(),
    ].map(sqlString).join(', ')})`,
    'ON CONFLICT(date, batch) DO UPDATE SET',
    'headline = COALESCE(excluded.headline, digests.headline),',
    'raw_markdown = excluded.raw_markdown,',
    'updated_at = excluded.updated_at;',
  ].join(' ')
}

export function collectionRunStatement(run: CollectionRunRow): string {
  return insertOrReplace(
    'collection_runs',
    [
      'date',
      'batch',
      'mode',
      'fetched_at',
      'total_sources',
      'success_sources',
      'failed_sources',
      'total_items',
      'deduplicated',
      'failed_source_ids',
      'success_source_ids',
    ],
    [
      run.date,
      run.batch,
      run.mode,
      run.fetchedAt,
      run.totalSources,
      run.successSources,
      run.failedSources,
      run.totalItems,
      run.deduplicated,
      stableJson(run.failedSourceIds),
      stableJson(run.successSourceIds),
    ],
  )
}

export function opsStateStatements(opsState: Record<string, unknown> | null, updatedAt = new Date().toISOString()): string[] {
  if (!opsState) return []
  return Object.entries(opsState).map(([key, value]) =>
    insertOrReplace('ops_state', ['key', 'value', 'updated_at'], [key, stableJson(value), updatedAt]),
  )
}

export function rawItemToSiteItem(item: InfoItem, date: string, batch: string, index: number): SiteItem {
  const category = categorizeSite(item.source)
  return {
    ...item,
    id: stableItemId(item, date, batch, index),
    title: sanitizeText(item.title, 200),
    summary: sanitizeText(item.summary, 400),
    date,
    batch,
    category,
    imageUrl: `/placeholders/${category}.svg`,
  }
}

export function collectedDataStatements(data: CollectedData, options: {
  date: string
  batch: string
  mode: string
  updatedAt?: string
}): string[] {
  const updatedAt = options.updatedAt ?? data.fetchedAt ?? new Date().toISOString()
  const items = (data.items ?? [])
    .filter((item) => item.url)
    .map((item, index) => siteItemStatement(rawItemToSiteItem(item, options.date, options.batch, index), updatedAt))

  const run = collectionRunStatement({
    date: options.date,
    batch: options.batch,
    mode: options.mode,
    fetchedAt: data.fetchedAt ?? null,
    totalSources: data.stats?.totalSources ?? null,
    successSources: data.stats?.successSources ?? null,
    failedSources: data.stats?.failedSources ?? null,
    totalItems: data.stats?.totalItems ?? data.items?.length ?? null,
    deduplicated: data.stats?.deduplicatedItems ?? null,
    failedSourceIds: data.stats?.failedSourceIds ?? [],
    successSourceIds: data.stats?.successSourceIds ?? [],
  })

  return [...items, run]
}
