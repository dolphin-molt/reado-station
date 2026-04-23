import 'server-only'

import { createPaginationMeta, paginationOffset, type PaginationMeta } from '@/lib/pagination'

export interface AdminSource {
  id: string
  name: string
  adapter: string
  url: string
  hours: number
  enabled: boolean
  category: string
  topics: string[]
  fallbackAdapter: string
  fallbackUrl: string
  googleNewsQuery: string
  command: string[]
  strategy: string
  searchable: boolean
  searchCommand: string[]
  consecutiveFailures: number
  lastSuccess: string | null
  lastFailure: string | null
  itemCount: number
  updatedAt: string | null
}

export interface AdminItem {
  id: string
  title: string
  url: string
  summary: string
  publishedAt: string
  source: string
  sourceName: string
  category: string
  date: string
  batch: string
  hiddenAt: string | null
  hiddenReason: string | null
}

export interface AdminSourcesPageData {
  sources: AdminSource[]
  pagination: PaginationMeta
  totals: {
    all: number
    enabled: number
    disabled: number
  }
}

export interface AdminItemsPageData {
  items: AdminItem[]
  pagination: PaginationMeta
  totals: {
    all: number
    visible: number
    hidden: number
  }
}

export interface AdminOverviewData {
  sourceCount: number
  enabledSourceCount: number
  itemCount: number
  hiddenItemCount: number
  latestDate: string | null
}

export interface SourceInput {
  id: string
  name: string
  adapter: string
  url: string
  hours: number
  enabled: boolean
  category: string
  topics: string[]
  fallbackAdapter: string
  fallbackUrl: string
  googleNewsQuery: string
  command: string[]
  strategy: string
  searchable: boolean
  searchCommand: string[]
}

interface SourceRow {
  id: string
  name: string
  adapter: string
  url: string | null
  hours: number | null
  enabled: number
  category: string | null
  topics: string | null
  fallbackAdapter: string | null
  fallbackUrl: string | null
  googleNewsQuery: string | null
  command: string | null
  strategy: string | null
  searchable: number
  searchCommand: string | null
  consecutiveFailures: number | null
  lastSuccess: string | null
  lastFailure: string | null
  itemCount: number | null
  updatedAt: string | null
}

interface ItemRow {
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
  hiddenAt: string | null
  hiddenReason: string | null
}

interface CountRow {
  total: number
}

interface OverviewRow {
  sourceCount: number
  enabledSourceCount: number
  itemCount: number
  hiddenItemCount: number
  latestDate: string | null
}

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : []
  } catch {
    return []
  }
}

function jsonArray(value: string[]): string {
  return JSON.stringify(value)
}

function likePattern(value: string): string {
  return `%${value.replace(/[%_]/g, (match) => `\\${match}`)}%`
}

function rowToSource(row: SourceRow): AdminSource {
  return {
    id: row.id,
    name: row.name,
    adapter: row.adapter,
    url: row.url ?? '',
    hours: Number(row.hours ?? 24),
    enabled: Number(row.enabled) === 1,
    category: row.category ?? '',
    topics: parseJsonArray(row.topics),
    fallbackAdapter: row.fallbackAdapter ?? '',
    fallbackUrl: row.fallbackUrl ?? '',
    googleNewsQuery: row.googleNewsQuery ?? '',
    command: parseJsonArray(row.command),
    strategy: row.strategy ?? '',
    searchable: Number(row.searchable) === 1,
    searchCommand: parseJsonArray(row.searchCommand),
    consecutiveFailures: Number(row.consecutiveFailures ?? 0),
    lastSuccess: row.lastSuccess,
    lastFailure: row.lastFailure,
    itemCount: Number(row.itemCount ?? 0),
    updatedAt: row.updatedAt,
  }
}

function rowToItem(row: ItemRow): AdminItem {
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
    hiddenAt: row.hiddenAt,
    hiddenReason: row.hiddenReason,
  }
}

export async function loadAdminOverview(db: D1Database): Promise<AdminOverviewData> {
  const row = await db
    .prepare(
      `
        SELECT
          (SELECT COUNT(1) FROM sources) AS sourceCount,
          (SELECT COUNT(1) FROM sources WHERE enabled = 1) AS enabledSourceCount,
          (SELECT COUNT(1) FROM items) AS itemCount,
          (SELECT COUNT(1) FROM items WHERE hidden_at IS NOT NULL) AS hiddenItemCount,
          (SELECT MAX(date) FROM items WHERE hidden_at IS NULL) AS latestDate
      `,
    )
    .first<OverviewRow>()

  return {
    sourceCount: Number(row?.sourceCount ?? 0),
    enabledSourceCount: Number(row?.enabledSourceCount ?? 0),
    itemCount: Number(row?.itemCount ?? 0),
    hiddenItemCount: Number(row?.hiddenItemCount ?? 0),
    latestDate: row?.latestDate ?? null,
  }
}

