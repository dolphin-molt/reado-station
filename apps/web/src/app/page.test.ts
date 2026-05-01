import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import LandingPage from './page'

describe('landing page chrome', () => {
  it('keeps sign in as the only top-right navigation action', () => {
    const html = renderToStaticMarkup(createElement(LandingPage))

    expect(html).toContain('class="landing-nav__signin"')
    expect(html).toContain('class="landing-nav__signin" href="/login?next=/today"')
    expect(html).not.toContain('class="landing-nav__cta"')
    expect(html).toContain('class="landing-button landing-button--primary"')
  })
})
