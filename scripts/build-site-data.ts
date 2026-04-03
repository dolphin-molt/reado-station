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
import { readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { readJSON, writeJSON, log } from './lib/utils.js'
import type { CollectedData, InfoItem } from './lib/utils.js'

interface SiteItem extends InfoItem {
  id: string
  date: string
  batch: string
  category: string
  imageUrl: string
}

interface DayMeta {
  date: string
  batches: string[]
  itemCount: number
  digestPath: string | null
}

// ─── Category mapping ────────────────────────────────────────────────

function categorize(source: string): string {
  const s = source.toLowerCase()
  if (s.includes('twitter') || s.includes('nitter') || s.startsWith('tw-')) return 'twitter'
  if (s.includes('github') || s.includes('gh-trending')) return 'opensource'
  if (s.includes('arxiv') || s.includes('huggingface') || s.includes('hf-')) return 'academic'
  if (s.includes('hackernews') || s.includes('hn')) return 'community'
  if (s.includes('reddit') || s.includes('v2ex') || s.includes('lobsters') || s.includes('devto')) return 'community'
  if (s.includes('36kr') || s.includes('huxiu') || s.includes('tmtpost') || s.includes('leiphone') || s.includes('qbitai')) return 'china-media'
  if (s.includes('techmeme') || s.includes('techcrunch') || s.includes('the-verge') || s.includes('ars-technica') || s.includes('the-decoder') || s.includes('wired') || s.includes('bbc')) return 'tech-media'
  if (s.includes('a16z') || s.includes('ycombinator')) return 'tech-media'
  if (s.includes('openai') || s.includes('anthropic') || s.includes('google-ai') || s.includes('deepmind') || s.includes('meta-ai') || s.includes('nvidia') || s.includes('deepseek') || s.includes('mistral') || s.includes('xai')) return 'ai-company'
  return 'tech-media'
}

function placeholderImage(category: string): string {
  return `/placeholders/${category}.svg`
}

/**
 * Sanitize text fields: remove newlines, trim, truncate
 */
function sanitizeText(text: string | undefined, maxLen: number = 300): string {
  if (!text) return ''
  return text
    .replace(/\n+/g, ' ')       // Replace newlines with spaces
    .replace(/\s+/g, ' ')       // Collapse whitespace
    .replace(/[`]/g, "'")       // Replace backticks (breaks template literals)
    .replace(/&mdash;/g, '\u2014')   // Decode HTML entities
    .replace(/&ndash;/g, '\u2013')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim()
    .slice(0, maxLen)
}

// ─── Main ────────────────────────────────────────────────────────────

function main() {
  log.step('Building site data...')

  const projectRoot = join(import.meta.dirname, '..')
  const dataRoot = join(projectRoot, 'data')
  const outDir = join(projectRoot, 'site', 'src', 'data')

  const allItems: SiteItem[] = []
  const days: DayMeta[] = []

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
          }

          const raw = readJSON<CollectedData>(rawPath)
          if (!raw?.items) continue

          for (let i = 0; i < raw.items.length; i++) {
            const item = raw.items[i]
            if (!item.url) continue

            const cat = categorize(item.source)
            const siteItem: SiteItem = {
              ...item,
              title: sanitizeText(item.title, 200),
              summary: sanitizeText(item.summary, 400),
              id: `${dateStr}-${batch}-${i}`,
              date: dateStr,
              batch,
              category: cat,
              imageUrl: placeholderImage(cat),
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

  // Write outputs
  writeJSON(join(outDir, 'items.json'), allItems)
  writeJSON(join(outDir, 'days.json'), days)

  log.success(`Built ${allItems.length} items across ${days.length} days`)
  log.data('Output', outDir)
}

main()
