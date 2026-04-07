/**
 * 回归测试 — build-site-data 使用的函数
 *
 * 测试 categorizeSite()、sanitizeText()
 * 这些函数现在从 lib/utils.ts 导出，测试直接 import，不再手动复制。
 */
import { describe, it, expect } from 'vitest'
import { categorizeSite, sanitizeText } from './lib/utils.js'

// ─── categorizeSite ──────────────────────────────────────────────────

describe('categorizeSite', () => {
  // Twitter 系
  it.each([
    ['tw-karpathy', 'twitter'],
    ['tw-openai', 'twitter'],
    ['twitter-list', 'twitter'],
    ['nitter-feed', 'twitter'],
  ])('should categorize %s as %s', (source, expected) => {
    expect(categorizeSite(source)).toBe(expected)
  })

  // 开源/学术
  it.each([
    ['github-trending', 'opensource'],
    ['gh-trending-python', 'opensource'],
    ['arxiv-cs-ai', 'academic'],
    ['huggingface-papers', 'academic'],
    ['hf-daily-papers', 'academic'],
  ])('should categorize %s as %s', (source, expected) => {
    expect(categorizeSite(source)).toBe(expected)
  })

  // 社区
  it.each([
    ['hackernews-top', 'community'],
    ['hn-best', 'community'],
    ['reddit-ml', 'community'],
    ['v2ex-hot', 'community'],
    ['lobsters', 'community'],
    ['devto', 'community'],
  ])('should categorize %s as %s', (source, expected) => {
    expect(categorizeSite(source)).toBe(expected)
  })

  // 中国媒体
  it.each([
    ['36kr-ai', 'china-media'],
    ['huxiu', 'china-media'],
    ['tmtpost', 'china-media'],
    ['leiphone', 'china-media'],
    ['qbitai', 'china-media'],
  ])('should categorize %s as %s', (source, expected) => {
    expect(categorizeSite(source)).toBe(expected)
  })

  // 国际科技媒体
  it.each([
    ['techcrunch', 'tech-media'],
    ['the-verge', 'tech-media'],
    ['ars-technica', 'tech-media'],
    ['the-decoder', 'tech-media'],
    ['techmeme', 'tech-media'],
    ['wired', 'tech-media'],
    ['a16z', 'tech-media'],
  ])('should categorize %s as %s', (source, expected) => {
    expect(categorizeSite(source)).toBe(expected)
  })

  // AI 公司
  it.each([
    ['openai-blog', 'ai-company'],
    ['anthropic-blog', 'ai-company'],
    ['google-ai-blog', 'ai-company'],
    ['deepmind', 'ai-company'],
    ['meta-ai', 'ai-company'],
    ['nvidia-blog', 'ai-company'],
    ['deepseek', 'ai-company'],
    ['mistral-ai', 'ai-company'],
    ['xai-blog', 'ai-company'],
  ])('should categorize %s as %s', (source, expected) => {
    expect(categorizeSite(source)).toBe(expected)
  })

  // 未知源 → 默认 tech-media
  it('should default to tech-media for unknown sources', () => {
    expect(categorizeSite('some-random-blog')).toBe('tech-media')
    expect(categorizeSite('unknown-source')).toBe('tech-media')
  })

  // 回归：ars-technica 不应被误分类为 community
  it('should NOT misclassify ars-technica as community (hn substring regression)', () => {
    expect(categorizeSite('ars-technica')).toBe('tech-media')
  })
})

// ─── sanitizeText ────────────────────────────────────────────────────

describe('sanitizeText', () => {
  it('should decode HTML entities', () => {
    expect(sanitizeText('Hello &amp; World')).toBe('Hello & World')
    expect(sanitizeText('&lt;script&gt;')).toBe('<script>')
    expect(sanitizeText('&quot;quoted&quot;')).toBe('"quoted"')
    expect(sanitizeText("it&#39;s")).toBe("it's")
  })

  it('should decode mdash and ndash', () => {
    expect(sanitizeText('before &mdash; after')).toBe('before \u2014 after')
    expect(sanitizeText('2020 &ndash; 2026')).toBe('2020 \u2013 2026')
  })

  it('should decode numeric character references', () => {
    expect(sanitizeText('&#8212;')).toBe('\u2014')
    expect(sanitizeText('&#169;')).toBe('\u00A9')
  })

  it('should collapse whitespace and newlines', () => {
    expect(sanitizeText('hello\n\nworld')).toBe('hello world')
    expect(sanitizeText('hello   world')).toBe('hello world')
    expect(sanitizeText('hello\n  \n  world')).toBe('hello world')
  })

  it('should replace backticks with single quotes', () => {
    expect(sanitizeText('use `npm install`')).toBe("use 'npm install'")
  })

  it('should handle &nbsp;', () => {
    expect(sanitizeText('hello&nbsp;world')).toBe('hello world')
  })

  it('should trim whitespace', () => {
    expect(sanitizeText('  hello  ')).toBe('hello')
  })

  it('should truncate to maxLen', () => {
    const long = 'a'.repeat(500)
    expect(sanitizeText(long, 300)).toHaveLength(300)
    expect(sanitizeText(long, 100)).toHaveLength(100)
  })

  it('should handle undefined/empty', () => {
    expect(sanitizeText(undefined)).toBe('')
    expect(sanitizeText('')).toBe('')
  })

  it('should handle combined real-world text', () => {
    const input = "Attention Is All You Need &mdash; 10 Years Later\n\nA retrospective on the transformer paper&#39;s impact on AI research &amp; industry."
    const result = sanitizeText(input)
    expect(result).toBe("Attention Is All You Need \u2014 10 Years Later A retrospective on the transformer paper's impact on AI research & industry.")
  })
})

// ─── placeholderImage (inline, trivial) ──────────────────────────────

describe('placeholderImage', () => {
  function placeholderImage(category: string): string {
    return `/placeholders/${category}.svg`
  }

  it('should return SVG path for each category', () => {
    expect(placeholderImage('twitter')).toBe('/placeholders/twitter.svg')
    expect(placeholderImage('ai-company')).toBe('/placeholders/ai-company.svg')
    expect(placeholderImage('community')).toBe('/placeholders/community.svg')
  })
})