export async function loadAdminSourcesPage(
  db: D1Database,
  options: { page: number; pageSize: number; q?: string; enabled?: string },
): Promise<AdminSourcesPageData> {
  const filters: string[] = []
  const bindings: Array<string | number> = []

  if (options.q) {
    filters.push("(id LIKE ? ESCAPE '\\' OR name LIKE ? ESCAPE '\\' OR adapter LIKE ? ESCAPE '\\' OR category LIKE ? ESCAPE '\\')")
    const pattern = likePattern(options.q)
    bindings.push(pattern, pattern, pattern, pattern)
  }

  if (options.enabled === 'enabled') {
    filters.push('enabled = 1')
  } else if (options.enabled === 'disabled') {
    filters.push('enabled = 0')
  }

  const where = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : ''
  const totalRow = await db.prepare(`SELECT COUNT(1) AS total FROM sources ${where}`).bind(...bindings).first<CountRow>()
  const pagination = createPaginationMeta(options.page, options.pageSize, Number(totalRow?.total ?? 0))

  const [{ results = [] }, totals] = await Promise.all([
    db
      .prepare(
        `
          SELECT
            s.id,
            s.name,
            s.adapter,
            s.url,
            s.hours,
            s.enabled,
            s.category,
            s.topics,
            s.fallback_adapter AS fallbackAdapter,
            s.fallback_url AS fallbackUrl,
            s.google_news_query AS googleNewsQuery,
            s.command,
            s.strategy,
            s.searchable,
            s.search_command AS searchCommand,
            s.consecutive_failures AS consecutiveFailures,
            s.last_success AS lastSuccess,
            s.last_failure AS lastFailure,
            s.updated_at AS updatedAt,
            (SELECT COUNT(1) FROM items i WHERE i.source = s.id) AS itemCount
          FROM sources s
          ${where}
          ORDER BY s.enabled DESC, s.category ASC, s.name ASC
          LIMIT ? OFFSET ?
        `,
      )
      .bind(...bindings, pagination.pageSize, paginationOffset(pagination))
      .all<SourceRow>(),
    db
      .prepare(
        `
          SELECT
            COUNT(1) AS allCount,
            SUM(CASE WHEN enabled = 1 THEN 1 ELSE 0 END) AS enabledCount,
            SUM(CASE WHEN enabled = 0 THEN 1 ELSE 0 END) AS disabledCount
          FROM sources
        `,
      )
      .first<{ allCount: number; enabledCount: number; disabledCount: number }>(),
  ])

  return {
    sources: results.map(rowToSource),
    pagination,
    totals: {
      all: Number(totals?.allCount ?? 0),
      enabled: Number(totals?.enabledCount ?? 0),
      disabled: Number(totals?.disabledCount ?? 0),
    },
  }
}

export async function getAdminSource(db: D1Database, id: string): Promise<AdminSource | null> {
  const row = await db
    .prepare(
      `
        SELECT
          s.id,
          s.name,
          s.adapter,
          s.url,
          s.hours,
          s.enabled,
          s.category,
          s.topics,
          s.fallback_adapter AS fallbackAdapter,
          s.fallback_url AS fallbackUrl,
          s.google_news_query AS googleNewsQuery,
          s.command,
          s.strategy,
          s.searchable,
          s.search_command AS searchCommand,
          s.consecutive_failures AS consecutiveFailures,
          s.last_success AS lastSuccess,
          s.last_failure AS lastFailure,
          s.updated_at AS updatedAt,
          (SELECT COUNT(1) FROM items i WHERE i.source = s.id) AS itemCount
        FROM sources s
        WHERE s.id = ?
        LIMIT 1
      `,
    )
    .bind(id)
    .first<SourceRow>()

  return row ? rowToSource(row) : null
}

