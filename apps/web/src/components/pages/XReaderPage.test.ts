import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { XReaderPage } from './XReaderPage'

vi.mock('@/components/news/NewsCard', () => ({
  NewsCard: vi.fn(({ item }) => createElement('article', null, item.title)),
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
      },
    ],
  })),
}))

describe('XReaderPage', () => {
  it('renders a direct source detail link without explanatory copy', async () => {
    const element = await XReaderPage({ lang: 'zh' })
    const html = renderToStaticMarkup(createElement(() => element))

    expect(html).toContain('href="/sources/tw-openai"')
    expect(html).toContain('详情')
    expect(html).not.toContain('按来源阅读更新')
    expect(html).not.toContain('选择你订阅的账号')
    expect(html).not.toContain('订阅账号')
  })
})
