import { describe, expect, it } from 'vitest'

import { parseDigestMarkdown } from '../packages/shared/src/index.ts'

describe('parseDigestMarkdown', () => {
  it('parses headline, observations, clusters, stories, sources, and impact', () => {
    const digest = parseDigestMarkdown(`# AI 日报 · 2026-04-22

## 今日观察

行业进入新一轮平台迁移窗口。

## 重大新闻

### OpenAI 发布新能力

OpenAI 发布了新的开发者能力。

**来源**: [OpenAI](https://openai.com)

> 影响评估：开发者工作流会继续加速。

## 采集统计

| 指标 | 数值 |
|------|------|
`, '2026-04-22')

    expect(digest.headline).toBe('AI 日报 · 2026-04-22')
    expect(digest.observationText).toBe('行业进入新一轮平台迁移窗口。')
    expect(digest.clusters).toHaveLength(1)
    expect(digest.clusters[0].stories[0]).toMatchObject({
      title: 'OpenAI 发布新能力',
      summary: 'OpenAI 发布了新的开发者能力。',
      impact: '开发者工作流会继续加速。',
    })
    expect(digest.clusters[0].stories[0].sources).toEqual([
      { name: 'OpenAI', url: 'https://openai.com' },
    ])
  })
})
