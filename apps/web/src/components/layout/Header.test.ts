import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Footer } from './Footer'
import { Header } from './Header'
import { getD1Binding } from '@/lib/cloudflare'
import { loadWorkspaceTasks } from '@/lib/tasks'

vi.mock('server-only', () => ({}))

vi.mock('@/components/news/SourceFilter', () => ({
  SourceFilter: vi.fn(() => createElement('nav', { className: 'test-source-filter' })),
}))

vi.mock('@/components/ui/ProcessingQueueAutoRefresh', () => ({
  ProcessingQueueAutoRefresh: vi.fn(() => createElement('span', { 'data-testid': 'processing-queue-auto-refresh' })),
}))

vi.mock('@/lib/auth', () => ({
  getCurrentAuthSession: vi.fn(async () => ({ role: 'user', userId: 'user-1', username: 'testuser' })),
}))

vi.mock('@/lib/cloudflare', () => ({
  getD1Binding: vi.fn(async () => null),
}))

vi.mock('@/lib/content', () => ({
  getSidebarData: vi.fn(async () => null),
}))

vi.mock('@/lib/tasks', () => ({
  loadWorkspaceTasks: vi.fn(async () => []),
}))

vi.mock('@/lib/workspaces', () => ({
  getDefaultWorkspaceForUser: vi.fn(async () => ({ id: 'workspace-1', planId: 'free' })),
  getWorkspaceCreditBalance: vi.fn(async () => 0),
  getWorkspaceSourceCount: vi.fn(async () => 0),
}))

describe('reader chrome navigation', () => {
  afterEach(() => {
    vi.mocked(getD1Binding).mockResolvedValue(null)
    vi.mocked(loadWorkspaceTasks).mockResolvedValue([])
  })

  it('keeps account navigation focused on reader actions and feedback', async () => {
    const element = await Header({ active: 'home', lang: 'zh', path: 'today', showSourceFilter: false })
    const html = renderToStaticMarkup(createElement(() => element))

    expect(html).toContain('href="/subscription"')
    expect(html).toContain('href="/#apply"')
    expect(html).not.toContain('href="/archive"')
    expect(html).not.toContain('href="/about"')
  })

  it('renders a real home icon for the collapsed sidebar state', async () => {
    const element = await Header({ active: 'home', lang: 'zh', path: 'today', showSourceFilter: false })
    const html = renderToStaticMarkup(createElement(() => element))

    expect(html).toContain('class="sidebar-nav__icon"')
    expect(html).toContain('aria-label="首页"')
  })

  it('exposes channel discovery as a first-level sidebar destination', async () => {
    const element = await Header({ active: 'channels', lang: 'zh', path: 'channels', showSourceFilter: false })
    const html = renderToStaticMarkup(createElement(() => element))

    expect(html).toContain('href="/channels"')
    expect(html).toContain('aria-label="频道发现"')
    expect(html).toContain('data-active="true"')
  })

  it('exposes my sources as a first-level sidebar destination', async () => {
    const element = await Header({ active: 'source-add', lang: 'zh', path: 'sources', showSourceFilter: false })
    const html = renderToStaticMarkup(createElement(() => element))

    expect(html).toContain('href="/sources"')
    expect(html).toContain('aria-label="我的信息源"')
    expect(html).toContain('data-active="true"')
  })

  it('exposes running tasks as a floating button, not a sidebar tab', async () => {
    const element = await Header({ active: 'tasks', lang: 'zh', path: 'tasks', showSourceFilter: false })
    const html = renderToStaticMarkup(createElement(() => element))

    expect(html).toContain('class="task-floating"')
    expect(html).toContain('class="task-floating-trigger"')
    expect(html).toContain('type="button"')
    expect(html).toContain('aria-label="任务"')
    expect(html).toContain('进行中的任务')
    expect(html).not.toContain('href="/tasks"')
    expect(html).not.toContain('sidebar-nav__link--tasks')
  })

  it('refreshes reader chrome while active tasks are visible', async () => {
    vi.mocked(getD1Binding).mockResolvedValue({} as D1Database)
    vi.mocked(loadWorkspaceTasks).mockResolvedValue([{
      createdAt: '2026-05-02T10:00:00.000Z',
      href: '/sources/tw-elonmusk',
      id: 'profile-1',
      kind: 'profile-enrichment',
      queue: { name: 'enrichment_jobs', recordId: 'profile-1' },
      startedAt: '2026-05-02T10:00:01.000Z',
      status: 'running',
      subject: '@elonmusk',
      title: '主页补全',
      updatedAt: '2026-05-02T10:00:01.000Z',
    }])

    const element = await Header({ active: 'source-add', lang: 'zh', path: 'sources/tw-elonmusk', showSourceFilter: false })
    const html = renderToStaticMarkup(createElement(() => element))

    expect(html).toContain('主页补全')
    expect(html).toContain('data-testid="processing-queue-auto-refresh"')
  })

  it('does not render the reader masthead on the channel discovery page', async () => {
    const element = await Header({ active: 'channels', lang: 'zh', path: 'channels', showSourceFilter: false })
    const html = renderToStaticMarkup(createElement(() => element))

    expect(html).not.toContain('Read Less')
    expect(html).not.toContain('Know More')
    expect(html).not.toContain('私人阅读台')
  })

  it('can suppress the reader masthead for focused channel workspaces', async () => {
    const element = await Header({ active: 'home', activeCategory: 'twitter', lang: 'zh', path: 'today', showMasthead: false, showSourceFilter: false })
    const html = renderToStaticMarkup(createElement(() => element))

    expect(html).not.toContain('频道信号')
    expect(html).not.toContain('私人阅读台')
  })

  it('uses the landing contact form as the footer feedback destination', () => {
    const html = renderToStaticMarkup(createElement(Footer, { lang: 'zh' }))

    expect(html).toContain('href="/#apply"')
    expect(html).not.toContain('href="/about"')
  })
})
