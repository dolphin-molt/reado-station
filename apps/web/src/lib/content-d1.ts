import 'server-only'

import { parseDigestMarkdown, type DayMeta, type DigestCluster, type DigestData, type Observation, type SiteItem } from '../../../../packages/shared/src'

import { buildCategoryOptions, type CategoryOption } from '@/lib/categories'
import type { SiteContent } from '@/lib/content'
import { createPaginationMeta, paginationOffset, type PaginationMeta } from '@/lib/pagination'

interface D1DayRow {
  date: string
  batches: string | null
  itemCount: number
  hasDigest: number
}

interface D1ItemRow {
  id: string
  title: string
  titleZh: string | null
  url: string
  summary: string | null
  summaryZh: string | null
  publishedAt: string | null
  source: string
  sourceName: string
  category: string
  imageUrl: string | null
  date: string
  batch: string
}

interface D1DigestRow {
  date: string
  batch: string
  headline: string | null
  headlineZh: string | null
  observationText: string | null
  observationTextZh: string | null
  observations: string | null
  clusters: string | null
  rawMarkdown: string | null
}

interface D1LatestDateRow {
  date: string
}

interface D1HomeStatsRow {
  itemCount: number
  sourceCount: number
}

interface D1CategoryCountRow {
  category: string
  itemCount: number
}

interface D1TotalRow {
  total: number
}

export interface D1HomePageContent {
  date: string | null
  items: SiteItem[]
  pagination: PaginationMeta
  sourceCount: number
  totalItems: number
  categories: CategoryOption[]
}

export interface D1ArchivePageContent {
  days: DayMeta[]
  pagination: PaginationMeta
}

