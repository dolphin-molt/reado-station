import { describe, expect, it } from 'vitest'

import { vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { describeCollectionPreferences } from './my-sources'
import { unsubscribeWorkspaceSource } from './workspace-sources'

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

describe('workspace source unsubscribe', () => {
  it('removes only subscription rows and leaves public source pool untouched', async () => {
    const statements: Array<{ sql: string; bindings: unknown[] }> = []
    const db = {
      prepare: (sql: string) => ({
        bind: (...bindings: unknown[]) => {
          statements.push({ sql, bindings })
          return {}
        },
      }),
      batch: async () => {},
    } as unknown as D1Database

    await unsubscribeWorkspaceSource(db, {
      workspaceId: 'workspace-1',
      userId: 'user-1',
      sourceId: 'tw-openai',
    })

    expect(statements).toHaveLength(2)
    expect(statements[0].sql).toContain('DELETE FROM workspace_source_subscriptions')
    expect(statements[1].sql).toContain('DELETE FROM user_x_account_subscriptions')
    expect(statements.map((statement) => statement.sql).join('\n')).not.toContain('DELETE FROM sources')
    expect(statements.map((statement) => statement.sql).join('\n')).not.toContain('DELETE FROM x_accounts')
    expect(statements.map((statement) => statement.sql).join('\n')).not.toContain('DELETE FROM items')
  })
})
