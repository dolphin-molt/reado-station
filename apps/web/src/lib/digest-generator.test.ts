import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { normalizeDigestGenerationInput } from './digest-generator'

describe('digest generation input', () => {
  it('normalizes daily and hourly scopes with allowed content types', () => {
    expect(normalizeDigestGenerationInput({
      workspaceId: 'ws-1',
      scope: 'hourly',
      windowStart: '2026-05-01T08:00:00.000Z',
      windowEnd: '2026-05-01T12:00:00.000Z',
      allowedContentTypes: ['original_post', 'reply', 'reply', 'bad'],
    })).toEqual({
      workspaceId: 'ws-1',
      scope: 'hourly',
      windowStart: '2026-05-01T08:00:00.000Z',
      windowEnd: '2026-05-01T12:00:00.000Z',
      allowedContentTypes: ['original_post', 'reply'],
    })
  })
})