function parseJsonArray<T>(value: string | null | undefined): T[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

function sortBatches(batches: string[]): string[] {
  const order = new Map([
    ['morning', 0],
    ['evening', 1],
    ['latest', 2],
  ])
  return [...new Set(batches)].sort((a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99) || a.localeCompare(b))
}

function rowToDay(row: D1DayRow): DayMeta {
  const [year, month, day] = row.date.split('-')
  const batches = sortBatches((row.batches ?? '').split(',').map((batch) => batch.trim()).filter(Boolean))

  return {
    date: row.date,
    batches,
    itemCount: Number(row.itemCount ?? 0),
    digestPath: row.hasDigest ? `${year}/${month}/${day}/latest/digest.md` : null,
  }
}

function rowToItem(row: D1ItemRow): SiteItem {
  const item: SiteItem = {
    id: row.id,
    title: row.title,
    url: row.url,
    summary: row.summary ?? '',
    publishedAt: row.publishedAt ?? '',
    source: row.source,
    sourceName: row.sourceName,
    date: row.date,
    batch: row.batch,
    category: row.category,
    imageUrl: row.imageUrl ?? `/placeholders/${row.category}.svg`,
  }

  if (row.titleZh) item.titleZh = row.titleZh
  if (row.summaryZh) item.summaryZh = row.summaryZh

  return item
}

function rowToDigest(row: D1DigestRow): DigestData {
  const parsed = row.rawMarkdown ? parseDigestMarkdown(row.rawMarkdown, row.date) : null
  const observations = parseJsonArray<Observation>(row.observations)
  const clusters = parseJsonArray<DigestCluster>(row.clusters)

  return {
    date: row.date,
    headline: row.headline ?? row.headlineZh ?? parsed?.headline ?? '',
    observationText: row.observationText ?? row.observationTextZh ?? parsed?.observationText ?? '',
    observations: observations.length > 0 ? observations : parsed?.observations ?? [],
    clusters: clusters.length > 0 ? clusters : parsed?.clusters ?? [],
  }
}

async function loadDays(db: D1Database): Promise<DayMeta[]> {
  const { results = [] } = await db
    .prepare(
      `
        SELECT
          i.date AS date,
          GROUP_CONCAT(DISTINCT i.batch) AS batches,
          COUNT(1) AS itemCount,
          CASE WHEN EXISTS (SELECT 1 FROM digests d WHERE d.date = i.date) THEN 1 ELSE 0 END AS hasDigest
        FROM items i
        WHERE i.hidden_at IS NULL
        GROUP BY i.date
        ORDER BY i.date ASC
      `,
    )
    .all<D1DayRow>()

  return results.map(rowToDay)
}

async function loadItems(db: D1Database): Promise<SiteItem[]> {
  const { results = [] } = await db
    .prepare(
      `
        SELECT
          id,
          title,
          title_zh AS titleZh,
          url,
          summary,
          summary_zh AS summaryZh,
          published_at AS publishedAt,
          source,
          source_name AS sourceName,
          category,
          image_url AS imageUrl,
          date,
          batch
        FROM items
        WHERE hidden_at IS NULL
        ORDER BY date DESC, published_at DESC, id ASC
      `,
    )
    .all<D1ItemRow>()

  return results.map(rowToItem)
}

function workspaceVisibleItemSql(itemAlias: string): string {
  return `
    EXISTS (
      SELECT 1
      FROM workspace_source_subscriptions wss
      WHERE wss.workspace_id = ?
        AND lower(wss.source_id) = lower(${itemAlias}.source)
        AND (
          wss.source_type <> 'x'
          OR CASE COALESCE(json_extract(${itemAlias}.metadata_json, '$.content_type'), 'original_post')
            WHEN 'original_post' THEN COALESCE(json_extract(wss.collection_preferences_json, '$.includeOriginalPosts'), 1)
            WHEN 'thread' THEN COALESCE(json_extract(wss.collection_preferences_json, '$.includeThreads'), 1)
            WHEN 'thread_part' THEN COALESCE(json_extract(wss.collection_preferences_json, '$.includeThreads'), 1)
            WHEN 'longform_post' THEN COALESCE(json_extract(wss.collection_preferences_json, '$.includeLongformPosts'), 1)
            WHEN 'reply' THEN COALESCE(json_extract(wss.collection_preferences_json, '$.includeReplies'), 0)
            WHEN 'repost' THEN COALESCE(json_extract(wss.collection_preferences_json, '$.includeReposts'), 0)
            WHEN 'quote' THEN COALESCE(json_extract(wss.collection_preferences_json, '$.includeQuotes'), 0)
            WHEN 'media_post' THEN COALESCE(json_extract(wss.collection_preferences_json, '$.includeMediaPosts'), 1)
            ELSE COALESCE(json_extract(wss.collection_preferences_json, '$.includeOriginalPosts'), 1)
          END = 1
        )
    )
  `
}

function addWorkspaceVisibleFilter(filters: string[], bindings: Array<string | number>, workspaceId?: string | null, itemAlias = 'i'): void {
  if (!workspaceId) return
  filters.push(workspaceVisibleItemSql(itemAlias))
  bindings.push(workspaceId)
}

async function loadItemsForDate(db: D1Database, date: string, limit: number, offset: number, category?: string | null, workspaceId?: string | null): Promise<SiteItem[]> {
  const filters = ['i.date = ?', 'i.hidden_at IS NULL']
  const bindings: Array<string | number> = [date]

  if (category) {
    filters.push('i.category = ?')
    bindings.push(category)
  }
  addWorkspaceVisibleFilter(filters, bindings, workspaceId, 'i')

  const { results = [] } = await db
    .prepare(
      `
        SELECT
          i.id,
          i.title,
          i.title_zh AS titleZh,
          i.url,
          i.summary,
          i.summary_zh AS summaryZh,
          i.published_at AS publishedAt,
          i.source,
          i.source_name AS sourceName,
          i.category,
          i.image_url AS imageUrl,
          i.date,
          i.batch
        FROM items i
        WHERE ${filters.join(' AND ')}
        ORDER BY i.published_at DESC, i.id ASC
        LIMIT ? OFFSET ?
      `,
    )
    .bind(...bindings, limit, offset)
    .all<D1ItemRow>()

  return results.map(rowToItem)
}

async function loadCategoryCountsForDate(db: D1Database, date: string, workspaceId?: string | null): Promise<CategoryOption[]> {
  const filters = ['i.date = ?', 'i.hidden_at IS NULL']
  const bindings: Array<string | number> = [date]
  addWorkspaceVisibleFilter(filters, bindings, workspaceId, 'i')

  const { results = [] } = await db
    .prepare(
      `
        SELECT
          i.category,
          COUNT(1) AS itemCount
        FROM items i
        WHERE ${filters.join(' AND ')}
        GROUP BY i.category
      `,
    )
    .bind(...bindings)
    .all<D1CategoryCountRow>()

  return buildCategoryOptions(new Map(results.map((row) => [row.category, Number(row.itemCount ?? 0)])))
}

export async function loadDigestForDate(db: D1Database, date: string): Promise<DigestData | null> {
  const row = await db
    .prepare(
      `
        SELECT
          date,
          batch,
          headline,
          headline_zh AS headlineZh,
          observation_text AS observationText,
          observation_text_zh AS observationTextZh,
          observations,
          clusters,
          raw_markdown AS rawMarkdown
        FROM digests
        WHERE date = ?
        ORDER BY
          CASE batch
            WHEN 'latest' THEN 0
            WHEN 'evening' THEN 1
            WHEN 'morning' THEN 2
            ELSE 3
          END,
          id DESC
        LIMIT 1
      `,
    )
    .bind(date)
    .first<D1DigestRow>()

  return row ? rowToDigest(row) : null
}

export async function loadD1HomePageContent(db: D1Database, options: { page: number; pageSize: number; category?: string | null; workspaceId?: string | null }): Promise<D1HomePageContent> {
  const latestFilters = ['i.hidden_at IS NULL']
  const latestBindings: Array<string | number> = []
  addWorkspaceVisibleFilter(latestFilters, latestBindings, options.workspaceId, 'i')
  const latest = await db
    .prepare(
      `
        SELECT i.date
        FROM items i
        WHERE ${latestFilters.join(' AND ')}
        GROUP BY i.date
        ORDER BY i.date DESC
        LIMIT 1
      `,
    )
    .bind(...latestBindings)
    .first<D1LatestDateRow>()

  if (!latest) {
    return {
      date: null,
      items: [],
      pagination: createPaginationMeta(options.page, options.pageSize, 0),
      sourceCount: 0,
      totalItems: 0,
      categories: [],
    }
  }

  const statsFilters = ['i.date = ?', 'i.hidden_at IS NULL']
  const statsBindings: Array<string | number> = [latest.date]
  addWorkspaceVisibleFilter(statsFilters, statsBindings, options.workspaceId, 'i')

  const [stats, categories] = await Promise.all([
    db
      .prepare(
        `
          SELECT
            COUNT(1) AS itemCount,
            COUNT(DISTINCT i.source_name) AS sourceCount
          FROM items i
          WHERE ${statsFilters.join(' AND ')}
        `,
      )
      .bind(...statsBindings)
      .first<D1HomeStatsRow>(),
    loadCategoryCountsForDate(db, latest.date, options.workspaceId),
  ])

  const totalItems = Number(stats?.itemCount ?? 0)
  const activeCategory = options.category ?? null
  const filteredCount = activeCategory
    ? categories.find((category) => category.id === activeCategory)?.count ?? 0
    : totalItems

  const pagination = createPaginationMeta(options.page, options.pageSize, filteredCount)
  const items = await loadItemsForDate(db, latest.date, pagination.pageSize, paginationOffset(pagination), activeCategory, options.workspaceId)

  return {
    date: latest.date,
    items,
    pagination,
    sourceCount: Number(stats?.sourceCount ?? 0),
    totalItems,
    categories: buildCategoryOptions(new Map(categories.map((category) => [category.id, category.count])), activeCategory),
  }
}

export async function loadD1ArchivePageContent(db: D1Database, options: { page: number; pageSize: number }): Promise<D1ArchivePageContent> {
  const totalRow = await db
    .prepare(
      `
        SELECT COUNT(1) AS total
        FROM (
          SELECT date
          FROM items
          WHERE hidden_at IS NULL
          GROUP BY date
        )
      `,
    )
    .first<D1TotalRow>()

  const pagination = createPaginationMeta(options.page, options.pageSize, Number(totalRow?.total ?? 0))
  const { results = [] } = await db
    .prepare(
      `
        SELECT
          i.date AS date,
          GROUP_CONCAT(DISTINCT i.batch) AS batches,
          COUNT(1) AS itemCount,
          CASE WHEN EXISTS (SELECT 1 FROM digests d WHERE d.date = i.date) THEN 1 ELSE 0 END AS hasDigest
        FROM items i
        WHERE i.hidden_at IS NULL
        GROUP BY i.date
        ORDER BY i.date DESC
        LIMIT ? OFFSET ?
      `,
    )
    .bind(pagination.pageSize, paginationOffset(pagination))
    .all<D1DayRow>()

  return {
    days: results.map(rowToDay),
    pagination,
  }
}

export async function loadD1SiteContent(db: D1Database): Promise<SiteContent> {
  const [days, items] = await Promise.all([
    loadDays(db),
    loadItems(db),
  ])

  return { days, items }
}
