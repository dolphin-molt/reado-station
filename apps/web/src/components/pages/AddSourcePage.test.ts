import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { AddSourcePage } from './AddSourcePage'

vi.mock('@/components/layout/Header', () => ({
  Header: vi.fn(() => createElement('header', { className: 'test-header' })),
}))

vi.mock('@/components/layout/Footer', () => ({
  Footer: vi.fn(() => createElement('footer', { className: 'test-footer' })),
}))

describe('add source form controls', () => {
  it('renders source options with branded custom dropdowns instead of native selects', async () => {
    const element = await AddSourcePage({ lang: 'zh' })
    const html = renderToStaticMarkup(createElement(() => element))

    expect(html).toContain('auth-select')
    expect(html).toContain('data-name="visibility"')
    expect(html).toContain('data-name="backfillHours"')
    expect(html).toContain('name="visibility"')
    expect(html).toContain('name="backfillHours"')
    expect(html).not.toContain('<select')
  })

  it('makes X subscription exact-handle behavior explicit', async () => {
    const element = await AddSourcePage({ lang: 'zh', query: 'Anthropic', type: 'x' })
    const html = renderToStaticMarkup(createElement(() => element))

    expect(html).toContain('完整 @handle')
    expect(html).toContain('不会按前缀自动选择账号')
    expect(html).toContain('https://x.com/AnthropicAI')
  })
})
