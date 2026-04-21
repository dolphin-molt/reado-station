#!/usr/bin/env tsx
/**
 * build-site-data.ts
 *
 * 将 data/ 目录中的采集数据转换为 Astro 站点可用的 JSON。
 * 在 Astro build 前运行。
 *
 * 输出:
 *   site/src/data/items.json   — 所有 items 平铺，带日期和批次
 *   site/src/data/days.json    — 按天聚合的元数据列表
 */
import { readdirSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readJSON, writeJSON, log, categorizeSite, sanitizeText } from './lib/utils.js'
import type { CollectedData } from './lib/utils.js'
import type {
  DayMeta,
  DigestData,
  SiteItem,
} from '../packages/shared/src/index.ts'
import { parseDigestMarkdown } from '../packages/shared/src/index.ts'

// ─── Category mapping (from lib/utils.ts) ────────────────────────────

// categorize and sanitizeText are imported from lib/utils.ts
// Use categorizeSite as the local alias
const categorize = categorizeSite

function placeholderImage(category: string): string {
  return `/placeholders/${category}.svg`
}

// ─── Main ────────────────────────────────────────────────────────────

function main() {
  log.step('Building site data...')

  const projectRoot = join(import.meta.dirname, '..')
  const dataRoot = join(projectRoot, 'data')
  const outDir = join(projectRoot, 'site', 'src', 'data')

  const allItems: SiteItem[] = []
  const days: DayMeta[] = []
  const digests: DigestData[] = []

  // Load existing items.json to preserve translations and fetched images
  const existingItemsPath = join(outDir, 'items.json')
  const translationCache = new Map<string, { titleZh?: string; summaryZh?: string }>()
  const imageCache = new Map<string, string>()
  if (existsSync(existingItemsPath)) {
    try {
      const existingItems = readJSON<SiteItem[]>(existingItemsPath) || []
      for (const item of existingItems) {
        if (item.titleZh || item.summaryZh) {
          // Cache by both id and url for robust matching
          if (item.id) translationCache.set(item.id, { titleZh: item.titleZh, summaryZh: item.summaryZh })
          if (item.url) translationCache.set(item.url, { titleZh: item.titleZh, summaryZh: item.summaryZh })
        }
        // Preserve non-placeholder image URLs
        if (item.imageUrl && !item.imageUrl.startsWith('/placeholders/')) {
          if (item.id) imageCache.set(item.id, item.imageUrl)
          if (item.url) imageCache.set(item.url, item.imageUrl)
        }
      }
      log.info(`Loaded ${translationCache.size / 2} existing translations, ${imageCache.size / 2} existing images from cache`)
    } catch { /* ignore parse errors */ }
  }

  if (!existsSync(dataRoot)) {
    log.error('No data/ directory found. Run collection first.')
    process.exit(1)
  }

  // Walk data/YYYY/MM/DD/batch/
  const years = readdirSync(dataRoot).filter(f => /^\d{4}$/.test(f)).sort()

  for (const year of years) {
    const months = readdirSync(join(dataRoot, year)).filter(f => /^\d{2}$/.test(f)).sort()
    for (const month of months) {
      const dayDirs = readdirSync(join(dataRoot, year, month)).filter(f => /^\d{2}$/.test(f)).sort()
      for (const day of dayDirs) {
        const dateStr = `${year}-${month}-${day}`
        const dayDir = join(dataRoot, year, month, day)
        const batches = readdirSync(dayDir).filter(f =>
          existsSync(join(dayDir, f, 'raw.json'))
        )

        let dayItemCount = 0
        let digestPath: string | null = null

        for (const batch of batches) {
          const batchDir = join(dayDir, batch)
          const rawPath = join(batchDir, 'raw.json')
          const digestMdPath = join(batchDir, 'digest.md')

          if (existsSync(digestMdPath)) {
            digestPath = `${year}/${month}/${day}/${batch}/digest.md`
            try {
              const digestMd = readFileSync(digestMdPath, 'utf-8')
              const parsed = parseDigestMarkdown(digestMd, dateStr)
              if (parsed.clusters.length > 0) {
                // Keep the best digest per date — prefer the one with more content
                const existingIdx = digests.findIndex(d => d.date === dateStr)
                if (existingIdx >= 0) {
                  const existing = digests[existingIdx]
                  // Merge: keep the version with more clusters, but always preserve observations
                  const merged = parsed.clusters.length >= existing.clusters.length ? parsed : existing
                  // If the winning digest has no observations/observationText but the other does, copy them over
                  if (!merged.observationText && (parsed.observationText || existing.observationText)) {
                    merged.observationText = parsed.observationText || existing.observationText
                  }
                  if (merged.observations.length === 0 && (parsed.observations.length > 0 || existing.observations.length > 0)) {
                    merged.observations = parsed.observations.length > 0 ? parsed.observations : existing.observations
                  }
                  digests[existingIdx] = merged
                } else {
                  digests.push(parsed)
                }
              }
            } catch { /* skip malformed digests */ }
          }

          const raw = readJSON<CollectedData>(rawPath)
          if (!raw?.items) continue

          for (let i = 0; i < raw.items.length; i++) {
            const item = raw.items[i]
            if (!item.url) continue

            // Skip low-quality items: title is just a site name/tagline, not real article content
            const trimmedTitle = (item.title || '').replace(/^-\s*/, '').trim()
            if (!trimmedTitle || trimmedTitle === item.sourceName || trimmedTitle === item.source) continue
            // Skip if title equals summary (Google News garbage: title and summary are identical site taglines)
            const trimmedSummary = (item.summary || '').trim()
            if (trimmedTitle === trimmedSummary && trimmedTitle.length < 60) continue

            const cat = categorize(item.source)
            const itemId = `${dateStr}-${batch}-${i}`
            const siteItem: SiteItem = {
              ...item,
              title: sanitizeText(item.title, 200),
              summary: sanitizeText(item.summary, 400),
              id: itemId,
              date: dateStr,
              batch,
              category: cat,
              imageUrl: placeholderImage(cat),
            }
            // Restore cached translations
            const cached = translationCache.get(itemId) || translationCache.get(item.url)
            if (cached) {
              if (cached.titleZh) siteItem.titleZh = cached.titleZh
              if (cached.summaryZh) siteItem.summaryZh = cached.summaryZh
            }
            // Restore cached image URLs (fetched by fetch-images.ts)
            const cachedImage = imageCache.get(itemId) || imageCache.get(item.url)
            if (cachedImage) {
              siteItem.imageUrl = cachedImage
            }
            allItems.push(siteItem)
            dayItemCount++
          }
        }

        days.push({
          date: dateStr,
          batches,
          itemCount: dayItemCount,
          digestPath,
        })
      }
    }
  }

  // Sort items by date descending, then by source importance
  allItems.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date)
    return 0
  })

  // Sort digests by date descending
  digests.sort((a, b) => b.date.localeCompare(a.date))

  // Write outputs
  writeJSON(join(outDir, 'items.json'), allItems)
  writeJSON(join(outDir, 'days.json'), days)
  writeJSON(join(outDir, 'digests.json'), digests)

  log.success(`Built ${allItems.length} items across ${days.length} days, ${digests.length} digests`)
  log.data('Output', outDir)
}

main()
