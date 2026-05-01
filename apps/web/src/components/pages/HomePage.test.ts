import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HomePage } from './HomePage'

const mocks = vi.hoisted(() => ({
  getCurrentAuthSession: vi.fn(),
  getD1Binding: vi.fn(),
  getDefaultWorkspaceForUser: vi.fn(),
  getHomePageData: vi.fn(),
  getWorkspaceSourceCount: vi.fn(),
  loadWorkspaceSources: vi.fn(),
}))

vi.mock('@/components/layout/Header', () => ({
  Header: vi.fn(() => createElement('header', { className: 'test-header' })),
}))

vi.mock('@/components/layout/Footer', () => ({
  Footer: vi.fn(() => createElement('footer', { className: 'test-footer' })),
}))

vi.mock('@/components/pages/XReaderPage', () => ({
  XReaderPage: vi.fn(() => createElement('main', { className: 'test-x-reader' })),
}))

vi.mock('@/lib/auth', () => ({
  getCurrentAuthSession: mocks.getCurrentAuthSession,
}))

vi.mock('@/lib/cloudflare', () => ({
  getD1Binding: mocks.getD1Binding,
}))

vi.mock('@/lib/workspaces', () => ({
  getDefaultWorkspaceForUser: mocks.getDefaultWorkspaceForUser,
  getWorkspaceSourceCount: mocks.getWorkspaceSourceCount,
}))

vi.mock('@/lib/radio', () => ({
  loadRadioEpisode: vi.fn(async () => null),
}))

vi.mock('@/lib/content', () => ({
  getLegacyAssetPath: vi.fn((assetPath?: string) => assetPath ?? null),
  getHomePageData: mocks.getHomePageData,
}))

vi.mock('@/lib/my-sources', () => ({
  loadWorkspaceSources: mocks.loadWorkspaceSources,
  sourceDisplayUrl: vi.fn((source: { url: string; sourceId: string }) => source.url || source.sourceId),
}))

describe('logged-in reader home', () => {
  beforeEach(() => {
    mocks.getCurrentAuthSession.mockResolvedValue(null)
    mocks.getD1Binding.mockResolvedValue(null)
    mocks.getDefaultWorkspaceForUser.mockResolvedValue({ id: 'workspace-1' })
    mocks.getWorkspaceSourceCount.mockResolvedValue(0)
    mocks.loadWorkspaceSources.mockResolvedValue([])
    mocks.getHomePageData.mockResolvedValue({
    activeCategory: null,
    categories: [{ id: 'ai-company', count: 2 }],
    date: '2026-04-29',
    items: [],
    keyStories: [
      {
        cluster: 'AI',
        impact: 'A focused update for people tracking model and agent workflows.',
        sources: [{ name: 'OpenAI', url: 'https://example.com/openai' }],
        summary: 'A model workflow update shipped.',
        title: 'OpenAI ships a coding workflow update',
      },
    ],
    observationText: 'The signal is sharper today: product teams are tuning fewer sources into clearer decisions.',
    pagination: {
      currentPage: 1,
      pageSize: 48,
      totalItems: 0,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    },
    sourceCount: 4,
    totalItems: 12,
    })
  })

  it('renders the daily brief as a branded signal desk rather than generic stacked cards', async () => {
    const element = await HomePage({ lang: 'zh' })
    const html = renderToStaticMarkup(createElement(() => element))

    expect(html).toContain('reader-brief-desk')
    expect(html).toContain('reader-signal-note')
    expect(html).toContain('reader-signal-list')
    expect(html).toContain('今日简报')
    expect(html).toContain('OpenAI ships a coding workflow update')
    expect(html).not.toContain('channel-market')
    expect(html).not.toContain('section-stack')
  })

  it('keeps subscribed sources visible on all content when they have no collected items yet', async () => {
    mocks.getCurrentAuthSession.mockResolvedValue({ role: 'user', userId: 'user-1', username: 'testuser' })
    mocks.getD1Binding.mockResolvedValue({})
    mocks.loadWorkspaceSources.mockResolvedValue([
      {
        backfillHours: 24,
        createdAt: '2026-05-01T16:00:51.654Z',
        itemCount: 0,
        latestCollectedAt: null,
        name: 'OpenAI',
        sourceId: 'tw-openai',
        sourceType: 'x',
        status: 'missing',
        url: 'https://x.com/OpenAI',
        visibility: 'private',
      },
    ])
    mocks.getHomePageData.mockResolvedValue({
      activeCategory: 'all',
      categories: [{ id: 'rss', count: 1 }, { id: 'twitter', count: 1 }],
      date: '2026-04-30',
      items: [
        {
          batch: 'latest',
          category: 'rss',
          date: '2026-04-30',
          id: 'rss-1',
          imageUrl: '/placeholders/rss.svg',
          publishedAt: '2026-04-30T10:00:00.000Z',
          source: 'rss-gwptt5',
          sourceName: 'federalreserve.gov',
          summary: 'RSS update',
          title: 'RSS update',
          url: 'https://example.com/rss',
        },
      ],
      keyStories: [],
      observationText: '',
      pagination: {
        currentPage: 1,
        pageSize: 48,
        totalItems: 1,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      },
      sourceCount: 1,
      totalItems: 1,
    })

    const element = await HomePage({ category: 'all', lang: 'zh' })
    const html = renderToStaticMarkup(createElement(() => element))

    expect(html).toContain('等待采集的信息源')
    expect(html).toContain('OpenAI')
    expect(html).toContain('href="/sources/tw-openai"')
    expect(html).toContain('RSS update')
  })
})
