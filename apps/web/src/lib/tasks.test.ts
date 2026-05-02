import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { loadWorkspaceTasks } from './tasks'

describe('workspace tasks', () => {
  it('loads active collection, enrichment, and radio jobs for a workspace', async () => {
    const queries: string[] = []
    const db = {
      prepare: (sql: string) => ({
        bind: (..._bindings: unknown[]) => ({
          all: async () => {
            queries.push(sql)
            if (sql.includes('FROM source_collection_jobs')) {
              return {
                results: [{
                  createdAt: '2026-05-02T10:00:00.000Z',
                  id: 'collect-1',
                  sourceId: 'tw-elonmusk',
                  sourceName: '@elonmusk (X)',
                  sourceType: 'x',
                  startedAt: null,
                  status: 'queued',
                  updatedAt: '2026-05-02T10:00:00.000Z',
                  windowEnd: '2026-05-02T10:00:00.000Z',
                  windowStart: '2026-05-01T10:00:00.000Z',
                }],
              }
            }
            if (sql.includes('FROM enrichment_jobs')) {
              return {
                results: [{
                  createdAt: '2026-05-02T10:01:00.000Z',
                  id: 'profile-1',
                  jobType: 'discover_profile_assets',
                  sourceType: 'x',
                  sourceValue: 'elonmusk',
                  startedAt: '2026-05-02T10:02:00.000Z',
                  status: 'running',
                  updatedAt: '2026-05-02T10:02:00.000Z',
                }],
              }
            }
            if (sql.includes('FROM radio_episodes')) {
              return {
                results: [{
                  createdAt: '2026-05-02T10:03:00.000Z',
                  date: '2026-05-02',
                  id: 'radio-1',
                  startedAt: null,
                  status: 'queued',
                  title: '今日电台',
                  updatedAt: '2026-05-02T10:03:00.000Z',
                }],
              }
            }
            return { results: [] }
          },
        }),
      }),
    } as unknown as D1Database

    await expect(loadWorkspaceTasks(db, 'workspace-1')).resolves.toEqual([
      expect.objectContaining({ id: 'radio-1', kind: 'radio', status: 'queued', title: '今日电台' }),
      expect.objectContaining({ id: 'profile-1', kind: 'profile-enrichment', status: 'running', subject: '@elonmusk' }),
      expect.objectContaining({ id: 'collect-1', kind: 'source-collection', status: 'queued', subject: '@elonmusk (X)' }),
    ])
    expect(queries.join('\n')).toContain('workspace_source_subscriptions')
  })
})
