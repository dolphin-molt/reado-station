/**
 * fetch-images.ts
 *
 * Fetches OG images for items in site/src/data/items.json,
 * converts them to WebP via sharp, and updates imageUrl fields.
 *
 * Usage:  npx tsx scripts/fetch-images.ts
 */

import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import pLimit from 'p-limit'
import { readJSON, writeJSON, log, getProjectRoot } from './lib/utils.js'

// ─── Config ─────────────────────────────────────────────────────────

const FETCH_TIMEOUT = 5_000        // 5 seconds per request
const CONCURRENCY = 5              // parallel fetches
const MIN_IMAGE_WIDTH = 200        // skip tiny icons
const PLACEHOLDER_PATTERN = /^\/placeholders\//

// ─── Paths ──────────────────────────────────────────────────────────

const root = getProjectRoot()
const ITEMS_JSON = join(root, 'site', 'src', 'data', 'items.json')
const IMAGES_DIR = join(root, 'site', 'public', 'images')

// ─── Types ──────────────────────────────────────────────────────────

interface SiteItem {
  id: string
  date: string
  batch: string
  category: string
  imageUrl: string
  url: string
  title: string
  summary: string
  source: string
  sourceName: string
}

// ─── Google News URL Detection ─────────────────────────────────────

const GOOGLE_NEWS_PATTERN = /^https?:\/\/news\.google\.com\/rss\/articles\//

/**
 * Google News redirect URLs use encrypted protobuf encoding and block
 * server-side requests, so we skip them entirely to avoid fetching
 * Google's own og:image instead of the real article image.
 */
function isGoogleNewsUrl(url: string): boolean {
  return GOOGLE_NEWS_PATTERN.test(url)
}

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Fetch a URL with timeout using built-in fetch + AbortController.
 */
async function fetchWithTimeout(url: string, timeoutMs = FETCH_TIMEOUT): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ReadoBot/1.0)',
        Accept: 'text/html,application/xhtml+xml,*/*',
      },
      redirect: 'follow',
    })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Extract og:image URL from an HTML string.
 */
function extractOgImage(html: string): string | null {
  // Match <meta property="og:image" content="..." />
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m?.[1]) return m[1]
  }
  return null
}

/**
 * Resolve a possibly-relative image URL against the page URL.
 */
function resolveImageUrl(imageUrl: string, pageUrl: string): string {
  try {
    return new URL(imageUrl, pageUrl).href
  } catch {
    return imageUrl
  }
}

/**
 * Download an image, convert to WebP, and save it.
 * Returns true on success.
 */
async function downloadAndConvert(imageUrl: string, destPath: string): Promise<boolean> {
  const res = await fetchWithTimeout(imageUrl)
  if (!res.ok) return false

  const buffer = Buffer.from(await res.arrayBuffer())
  if (buffer.length < 500) return false // too small, probably an error page

  const image = sharp(buffer)
  const metadata = await image.metadata()

  // Skip tiny images (likely icons / tracking pixels)
  if (metadata.width && metadata.width < MIN_IMAGE_WIDTH) {
    log.warn(`  Skipping tiny image (${metadata.width}px): ${imageUrl}`)
    return false
  }

  await image
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(destPath)

  return true
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  log.step('Fetch OG images for items.json')

  // 1. Read items
  const items = readJSON<SiteItem[]>(ITEMS_JSON)
  if (!items || items.length === 0) {
    log.error('No items found in items.json')
    process.exit(1)
  }
  log.info(`Loaded ${items.length} items`)

  // 2. Ensure output directory
  mkdirSync(IMAGES_DIR, { recursive: true })

  // 3. Filter items that need an image fetched
  let skippedGoogleNews = 0
  const pending = items.filter((item) => {
    if (!item.url) return false
    // Skip items that already have a non-placeholder image
    if (item.imageUrl && !PLACEHOLDER_PATTERN.test(item.imageUrl)) return false
    // Skip Google News redirect URLs — they use encrypted protobuf encoding
    // and return Google's own og:image instead of the real article image
    if (isGoogleNewsUrl(item.url)) {
      skippedGoogleNews++
      return false
    }
    return true
  })
  log.info(`${pending.length} items need OG images (${items.length - pending.length} already have images, ${skippedGoogleNews} Google News URLs skipped)`)

  if (pending.length === 0) {
    log.success('Nothing to do')
    return
  }

  // 4. Fetch OG images with concurrency limit
  const limit = pLimit(CONCURRENCY)
  let successCount = 0
  let failCount = 0

  const tasks = pending.map((item) =>
    limit(async () => {
      const destPath = join(IMAGES_DIR, `${item.id}.webp`)

      // Skip if file already exists on disk
      if (existsSync(destPath)) {
        item.imageUrl = `/images/${item.id}.webp`
        successCount++
        log.info(`  [cached] ${item.id}`)
        return
      }

      try {
        // Fetch page HTML
        const pageRes = await fetchWithTimeout(item.url)
        if (!pageRes.ok) throw new Error(`HTTP ${pageRes.status}`)

        const html = await pageRes.text()
        const ogUrl = extractOgImage(html)

        if (!ogUrl) {
          throw new Error('No og:image found')
        }

        const absoluteUrl = resolveImageUrl(ogUrl, item.url)
        const ok = await downloadAndConvert(absoluteUrl, destPath)

        if (!ok) throw new Error('Image download/convert failed')

        item.imageUrl = `/images/${item.id}.webp`
        successCount++
        log.success(`  ${item.id} -> ${item.imageUrl}`)
      } catch (err: any) {
        failCount++
        // Keep the existing placeholder
        log.warn(`  ${item.id}: ${err?.message ?? err}`)
      }
    }),
  )

  await Promise.all(tasks)

  // 5. Write back updated items.json
  writeJSON(ITEMS_JSON, items)

  log.step('Done')
  log.info(`Success: ${successCount}, Failed: ${failCount}, Total: ${items.length}`)
}

main().catch((err) => {
  log.error(err.message ?? err)
  process.exit(1)
})
