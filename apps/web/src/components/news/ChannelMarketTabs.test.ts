import { describe, expect, it } from 'vitest'

import { selectActiveMarketSection } from './ChannelMarketTabs'

describe('channel market source tabs', () => {
  it('selects the section currently crossing the sticky tab threshold', () => {
    const sections = [
      { bottom: -24, id: 'ai-x-channels', top: -360 },
      { bottom: 620, id: 'ai-rss-official', top: 88 },
      { bottom: 1160, id: 'ai-research-papers', top: 704 },
    ]

    expect(selectActiveMarketSection(sections, 112)).toBe('ai-rss-official')
  })
})
