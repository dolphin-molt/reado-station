import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { sidebarDataHomeCategory } from './content'

describe('content sidebar loading', () => {
  it('uses all-category content when the sidebar has no active category', () => {
    expect(sidebarDataHomeCategory(null)).toBe('all')
  })

  it('preserves active category when loading sidebar data', () => {
    expect(sidebarDataHomeCategory('rss')).toBe('rss')
  })
})
