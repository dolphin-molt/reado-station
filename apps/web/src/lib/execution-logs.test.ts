import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { listExecutionLogs, logExecutionStep, withExecutionStep } from './execution-logs'

describe('execution logs', () => {
  it('records started and completed entries for a wrapped step', async () => {
    const writes: Array<{ sql: string; bindings: unknown[] }> = []
    const db = {
      prepare: (sql: string) => ({
        bind: (...bindings: unknown[]) => {
          writes.push({ sql, bindings })
          return { run: async () => {} }
        },
      }),
    } as unknown as D1Database

    const result = await withExecutionStep(db, {
      runId: 'run-1',
      scope: 'source-collection',
      step: 'fetch_source',
      subjectId: 'tw-openai',
      subjectType: 'source',
    }, async () => 'ok')

    expect(result).toBe('ok')
    expect(writes).toHaveLength(2)
    expect(writes[0].sql).toContain('INSERT INTO execution_logs')
    expect(writes[0].bindings).toEqual(expect.arrayContaining(['run-1', 'source-collection', 'fetch_source', 'started']))
    expect(writes[1].bindings).toEqual(expect.arrayContaining(['run-1', 'source-collection', 'fetch_source', 'completed']))
    expect(writes[1].bindings.some((binding) => typeof binding === 'number')).toBe(true)
  })

  it('records failed entries and rethrows wrapped errors', async () => {
    const writes: Array<{ bindings: unknown[] }> = []
    const db = {
      prepare: () => ({
        bind: (...bindings: unknown[]) => {
          writes.push({ bindings })
          return { run: async () => {} }
        },
      }),
    } as unknown as D1Database

    await expect(withExecutionStep(db, {
      runId: 'run-2',
      scope: 'profile-enrichment',
      step: 'select_assets',
    }, async () => {
      throw new Error('model rejected assets')
    })).rejects.toThrow('model rejected assets')

    expect(writes).toHaveLength(2)
    expect(writes[1].bindings).toEqual(expect.arrayContaining(['failed', 'model rejected assets']))
  })

  it('lists recent entries and parses metadata safely', async () => {
    const calls: Array<{ sql: string; bindings: unknown[] }> = []
    const db = {
      prepare: (sql: string) => ({
        bind: (...bindings: unknown[]) => {
          calls.push({ sql, bindings })
          return {
            all: async () => ({
              results: [{
                createdAt: '2026-05-02T10:00:00.000Z',
                durationMs: 24,
                id: 'log-1',
                message: 'Collected 3 items',
                metadataJson: '{"itemCount":3}',
                runId: 'run-1',
                scope: 'source-collection',
                status: 'completed',
                step: 'persist_items',
                subjectId: 'tw-openai',
                subjectType: 'source',
              }],
            }),
          }
        },
      }),
    } as unknown as D1Database

    const logs = await listExecutionLogs(db, {
      limit: 50,
      runId: 'run-1',
      scope: 'source-collection',
      status: 'completed',
    })

    expect(logs).toEqual([expect.objectContaining({
      metadata: { itemCount: 3 },
      runId: 'run-1',
      status: 'completed',
      step: 'persist_items',
    })])
    expect(calls[0].sql).toContain('WHERE')
    expect(calls[0].bindings).toEqual(['run-1', 'source-collection', 'completed', 50])
  })

  it('does not break business flow when the logs table is missing', async () => {
    const db = {
      prepare: () => ({
        bind: () => ({
          run: async () => {
            throw new Error('no such table: execution_logs')
          },
        }),
      }),
    } as unknown as D1Database

    await expect(logExecutionStep(db, {
      runId: 'run-3',
      scope: 'subscription',
      status: 'started',
      step: 'start',
    })).resolves.toBeUndefined()
  })

  it('returns an empty list when the logs table is missing', async () => {
    const db = {
      prepare: () => ({
        bind: () => ({
          all: async () => {
            throw new Error('no such table: execution_logs')
          },
        }),
      }),
    } as unknown as D1Database

    await expect(listExecutionLogs(db)).resolves.toEqual([])
  })
})
