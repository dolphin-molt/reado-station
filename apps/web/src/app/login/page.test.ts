import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import LoginPage from './page'

vi.mock('@/lib/auth', () => ({
  getCurrentAuthSession: vi.fn(async () => null),
  safeNextPathForRole: vi.fn((nextPath: string) => nextPath),
}))

describe('login page brand experience', () => {
  it('renders as a private signal station instead of an admin console', async () => {
    const element = await LoginPage({ searchParams: Promise.resolve({}) })
    const html = renderToStaticMarkup(createElement(() => element))

    expect(html).toContain('auth-page--signal')
    expect(html).toContain('auth-brand-strip')
    expect(html).toContain('aria-label="回到你的每日简报"')
    expect(html).not.toContain('调准你的私人信号')
    expect(html).not.toContain('auth-radio-console')
    expect(html).not.toContain('auth-brief-receipt')
    expect(html).not.toContain('auth-station-note')
    expect(html).not.toContain('管理员')
    expect(html).not.toContain('控制台')
    expect(html).not.toContain('value="admin"')
  })
})
