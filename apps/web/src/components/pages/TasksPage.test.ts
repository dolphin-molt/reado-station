import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { TasksPage } from './TasksPage'

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
  getCurrentAuthSession: vi.fn(async () => ({ userId: 'user-1', username: 'testuser' })),
}))

vi.mock('@/lib/cloudflare', () => ({
  getD1Binding: vi.fn(async () => ({})),
}))

vi.mock('@/lib/workspaces', () => ({
  getDefaultWorkspaceForUser: vi.fn(async () => ({ id: 'workspace-1' })),
}))

vi.mock('@/lib/tasks', () => ({
  loadWorkspaceTasks: vi.fn(async () => [
    {
      createdAt: '2026-05-02T10:00:00.000Z',
      href: '/sources/tw-elonmusk',
      id: 'collect-1',
      kind: 'source-collection',
      status: 'running',
      subject: '@elonmusk (X)',
      title: '内容采集',
      updatedAt: '2026-05-02T10:01:00.000Z',
    },
  ]),
}))

describe('TasksPage', () => {
  it('shows active processing tasks for the current workspace', async () => {
    const element = await TasksPage({ lang: 'zh' })
    const html = renderToStaticMarkup(createElement(() => element))

    expect(html).toContain('任务')
    expect(html).toContain('内容采集')
    expect(html).toContain('@elonmusk (X)')
    expect(html).toContain('运行中')
    expect(html).toContain('href="/sources/tw-elonmusk"')
  })
})
