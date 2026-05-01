import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { HomePage } from './HomePage'

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
  getCurrentAuthSession: vi.fn(async () => null),
}))

vi.mock('@/lib/cloudflare', () => ({
  getD1Binding: vi.fn(async () => null),
}))

vi.mock('@/lib/workspaces', () => ({
  getDefaultWorkspaceForUser: vi.fn(),
  getWorkspaceSourceCount: vi.fn(async () => 0),
}))

vi.mock('@/lib/radio', () => ({
  loadRadioEpisode: vi.fn(async () => null),
}))

vi.mock('@/lib/content', () => ({
  getHomePageData: vi.fn(async () => ({
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
  })),
}))

describe('logged-in reader home', () => {
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
})
