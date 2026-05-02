import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { XReaderPage } from './XReaderPage'

vi.mock('@/components/news/NewsCard', () => ({
  NewsCard: vi.fn(({ item }) => createElement('article', null, item.title)),
}))

vi.mock('@/components/ui/ProcessingQueueAutoRefresh', () => ({
  ProcessingQueueAutoRefresh: vi.fn(() => null),
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

vi.mock('@/lib/x-accounts', () => ({
  loadWorkspaceXReaderData: vi.fn(async () => ({
    activeAccount: {
      account: {
        id: 'x-1',
        username: 'OpenAI',
        name: 'OpenAI',
        description: 'AI research and products.',
        profileImageUrl: '',
        verified: true,
        followersCount: 100,
      },
      itemCount: 0,
      status: 'ready',
    },
    items: [],
    subscriptions: [
      {
        account: {
          id: 'x-1',
          username: 'OpenAI',
          name: 'OpenAI',
          profileImageUrl: '',
        },
        itemCount: 0,
        status: 'ready',
      },
      {
        account: {
          id: 'x-2',
          username: 'elonmusk',
          name: 'Elon Musk',
          profileImageUrl: '',
        },
        itemCount: 0,
        status: 'queued',
      },
    ],
  })),
}))

describe('XReaderPage', () => {
  it('uses the account card for details and the handle for X profile navigation', async () => {
    const element = await XReaderPage({ lang: 'zh' })
    const html = renderToStaticMarkup(createElement(() => element))

    expect(html).toContain('class="x-reader__account-main" href="/sources/tw-openai"')
    expect(html).toContain('处理队列')
    expect(html).toContain('Elon Musk')
    expect(html).not.toContain('class="x-reader__account-main" href="/sources/tw-elonmusk"')
    expect(html).toContain('href="https://x.com/OpenAI"')
    expect(html).not.toContain('详情')
    expect(html).not.toContain('X 主页')
    expect(html).not.toContain('按来源阅读更新')
    expect(html).not.toContain('选择你订阅的账号')
    expect(html).not.toContain('订阅账号')
  })

  it('shows subscription result feedback as a toast instead of inline content', async () => {
    const element = await XReaderPage({ account: 'elonmusk', lang: 'zh', subscribed: true })
    const html = renderToStaticMarkup(createElement(() => element))

    expect(html).toContain('已加入处理队列：@elonmusk')
    expect(html).toContain('class="app-toast"')
    expect(html).toContain('role="status"')
    expect(html).not.toContain('source-intake__notice')
  })
})
