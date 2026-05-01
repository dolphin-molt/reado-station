import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { Footer } from './Footer'
import { Header } from './Header'

vi.mock('server-only', () => ({}))

vi.mock('@/components/news/SourceFilter', () => ({
  SourceFilter: vi.fn(() => createElement('nav', { className: 'test-source-filter' })),
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

describe('reader chrome navigation', () => {
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

  it('does not render the reader masthead on the channel discovery page', async () => {
    const element = await Header({ active: 'channels', lang: 'zh', path: 'channels', showSourceFilter: false })
    const html = renderToStaticMarkup(createElement(() => element))

    expect(html).not.toContain('Read Less')
    expect(html).not.toContain('Know More')
    expect(html).not.toContain('私人阅读台')
  })

  it('uses the landing contact form as the footer feedback destination', () => {
    const html = renderToStaticMarkup(createElement(Footer, { lang: 'zh' }))

    expect(html).toContain('href="/#apply"')
    expect(html).not.toContain('href="/about"')
  })
})
