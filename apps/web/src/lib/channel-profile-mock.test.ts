import { describe, expect, it } from 'vitest'

import { loadChannelProfileMock } from './channel-profile-mock'

describe('channel profile mock data', () => {
  it('loads the stored X account and one pinned tweet for a market channel', async () => {
    const mock = await loadChannelProfileMock('x-karpathy')

    expect(mock?.id).toBe('x-karpathy')
    expect(mock?.account?.username).toBe('karpathy')
    expect(mock?.account?.name).toBe('Andrej Karpathy')
    expect(mock?.request?.endpoint).toBe('GET /2/users/by/username/karpathy')
    expect(mock?.request?.expansions).toContain('pinned_tweet_id')
    expect(mock?.posts).toHaveLength(1)
    expect(mock?.posts[0]?.text).toBe('The hottest new programming language is English')
    expect(mock?.extensions?.website?.[0]?.url).toBe('https://karpathy.ai')
    expect(mock?.extensions?.github?.some((item) => item.url === 'https://github.com/karpathy/nanoGPT')).toBe(true)
    expect(mock?.extensions?.github?.find((item) => item.title === 'nanoGPT')?.stars).toBe('57.4k')
    expect(mock?.extensions?.github?.find((item) => item.title === 'micrograd')?.language).toBe('Jupyter Notebook')
    expect(mock?.extensions?.videos?.some((item) => item.url.includes('youtube.com'))).toBe(true)
    expect(mock?.extensions?.videos?.[0]?.kind).toBe('channel')
    expect(mock?.extensions?.videos?.some((item) => item.kind === 'video' && item.thumbnailUrl?.includes('ytimg.com'))).toBe(true)
    expect(mock?.extensions?.videos?.some((item) => item.kind === 'channel' && item.url.includes('@AndrejKarpathy'))).toBe(true)
  })
})
