export type XContentType =
  | 'original_post'
  | 'thread'
  | 'thread_part'
  | 'longform_post'
  | 'quote'
  | 'reply'
  | 'repost'
  | 'media_post'

export interface XCollectionPreferences {
  includeOriginalPosts: boolean
  includeThreads: boolean
  includeLongformPosts: boolean
  includeReplies: boolean
  includeReposts: boolean
  includeQuotes: boolean
  includeMediaPosts: boolean
}

export interface XTweetForClassification {
  id: string
  text?: string
  author_id?: string
  conversation_id?: string
  referenced_tweets?: Array<{ type?: string; id?: string }>
  note_tweet?: unknown
  attachments?: { media_keys?: string[] }
  entities?: { media?: unknown[] }
}

export const DEFAULT_X_COLLECTION_PREFERENCES: XCollectionPreferences = {
  includeOriginalPosts: true,
  includeThreads: true,
  includeLongformPosts: true,
  includeReplies: false,
  includeReposts: false,
  includeQuotes: false,
  includeMediaPosts: true,
}

function booleanPreference(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return fallback
}

export function normalizeXCollectionPreferences(value: unknown): XCollectionPreferences {
  const record = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
  return {
    includeOriginalPosts: booleanPreference(record.includeOriginalPosts, DEFAULT_X_COLLECTION_PREFERENCES.includeOriginalPosts),
    includeThreads: booleanPreference(record.includeThreads, DEFAULT_X_COLLECTION_PREFERENCES.includeThreads),
    includeLongformPosts: booleanPreference(record.includeLongformPosts, DEFAULT_X_COLLECTION_PREFERENCES.includeLongformPosts),
    includeReplies: booleanPreference(record.includeReplies, DEFAULT_X_COLLECTION_PREFERENCES.includeReplies),
    includeReposts: booleanPreference(record.includeReposts, DEFAULT_X_COLLECTION_PREFERENCES.includeReposts),
    includeQuotes: booleanPreference(record.includeQuotes, DEFAULT_X_COLLECTION_PREFERENCES.includeQuotes),
    includeMediaPosts: booleanPreference(record.includeMediaPosts, DEFAULT_X_COLLECTION_PREFERENCES.includeMediaPosts),
  }
}

export function xAllowedContentTypes(preferences: XCollectionPreferences): XContentType[] {
  const types: XContentType[] = []
  if (preferences.includeOriginalPosts) types.push('original_post')
  if (preferences.includeThreads) types.push('thread')
  if (preferences.includeLongformPosts) types.push('longform_post')
  if (preferences.includeReplies) types.push('reply')
  if (preferences.includeReposts) types.push('repost')
  if (preferences.includeQuotes) types.push('quote')
  if (preferences.includeMediaPosts) types.push('media_post')
  return types
}

export function xContentTypeAllowedByPreferences(contentType: XContentType | string, preferences: XCollectionPreferences): boolean {
  if (contentType === 'original_post') return preferences.includeOriginalPosts
  if (contentType === 'thread' || contentType === 'thread_part') return preferences.includeThreads
  if (contentType === 'longform_post') return preferences.includeLongformPosts
  if (contentType === 'reply') return preferences.includeReplies
  if (contentType === 'repost') return preferences.includeReposts
  if (contentType === 'quote') return preferences.includeQuotes
  if (contentType === 'media_post') return preferences.includeMediaPosts
  return preferences.includeOriginalPosts
}

export function classifyXTweetContentType(tweet: XTweetForClassification, accountAuthorId: string): XContentType {
  const referenceType = tweet.referenced_tweets?.[0]?.type
  if (referenceType === 'replied_to') return 'reply'
  if (referenceType === 'retweeted') return 'repost'
  if (referenceType === 'quoted') return 'quote'

  if (tweet.conversation_id && tweet.conversation_id !== tweet.id && tweet.author_id === accountAuthorId) {
    return 'thread'
  }

  if (tweet.note_tweet || (tweet.text?.length ?? 0) > 280) return 'longform_post'

  const hasMedia = (tweet.attachments?.media_keys?.length ?? 0) > 0 || (tweet.entities?.media?.length ?? 0) > 0
  if (hasMedia) return 'media_post'

  return 'original_post'
}
