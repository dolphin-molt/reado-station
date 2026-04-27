import type { SiteItem } from '../../../../packages/shared/src'

import { upsertIngestPayload } from '@/lib/d1-write'

interface SourceRow {
  id: string
  name: string
  adapter: string
  url: string | null
  hours: number | null
  category: string | null
}

interface CollectedItem {
  title: string
  url: string
  summary: string
  publishedAt: string
  source: string
  sourceName: string
  category: string
}

interface SourceCollectionResult {
  sourceId: string
  success: boolean
  items: CollectedItem[]
  error?: string
}

export interface ProgramCollectionResult {
  status: 'collected' | 'skipped'
  reason?: string
  date?: string
  batch?: string
  totalSources?: number
  successSources?: number
  failedSources?: number
  itemCount?: number
}

function currentRunTime(): { date: string; batch: 'morning' | 'evening'; iso: string } {
  const now = new Date()
  const chinaHour = Number(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    hour12: false,
  }).format(now))
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)

  return { date, batch: chinaHour < 14 ? 'morning' : 'evening', iso: now.toISOString() }
}

function stripTags(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
}

function textBetween(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return match ? decodeEntities(stripTags(match[1])) : ''
}

function atomLink(xml: string): string {
  return xml.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i)?.[1] ?? ''
}

function normalizeUrl(url: string, baseUrl?: string): string {
  try {
    return new URL(decodeEntities(url.trim()), baseUrl).toString()
  } catch {
    return decodeEntities(url.trim())
  }
}

function safeDate(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toISOString()
}

function withinHours(publishedAt: string, hours: number): boolean {
  if (!publishedAt) return true
  const timestamp = new Date(publishedAt).getTime()
  if (Number.isNaN(timestamp)) return true
  return Date.now() - timestamp <= hours * 60 * 60 * 1000
}

function parseFeed(xml: string, source: SourceRow): CollectedItem[] {
  const chunks = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi)
    ?? xml.match(/<entry(?:\s[^>]*)?>[\s\S]*?<\/entry>/gi)
    ?? []
  const hours = Math.max(1, source.hours ?? 24)

  return chunks.slice(0, 30).map((chunk) => {
    const publishedAt = safeDate(
      textBetween(chunk, 'pubDate')
      || textBetween(chunk, 'published')
      || textBetween(chunk, 'updated')
      || textBetween(chunk, 'dc:date'),
    )
    return {
      title: textBetween(chunk, 'title').slice(0, 220),
      url: normalizeUrl(textBetween(chunk, 'link') || atomLink(chunk), source.url ?? undefined),
      summary: (textBetween(chunk, 'description') || textBetween(chunk, 'summary') || textBetween(chunk, 'content:encoded')).slice(0, 600),
      publishedAt,
      source: source.id,
      sourceName: source.name,
      category: source.category ?? 'tech-media',
    }
  }).filter((item) => item.title && item.url && withinHours(item.publishedAt ?? '', hours))
}

async function collectFeedSource(source: SourceRow): Promise<SourceCollectionResult> {
  if (!source.url) return { sourceId: source.id, success: false, items: [], error: 'missing source url' }

  try {
    const response = await fetch(source.url, {
      headers: {
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
        'User-Agent': 'reado-station/1.0 (+https://reado.dolphinmolt.com)',
      },
      cf: { cacheTtl: 300, cacheEverything: false },
    } as RequestInit)
    const text = await response.text()
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return { sourceId: source.id, success: true, items: parseFeed(text, source) }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    return { sourceId: source.id, success: false, items: [], error: message }
  }
}

async function collectHackerNews(source: SourceRow): Promise<SourceCollectionResult> {
  const hours = Math.max(1, source.hours ?? 24)
  const after = Math.floor((Date.now() - hours * 60 * 60 * 1000) / 1000)
  try {
    const response = await fetch(`https://hn.algolia.com/api/v1/search_by_date?tags=story&numericFilters=created_at_i>${after}&hitsPerPage=30`)
    const body = await response.json() as { hits?: Array<{ title?: string; story_title?: string; url?: string; story_url?: string; objectID?: string; created_at?: string }> }
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const items = (body.hits ?? []).map((hit) => ({
      title: hit.title ?? hit.story_title ?? '',
      url: hit.url ?? hit.story_url ?? `https://news.ycombinator.com/item?id=${hit.objectID ?? ''}`,
      summary: '',
      publishedAt: hit.created_at ?? '',
      source: source.id,
      sourceName: source.name,
      category: source.category ?? 'community',
    })).filter((item) => item.title && item.url)
    return { sourceId: source.id, success: true, items }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    return { sourceId: source.id, success: false, items: [], error: message }
  }
}

