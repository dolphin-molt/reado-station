import 'server-only'

import { parseDigestMarkdown, type DayMeta, type DigestCluster, type DigestData, type Observation, type SiteItem } from '../../../../packages/shared/src'

import type { SiteContent } from '@/lib/content'

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
        ORDER BY date DESC, published_at DESC, id ASC
      `,
    )
    .all<D1ItemRow>()

  return results.map(rowToItem)
}

async function loadDigests(db: D1Database): Promise<DigestData[]> {
  const { results = [] } = await db
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
        ORDER BY
          date DESC,
          CASE batch
            WHEN 'latest' THEN 0
            WHEN 'evening' THEN 1
            WHEN 'morning' THEN 2
            ELSE 3
          END,
          id DESC
      `,
    )
    .all<D1DigestRow>()

  const byDate = new Map<string, DigestData>()
  for (const row of results) {
    if (!byDate.has(row.date)) {
      byDate.set(row.date, rowToDigest(row))
    }
  }

  return [...byDate.values()]
}

export async function loadD1SiteContent(db: D1Database): Promise<SiteContent> {
  const [days, digests, items] = await Promise.all([
    loadDays(db),
    loadDigests(db),
    loadItems(db),
  ])

  return { days, digests, items }
}
