import { describe, expect, it } from 'vitest'

import {
  DEFAULT_X_COLLECTION_PREFERENCES,
  classifyXTweetContentType,
  normalizeXCollectionPreferences,
  xContentTypeAllowedByPreferences,
  xAllowedContentTypes,
} from './x-content-preferences'

describe('X collection preferences', () => {
  it('defaults to original posts, threads, longform posts, and media posts', () => {
    expect(DEFAULT_X_COLLECTION_PREFERENCES).toEqual({
      includeOriginalPosts: true,
      includeThreads: true,
      includeLongformPosts: true,
      includeReplies: false,
      includeReposts: false,
      includeQuotes: false,
      includeMediaPosts: true,
    })
    expect(xAllowedContentTypes(DEFAULT_X_COLLECTION_PREFERENCES)).toEqual([
      'original_post',
      'thread',
      'longform_post',
      'media_post',
    ])
  })

  it('normalizes form-style preference values', () => {
    expect(normalizeXCollectionPreferences({
      includeOriginalPosts: 'true',
      includeThreads: '1',
      includeLongformPosts: 'false',
      includeReplies: 'on',
      includeReposts: 'false',
      includeQuotes: '0',
      includeMediaPosts: 'off',
    })).toEqual({
      includeOriginalPosts: true,
      includeThreads: true,
      includeLongformPosts: false,
      includeReplies: true,
      includeReposts: false,
      includeQuotes: false,
      includeMediaPosts: false,
    })
  })

  it('checks whether a stored item content type is visible for a subscription', () => {
    const preferences = normalizeXCollectionPreferences({
      includeOriginalPosts: true,
      includeThreads: true,
      includeLongformPosts: true,
      includeReplies: true,
      includeReposts: false,
      includeQuotes: false,
      includeMediaPosts: true,
    })

    expect(xContentTypeAllowedByPreferences('reply', preferences)).toBe(true)
    expect(xContentTypeAllowedByPreferences('quote', preferences)).toBe(false)
    expect(xContentTypeAllowedByPreferences('thread_part', preferences)).toBe(true)
  })
})

describe('X tweet content type classification', () => {
  it('classifies referenced tweets before original tweet variants', () => {
    expect(classifyXTweetContentType({ id: '1', referenced_tweets: [{ type: 'replied_to', id: '0' }] }, 'u1')).toBe('reply')
    expect(classifyXTweetContentType({ id: '1', referenced_tweets: [{ type: 'retweeted', id: '0' }] }, 'u1')).toBe('repost')
    expect(classifyXTweetContentType({ id: '1', referenced_tweets: [{ type: 'quoted', id: '0' }] }, 'u1')).toBe('quote')
  })

  it('classifies same-author conversation continuations as threads', () => {
    expect(classifyXTweetContentType({ id: '2', conversation_id: '1', author_id: 'u1' }, 'u1')).toBe('thread')
  })

  it('classifies longform and original media posts', () => {
    expect(classifyXTweetContentType({ id: '1', note_tweet: { text: 'long text' } }, 'u1')).toBe('longform_post')
    expect(classifyXTweetContentType({ id: '1', attachments: { media_keys: ['m1'] } }, 'u1')).toBe('media_post')
    expect(classifyXTweetContentType({ id: '1', text: 'plain update' }, 'u1')).toBe('original_post')
  })
})