async function collectGithubTrending(source: SourceRow): Promise<SourceCollectionResult> {
  const language = source.id === 'github-trending' ? '' : source.id.replace(/^github-trending-/, '')
  const url = `https://github.com/trending/${encodeURIComponent(language)}?since=daily`
  try {
    const response = await fetch(url, {
      headers: { Accept: 'text/html', 'User-Agent': 'reado-station/1.0' },
      cf: { cacheTtl: 900, cacheEverything: false },
    } as RequestInit)
    const html = await response.text()
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const matches = [...html.matchAll(/<h2[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)].slice(0, 15)
    const items = matches.map((match) => {
      const repoPath = stripTags(match[1]).replace(/\s+/g, '')
      const title = stripTags(match[2]).replace(/\s+/g, '')
      return {
        title: title || repoPath.replace(/^\//, ''),
        url: normalizeUrl(repoPath, 'https://github.com'),
        summary: 'GitHub Trending daily repository.',
        publishedAt: new Date().toISOString(),
        source: source.id,
        sourceName: source.name,
        category: source.category ?? 'opensource',
      }
    }).filter((item) => item.title && item.url)
    return { sourceId: source.id, success: true, items }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    return { sourceId: source.id, success: false, items: [], error: message }
  }
}

async function loadProgramSources(db: D1Database, env: CloudflareEnv): Promise<SourceRow[]> {
  const limit = Math.max(1, Math.min(200, Number(env.READO_COLLECT_MAX_SOURCES ?? 120)))
  const { results = [] } = await db
    .prepare(
      `
        SELECT id, name, adapter, url, hours, category
        FROM sources
        WHERE enabled = 1
          AND adapter IN ('rss', 'wordpress', 'hackernews', 'github-trending')
        ORDER BY id ASC
        LIMIT ?
      `,
    )
    .bind(limit)
    .all<SourceRow>()
  return results
}

async function collectSource(source: SourceRow): Promise<SourceCollectionResult> {
  if (source.adapter === 'hackernews') return collectHackerNews(source)
  if (source.adapter === 'github-trending') return collectGithubTrending(source)
  return collectFeedSource(source)
}

async function collectWithConcurrency(sources: SourceRow[], concurrency: number): Promise<SourceCollectionResult[]> {
  const results: SourceCollectionResult[] = []
  for (let index = 0; index < sources.length; index += concurrency) {
    results.push(...await Promise.all(sources.slice(index, index + concurrency).map(collectSource)))
  }
  return results
}

function dedupeItems(items: CollectedItem[]): CollectedItem[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = item.url || `${item.source}:${item.title}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export async function collectProgramSources(db: D1Database, env: CloudflareEnv): Promise<ProgramCollectionResult> {
  const sources = await loadProgramSources(db, env)
  if (sources.length === 0) return { status: 'skipped', reason: 'no cloud-safe sources' }

  const { date, batch, iso } = currentRunTime()
  const concurrency = Math.max(1, Math.min(10, Number(env.READO_COLLECT_CONCURRENCY ?? 5)))
  const results = await collectWithConcurrency(sources, concurrency)
  const items = dedupeItems(results.flatMap((result) => result.items))
  const successSourceIds = [...new Set(items.map((item) => item.source))]
  const failedSourceIds = results.filter((result) => !result.success).map((result) => result.sourceId)

  if (items.length === 0 && successSourceIds.length === 0) {
    return {
      status: 'skipped',
      reason: 'all source collections failed',
      date,
      batch,
      totalSources: sources.length,
      successSources: 0,
      failedSources: failedSourceIds.length,
      itemCount: 0,
    }
  }

  const payload = {
    date,
    batch,
    mode: 'program',
    fetchedAt: iso,
    updatedAt: iso,
    stats: {
      totalSources: sources.length,
      successSources: successSourceIds.length,
      failedSources: failedSourceIds.length,
      totalItems: items.length,
      deduplicatedItems: results.flatMap((result) => result.items).length - items.length,
      successSourceIds,
      failedSourceIds,
    },
    items: items satisfies Omit<SiteItem, 'id' | 'date' | 'batch' | 'imageUrl'>[],
  }

  const write = await upsertIngestPayload(db, payload)

  return {
    status: 'collected',
    date: write.date,
    batch: write.batch,
    totalSources: sources.length,
    successSources: successSourceIds.length,
    failedSources: failedSourceIds.length,
    itemCount: write.itemCount,
  }
}
