/**
 * 回归测试 — utils.ts 纯函数
 *
 * 这些测试覆盖数据管线中最容易引发连锁问题的函数：
 * - deduplicateItems: URL 归一化 → 去重逻辑
 * - categorizeItems: source 字符串 → 分类映射
 * - getBatch: 时间 → 批次判定
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { deduplicateItems, categorizeItems, type InfoItem } from './utils.js'

// ─── Test Helpers ────────────────────────────────────────────────────

function makeItem(overrides: Partial<InfoItem> = {}): InfoItem {
  return {
    title: 'Test Item',
    url: 'https://example.com/article',
    summary: 'Test summary',
    publishedAt: '2026-04-07T00:00:00Z',
    source: 'test-source',
    sourceName: 'Test Source',
    ...overrides,
  }
}

// ─── deduplicateItems ────────────────────────────────────────────────

describe('deduplicateItems', () => {
  it('should keep unique items unchanged', () => {
    const items = [
      makeItem({ url: 'https://a.com/1' }),
      makeItem({ url: 'https://b.com/2' }),
      makeItem({ url: 'https://c.com/3' }),
    ]
    const result = deduplicateItems(items)
    expect(result.items).toHaveLength(3)
    expect(result.removedCount).toBe(0)
  })

  it('should deduplicate exact same URLs', () => {
    const items = [
      makeItem({ url: 'https://a.com/1', title: 'First' }),
      makeItem({ url: 'https://a.com/1', title: 'Duplicate' }),
    ]
    const result = deduplicateItems(items)
    expect(result.items).toHaveLength(1)
    expect(result.items[0].title).toBe('First') // keep first
    expect(result.removedCount).toBe(1)
  })

  it('should normalize protocol (http vs https)', () => {
    const items = [
      makeItem({ url: 'https://example.com/article' }),
      makeItem({ url: 'http://example.com/article' }),
    ]
    const result = deduplicateItems(items)
    expect(result.items).toHaveLength(1)
    expect(result.removedCount).toBe(1)
  })

  it('should normalize trailing slash', () => {
    const items = [
      makeItem({ url: 'https://example.com/article' }),
      makeItem({ url: 'https://example.com/article/' }),
    ]
    const result = deduplicateItems(items)
    expect(result.items).toHaveLength(1)
  })

  it('should normalize case', () => {
    const items = [
      makeItem({ url: 'https://Example.COM/Article' }),
      makeItem({ url: 'https://example.com/article' }),
    ]
    const result = deduplicateItems(items)
    expect(result.items).toHaveLength(1)
  })

  it('should handle combined normalization (protocol + case + slash)', () => {
    const items = [
      makeItem({ url: 'https://openai.com/blog/gpt-5' }),
      makeItem({ url: 'http://OPENAI.COM/blog/gpt-5/' }),
    ]
    const result = deduplicateItems(items)
    expect(result.items).toHaveLength(1)
  })

  it('should handle empty array', () => {
    const result = deduplicateItems([])
    expect(result.items).toHaveLength(0)
    expect(result.removedCount).toBe(0)
  })

  it('should preserve order (first occurrence wins)', () => {
    const items = [
      makeItem({ url: 'https://a.com', source: 'openai-blog' }),
      makeItem({ url: 'https://b.com', source: 'techcrunch' }),
      makeItem({ url: 'https://a.com/', source: 'the-verge' }),
    ]
    const result = deduplicateItems(items)
    expect(result.items).toHaveLength(2)
    expect(result.items[0].source).toBe('openai-blog')
    expect(result.items[1].source).toBe('techcrunch')
  })
})

// ─── categorizeItems ─────────────────────────────────────────────────

describe('categorizeItems', () => {
  it('should categorize Twitter items', () => {
    const items = [
      makeItem({ source: 'tw-karpathy' }),
      makeItem({ source: 'twitter-openai' }),
      makeItem({ source: 'nitter-feed' }),
    ]
    const result = categorizeItems(items)
    expect(result.twitter).toHaveLength(3)
    expect(result.news).toHaveLength(0)
    expect(result.opensource).toHaveLength(0)
    expect(result.community).toHaveLength(0)
  })

  it('should categorize opensource items', () => {
    const items = [
      makeItem({ source: 'github-trending' }),
      makeItem({ source: 'arxiv-cs-ai' }),
      makeItem({ source: 'huggingface-papers' }),
      makeItem({ source: 'hf-daily-papers' }),
    ]
    const result = categorizeItems(items)
    expect(result.opensource).toHaveLength(4)
  })

  it('should categorize community items', () => {
    const items = [
      makeItem({ source: 'hackernews-top' }),
      makeItem({ source: 'hn-best' }),
      makeItem({ source: 'reddit-ml' }),
      makeItem({ source: 'v2ex-hot' }),
      makeItem({ source: 'lobsters' }),
      makeItem({ source: 'devto' }),
    ]
    const result = categorizeItems(items)
    expect(result.community).toHaveLength(6)
  })

  it('should NOT misclassify ars-technica as community (hn substring bug)', () => {
    // Regression: "ars-technica" contains "hn" substring
    const items = [makeItem({ source: 'ars-technica' })]
    const result = categorizeItems(items)
    expect(result.community).toHaveLength(0)
    expect(result.news).toHaveLength(1) // falls through to news (default)
  })

  it('should categorize remaining as news', () => {
    const items = [
      makeItem({ source: 'openai-blog' }),
      makeItem({ source: 'anthropic-blog' }),
      makeItem({ source: 'techcrunch' }),
      makeItem({ source: '36kr-ai' }),
    ]
    const result = categorizeItems(items)
    expect(result.news).toHaveLength(4)
  })

  it('should handle mixed items', () => {
    const items = [
      makeItem({ source: 'openai-blog' }),
      makeItem({ source: 'tw-karpathy' }),
      makeItem({ source: 'github-trending' }),
      makeItem({ source: 'hackernews-top' }),
    ]
    const result = categorizeItems(items)
    expect(result.news).toHaveLength(1)
    expect(result.twitter).toHaveLength(1)
    expect(result.opensource).toHaveLength(1)
    expect(result.community).toHaveLength(1)
  })

  it('should handle empty array', () => {
    const result = categorizeItems([])
    expect(result.news).toHaveLength(0)
    expect(result.twitter).toHaveLength(0)
    expect(result.opensource).toHaveLength(0)
    expect(result.community).toHaveLength(0)
  })
})

// ─── getBatch ────────────────────────────────────────────────────────

describe('getBatch', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return morning before 14:00', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-07T08:00:00'))
    // Re-import to pick up mocked time
    const { getBatch } = await import('./utils.js')
    expect(getBatch()).toBe('morning')
    vi.useRealTimers()
  })

  it('should return evening at 14:00 or later', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-07T14:00:00'))
    const { getBatch } = await import('./utils.js')
    expect(getBatch()).toBe('evening')
    vi.useRealTimers()
  })

  it('should return evening at 18:00', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-07T18:00:00'))
    const { getBatch } = await import('./utils.js')
    expect(getBatch()).toBe('evening')
    vi.useRealTimers()
  })
})
