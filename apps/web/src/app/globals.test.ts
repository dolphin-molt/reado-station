import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'apps/web/src/app/globals.css'), 'utf8')

function ruleBody(selector: string) {
  const start = css.indexOf(`${selector} {`)
  expect(start).toBeGreaterThanOrEqual(0)
  const end = css.indexOf('}', start)
  expect(end).toBeGreaterThan(start)
  return css.slice(start, end)
}

describe('global form control styling', () => {
  it('uses a custom select treatment across reader and admin forms', () => {
    expect(css).toContain('.auth-field select,')
    expect(css).toContain('.admin-filters select')
    expect(css).toContain('appearance: none')
    expect(css).toContain("url(\"data:image/svg+xml")
    expect(css).toContain('background-position: right 0.95rem center')
    expect(css).toContain('padding-right: 2.65rem')
  })

  it('keeps branded select values legible inside the dark source intake form', () => {
    expect(css).toContain('.reader-shell .source-intake .auth-field .auth-select__button span')
    expect(css).toContain('color: #1f1d19')
  })

  it('allows branded select menus to extend beyond the source intake panel', () => {
    expect(ruleBody('.reader-shell .source-intake__panel')).toContain('overflow: visible;')
  })

  it('places the collapsed account menu above the avatar without sidebar clipping', () => {
    expect(ruleBody('.page-shell:has(.sidebar-toggle:checked) .app-sidebar')).toContain('overflow: visible;')
    expect(ruleBody('.page-shell:has(.sidebar-toggle:checked) .sidebar-main')).toContain('overflow: hidden;')
    expect(ruleBody('.page-shell:has(.sidebar-toggle:checked) .sidebar-account__menu')).toContain(
      'bottom: calc(100% + 0.65rem);',
    )
    expect(ruleBody('.page-shell:has(.sidebar-toggle:checked) .sidebar-account__menu')).toContain('left: 0;')
  })
})
