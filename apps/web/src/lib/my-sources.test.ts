import { describe, expect, it } from 'vitest'

import { vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { describeCollectionPreferences } from './my-sources'

describe('my sources detail helpers', () => {
  it('describes X collection preferences without exposing internal providers', () => {
    expect(describeCollectionPreferences({
      includeOriginalPosts: true,
      includeThreads: true,
      includeLongformPosts: true,
      includeReplies: false,
      includeReposts: false,
      includeQuotes: true,
      includeMediaPosts: true,
    }, 'zh')).toEqual(['原创', 'Thread', '长文', '引用', '媒体帖'])
  })
})
