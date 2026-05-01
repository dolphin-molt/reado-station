import { describe, expect, it } from 'vitest'

import { expandChannelSelection } from './channel-catalog'

describe('channel catalog selection expansion', () => {
  it('expands selected channel packs into concrete channel ids', () => {
    expect(expandChannelSelection([], ['finance-macro-starter'])).toEqual([
      'rss-fed-news',
      'rss-sec-press',
      'rss-financial-times',
    ])
  })

  it('deduplicates channels selected individually and through a pack', () => {
    expect(expandChannelSelection(['rss-fed-news'], ['finance-macro-starter'])).toEqual([
      'rss-fed-news',
      'rss-sec-press',
      'rss-financial-times',
    ])
  })
})
