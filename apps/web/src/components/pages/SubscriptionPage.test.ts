import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { SubscriptionPage } from './SubscriptionPage'

vi.mock('@/components/layout/Header', () => ({
  Header: vi.fn(() => createElement('header', { className: 'test-header' })),
}))

vi.mock('@/components/layout/Footer', () => ({
  Footer: vi.fn(() => createElement('footer', { className: 'test-footer' })),
}))

describe('subscription page', () => {
  it('uses the reader design language and only exposes public plans', async () => {
    const element = await SubscriptionPage({ lang: 'zh' })
    const html = renderToStaticMarkup(createElement(() => element))

    expect(html).toContain('class="page-shell reader-shell"')
    expect(html).toContain('subscription-station')
    expect(html).toContain('把每日阅读调到合适档位')
    expect(html).toContain('Free')
    expect(html).toContain('Pro')
    expect(html).toContain('Power')
    expect(html).toContain('Team')
    expect(html).not.toContain('测试支付')
    expect(html).not.toContain('Test payment')
    expect(html).not.toContain('Billing')
    expect(html).not.toContain('继续添加信息源')
    expect(html).not.toContain('href="/sources/new"')
  })
})