export async function upsertAdminSource(db: D1Database, input: SourceInput): Promise<void> {
  await db
    .prepare(
      `
        INSERT INTO sources (
          id, name, adapter, url, hours, enabled, category, topics,
          fallback_adapter, fallback_url, google_news_query, command,
          strategy, searchable, search_command, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          adapter = excluded.adapter,
          url = excluded.url,
          hours = excluded.hours,
          enabled = excluded.enabled,
          category = excluded.category,
          topics = excluded.topics,
          fallback_adapter = excluded.fallback_adapter,
          fallback_url = excluded.fallback_url,
          google_news_query = excluded.google_news_query,
          command = excluded.command,
          strategy = excluded.strategy,
          searchable = excluded.searchable,
          search_command = excluded.search_command,
          updated_at = excluded.updated_at
      `,
    )
    .bind(
      input.id,
      input.name,
      input.adapter,
      input.url || null,
      input.hours,
      input.enabled ? 1 : 0,
      input.category || null,
      jsonArray(input.topics),
      input.fallbackAdapter || null,
      input.fallbackUrl || null,
      input.googleNewsQuery || null,
      jsonArray(input.command),
      input.strategy || null,
      input.searchable ? 1 : 0,
      jsonArray(input.searchCommand),
      new Date().toISOString(),
    )
    .run()
}

export async function setAdminSourceEnabled(db: D1Database, id: string, enabled: boolean): Promise<void> {
  await db
    .prepare('UPDATE sources SET enabled = ?, updated_at = ? WHERE id = ?')
    .bind(enabled ? 1 : 0, new Date().toISOString(), id)
    .run()
}

export async function loadAdminItemsPage(
  db: D1Database,
  options: { page: number; pageSize: number; q?: string; date?: string; category?: string; source?: string; visibility?: string },
): Promise<AdminItemsPageData> {
  const filters: string[] = []
  const bindings: Array<string | number> = []

  if (options.q) {
    filters.push("(title LIKE ? ESCAPE '\\' OR url LIKE ? ESCAPE '\\' OR source_name LIKE ? ESCAPE '\\')")
    const pattern = likePattern(options.q)
    bindings.push(pattern, pattern, pattern)
  }

  if (options.date) {
    filters.push('date = ?')
    bindings.push(options.date)
  }

  if (options.category) {
    filters.push('category = ?')
    bindings.push(options.category)
  }

  if (options.source) {
    filters.push('source = ?')
    bindings.push(options.source)
  }

  if (options.visibility === 'hidden') {
    filters.push('hidden_at IS NOT NULL')
  } else if (options.visibility !== 'all') {
    filters.push('hidden_at IS NULL')
  }

  const where = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : ''
  const totalRow = await db.prepare(`SELECT COUNT(1) AS total FROM items ${where}`).bind(...bindings).first<CountRow>()
  const pagination = createPaginationMeta(options.page, options.pageSize, Number(totalRow?.total ?? 0))

  const [{ results = [] }, totals] = await Promise.all([
    db
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
            batch,
            hidden_at AS hiddenAt,
            hidden_reason AS hiddenReason
          FROM items
          ${where}
          ORDER BY date DESC, published_at DESC, id ASC
          LIMIT ? OFFSET ?
        `,
      )
      .bind(...bindings, pagination.pageSize, paginationOffset(pagination))
      .all<ItemRow>(),
    db
      .prepare(
        `
          SELECT
            COUNT(1) AS allCount,
            SUM(CASE WHEN hidden_at IS NULL THEN 1 ELSE 0 END) AS visibleCount,
            SUM(CASE WHEN hidden_at IS NOT NULL THEN 1 ELSE 0 END) AS hiddenCount
          FROM items
        `,
      )
      .first<{ allCount: number; visibleCount: number; hiddenCount: number }>(),
  ])

  return {
    items: results.map(rowToItem),
    pagination,
    totals: {
      all: Number(totals?.allCount ?? 0),
      visible: Number(totals?.visibleCount ?? 0),
      hidden: Number(totals?.hiddenCount ?? 0),
    },
  }
}

export async function setAdminItemHidden(db: D1Database, id: string, hidden: boolean, reason: string): Promise<void> {
  const now = new Date().toISOString()

  if (hidden) {
    await db
      .prepare('UPDATE items SET hidden_at = ?, hidden_reason = ?, updated_at = ? WHERE id = ?')
      .bind(now, reason || null, now, id)
      .run()
    return
  }

  await db
    .prepare('UPDATE items SET hidden_at = NULL, hidden_reason = NULL, updated_at = ? WHERE id = ?')
    .bind(now, id)
    .run()
}
