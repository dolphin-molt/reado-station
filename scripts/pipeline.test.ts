/**
 * 回归测试 — 管线集成测试
 *
 * 用 fixtures/raw.json 跑 build-site-data 的核心逻辑：
 * raw.json → items.json 转换是否正确。
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { deduplicateItems, categorizeSite, sanitizeText, type CollectedData } from './lib/utils.js'

// ─── Load fixture ────────────────────────────────────────────────────

const fixturePath = join(import.meta.dirname, '__fixtures__', 'raw.json')
const rawData: CollectedData = JSON.parse(readFileSync(fixturePath, 'utf-8'))

// ─── Pipeline integration tests ──────────────────────────────────────

describe('raw.json → site items pipeline', () => {
  const date = '2026-04-07'
  const batch = 'morning'

  const siteItems = rawData.items
    .filter(item => item.url)
    .map((item, i) => ({
      ...item,
      title: sanitizeText(item.title, 200),
      summary: sanitizeText(item.summary, 400),
      id: `${date}-${batch}-${i}`,
      date,
      batch,
      category: categorizeSite(item.source),
      imageUrl: `/placeholders/${categorizeSite(item.source)}.svg`,
    }))

  it('should convert all items (including duplicates at this stage)', () => {
    expect(siteItems.length).toBe(10)
  })

  it('should generate unique IDs', () => {
    const ids = siteItems.map(item => item.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('should assign correct categories', () => {
    const byCategory = new Map<string, number>()
    for (const item of siteItems) {
      byCategory.set(item.category, (byCategory.get(item.category) || 0) + 1)
    }

    expect(byCategory.get('ai-company')).toBe(2)
    expect(byCategory.get('twitter')).toBe(1)
    expect(byCategory.get('opensource')).toBe(1)
    expect(byCategory.get('academic')).toBe(2)
    expect(byCategory.get('community')).toBe(2)
    expect(byCategory.get('china-media')).toBe(1)
    expect(byCategory.get('tech-media')).toBe(1)
  })

  it('should decode HTML entities in content', () => {
    const arxivItem = siteItems.find(item => item.source === 'arxiv-cs-ai')
    expect(arxivItem).toBeDefined()
    expect(arxivItem!.title).toContain('\u2014')
    expect(arxivItem!.summary).toContain("'")
    expect(arxivItem!.summary).toContain('&')
    expect(arxivItem!.summary).not.toContain('&amp;')
  })

  it('should have valid image placeholders for all items', () => {
    for (const item of siteItems) {
      expect(item.imageUrl).toMatch(/^\/placeholders\/[\w-]+\.svg$/)
    }
  })
})

describe('deduplication with fixture data', () => {
  it('should deduplicate the fixture raw items', () => {
    const result = deduplicateItems(rawData.items)
    expect(result.removedCount).toBe(1)
    expect(result.items).toHaveLength(9)
    expect(result.items[0].source).toBe('openai-blog')
  })
})
