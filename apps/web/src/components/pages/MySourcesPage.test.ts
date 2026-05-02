import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { MySourcesPage } from './MySourcesPage'

const mocks = vi.hoisted(() => ({
  getCurrentAuthSession: vi.fn(async () => ({ userId: 'user-1', username: 'testuser' })),
  getD1Binding: vi.fn(async () => ({})),
  getDefaultWorkspaceForUser: vi.fn(async () => ({ id: 'workspace-1' })),
  loadWorkspaceSources: vi.fn(async () => [
    {
      backfillHours: 24,
      createdAt: '2026-05-01T00:00:00.000Z',
      itemCount: 4,
      latestCollectedAt: '2026-05-01T01:00:00.000Z',
      name: 'OpenAI',
      sourceId: 'tw-openai',
      sourceType: 'x',
      status: 'ready',
      url: 'https://x.com/OpenAI',
      visibility: 'private',
    },
    {
      backfillHours: 24,
      createdAt: '2026-05-02T00:00:00.000Z',
      itemCount: 0,
      latestCollectedAt: null,
      name: '@elonmusk (X)',
      sourceId: 'tw-elonmusk',
      sourceType: 'x',
      status: 'queued',
      url: 'https://x.com/elonmusk',
      visibility: 'private',
    },
  ]),
}))

vi.mock('@/components/layout/Header', () => ({
  Header: vi.fn(() => createElement('header')),
}))

vi.mock('@/components/layout/Footer', () => ({
  Footer: vi.fn(() => createElement('footer')),
}))

vi.mock('@/components/ui/ProcessingQueueAutoRefresh', () => ({
  ProcessingQueueAutoRefresh: vi.fn(() => null),
}))

vi.mock('@/lib/auth', () => ({
  getCurrentAuthSession: mocks.getCurrentAuthSession,
}))

vi.mock('@/lib/cloudflare', () => ({
  getD1Binding: mocks.getD1Binding,
}))

vi.mock('@/lib/workspaces', () => ({
  getDefaultWorkspaceForUser: mocks.getDefaultWorkspaceForUser,
}))

vi.mock('@/lib/my-sources', () => ({
  loadWorkspaceSources: mocks.loadWorkspaceSources,
  sourceDisplayUrl: vi.fn((source: { url: string }) => source.url),
}))

describe('MySourcesPage', () => {
  it('keeps processing sources out of the ready source list', async () => {
    const element = await MySourcesPage({ lang: 'zh' })
    const html = renderToStaticMarkup(createElement(() => element))

    expect(html).toContain('处理队列')
    expect(html).toContain('@elonmusk (X)')
    expect(html).toContain('href="/sources/tw-openai"')
    expect(html).not.toContain('href="/sources/tw-elonmusk"')
  })
})
