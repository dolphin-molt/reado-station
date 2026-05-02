import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { generateLatestDigest, normalizeDigestGenerationInput } from './digest-generator'

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

  it('records execution logs when digest generation has no input items', async () => {
    const writes: Array<{ sql: string; bindings: unknown[] }> = []
    const db = {
      prepare: (sql: string) => ({
        bind: (...bindings: unknown[]) => {
          writes.push({ sql, bindings })
          return {
            first: async () => null,
            run: async () => {},
          }
        },
      }),
    } as unknown as D1Database

    await expect(generateLatestDigest(db, {} as CloudflareEnv, { workspaceId: 'workspace-1' })).resolves.toEqual({
      reason: 'no items',
      status: 'skipped',
    })
    expect(writes.some((statement) => statement.sql.includes('INSERT INTO execution_logs') && statement.bindings.includes('digest'))).toBe(true)
  })
})
