import { describe, expect, it } from 'vitest'

import { loadSourceProfileAssets } from './source-profile-assets'

describe('source profile asset provider', () => {
  it('loads model-filled assets from channel profile featured_json before seed data', async () => {
    const featuredJson = JSON.stringify([
      {
        kind: 'github',
        title: 'model-filled repo',
        url: 'https://github.com/example/model-filled',
        summary: 'Discovered by enrichment.',
      },
      {
        kind: 'youtube',
        title: 'model-filled video',
        url: 'https://www.youtube.com/watch?v=abc123',
        summary: 'Discovered video.',
        thumbnailUrl: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg',
      },
    ])
    const db = {
      prepare: () => ({
        bind: () => ({
          first: async () => ({ featuredJson }),
        }),
      }),
    } as unknown as D1Database

    await expect(loadSourceProfileAssets(db, { sourceType: 'x', sourceValue: 'AnthropicAI' })).resolves.toEqual([
      {
        kind: 'github',
        title: 'model-filled repo',
        url: 'https://github.com/example/model-filled',
        summary: 'Discovered by enrichment.',
      },
      {
        kind: 'youtube',
        title: 'model-filled video',
        url: 'https://www.youtube.com/watch?v=abc123',
        summary: 'Discovered video.',
        thumbnailUrl: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg',
      },
    ])
  })

  it('uses seed assets only when enrichment has not filled the profile yet', async () => {
    const db = {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
        }),
      }),
    } as unknown as D1Database

    const assets = await loadSourceProfileAssets(db, { sourceType: 'x', sourceValue: 'AnthropicAI' })

    expect(assets.map((asset) => asset.url)).toContain('https://www.anthropic.com')
    expect(assets.map((asset) => asset.url)).toContain('https://github.com/anthropics')
    expect(assets.map((asset) => asset.url)).toContain('https://www.youtube.com/@anthropic-ai')
    expect(assets.map((asset) => asset.url)).toContain('https://www.youtube.com/watch?v=ysPbXH0LpIE')
    expect(assets.find((asset) => asset.url === 'https://www.youtube.com/watch?v=ysPbXH0LpIE')?.thumbnailUrl).toContain('ytimg.com')
  })
})
