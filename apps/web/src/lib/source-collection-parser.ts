interface RssParserJob {
  sourceId: string
  sourceName: string
  sourceUrl: string
  windowStart: string
  windowEnd: string
}

export interface ParsedSourceItem {
  title: string
  url: string
  summary: string
  publishedAt: string
  source: string
  sourceName: string
  category: string
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

function inWindow(publishedAt: string, windowStart: string, windowEnd: string): boolean {
  if (!publishedAt) return true
  const time = new Date(publishedAt).getTime()
  if (Number.isNaN(time)) return true
  return time >= new Date(windowStart).getTime() && time <= new Date(windowEnd).getTime()
}

export function parseRssOrAtom(xml: string, job: RssParserJob): ParsedSourceItem[] {
  const chunks = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi)
    ?? xml.match(/<entry(?:\s[^>]*)?>[\s\S]*?<\/entry>/gi)
    ?? []

  return chunks.slice(0, 50).map((chunk) => {
    const publishedAt = safeDate(
      textBetween(chunk, 'pubDate')
      || textBetween(chunk, 'published')
      || textBetween(chunk, 'updated')
      || textBetween(chunk, 'dc:date'),
    )
    return {
      title: textBetween(chunk, 'title').slice(0, 220),
      url: normalizeUrl(textBetween(chunk, 'link') || atomLink(chunk), job.sourceUrl),
      summary: (textBetween(chunk, 'description') || textBetween(chunk, 'summary') || textBetween(chunk, 'content:encoded')).slice(0, 600),
      publishedAt,
      source: job.sourceId,
      sourceName: job.sourceName,
      category: job.sourceId.includes('fed') || job.sourceId.includes('sec') || job.sourceId.includes('ft') ? 'finance' : 'rss',
    }
  }).filter((item) => item.title && item.url && inWindow(item.publishedAt, job.windowStart, job.windowEnd))
}
