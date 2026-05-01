import { describe, expect, it } from 'vitest'

import { subscribeMarketChannelBatch } from './channel-subscription-batch'

describe('market channel batch subscription', () => {
  it('continues subscribing remaining channels after one channel fails', async () => {
    const attempts: string[] = []
    const result = await subscribeMarketChannelBatch(['x-karpathy', 'rss-fed-news'], async (channel) => {
      attempts.push(channel.id)
      if (channel.id === 'x-karpathy') throw new Error('missing-token')
    })

    expect(attempts).toEqual(['x-karpathy', 'rss-fed-news'])
    expect(result).toEqual({ added: 1, failed: 1, firstError: 'missing-token' })
  })
})
