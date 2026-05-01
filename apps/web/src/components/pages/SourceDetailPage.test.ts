import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { SourceDetailPage } from './SourceDetailPage'

vi.mock('@/components/layout/Header', () => ({
  Header: vi.fn(() => createElement('header')),
}))

vi.mock('@/components/layout/Footer', () => ({
  Footer: vi.fn(() => createElement('footer')),
}))

vi.mock('@/lib/auth', () => ({
  getCurrentAuthSession: vi.fn(async () => ({ userId: 'user-1', username: 'testuser' })),
}))

vi.mock('@/lib/cloudflare', () => ({
  getD1Binding: vi.fn(async () => ({})),
}))

vi.mock('@/lib/workspaces', () => ({
  getDefaultWorkspaceForUser: vi.fn(async () => ({ id: 'workspace-1' })),
}))

vi.mock('@/lib/my-sources', () => ({
  loadWorkspaceSourceDetail: vi.fn(async () => ({
    sourceId: 'tw-openai',
    sourceType: 'x',
    name: '@OpenAI (X)',
    url: 'https://x.com/OpenAI',
    status: 'missing',
    visibility: 'private',
    backfillHours: 24,
    createdAt: '2026-05-01T00:00:00.000Z',
    latestCollectedAt: null,
    itemCount: 0,
    collectionPreferences: {
      includeOriginalPosts: true,
      includeThreads: true,
      includeLongformPosts: true,
      includeReplies: false,
      includeReposts: false,
      includeQuotes: false,
      includeMediaPosts: true,
    },
    preferenceLabels: ['原创', 'Thread', '长文', '媒体帖'],
    latestWindowStart: null,
    latestWindowEnd: null,
    latestCollectionStatus: null,
    latestFailureReason: null,
    xAccount: {
      username: 'OpenAI',
      name: 'OpenAI',
      description: 'OpenAI mission text.',
      profileImageUrl: '',
      verified: true,
      followersCount: 100,
      tweetCount: 200,
    },
    recentItems: [],
  })),
  sourceDisplayUrl: vi.fn(() => 'https://x.com/OpenAI'),
}))

describe('SourceDetailPage', () => {
  it('renders X source details like an account profile, not an internal collection page', async () => {
    const element = await SourceDetailPage({ lang: 'zh', sourceId: 'tw-openai' })
    const html = renderToStaticMarkup(createElement(() => element))

    expect(html).toContain('OpenAI mission text.')
    expect(html).toContain('href="https://x.com/OpenAI"')
    expect(html).not.toContain('采集状态')
    expect(html).not.toContain('采集规则')
    expect(html).not.toContain('重新采集')
  })
})
