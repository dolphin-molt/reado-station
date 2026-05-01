import { describe, expect, it } from 'vitest'

import { estimateMiniMaxTtsCredits, estimateSourceCollectionCredits } from './usage-metering'

describe('usage metering', () => {
  it('estimates MiniMax TTS credits from model character cost', () => {
    expect(estimateMiniMaxTtsCredits('a'.repeat(10_000), 'speech-2.8-turbo')).toBe(60)
    expect(estimateMiniMaxTtsCredits('a'.repeat(10_000), 'speech-2.8-hd')).toBe(100)
  })

  it('keeps RSS free in v1 while X collection remains metered', () => {
    expect(estimateSourceCollectionCredits('rss', 100)).toBe(0)
    expect(estimateSourceCollectionCredits('x-api', 3)).toBe(3)
  })
})
