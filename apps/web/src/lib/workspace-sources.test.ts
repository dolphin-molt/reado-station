import { describe, expect, it } from 'vitest'

import { vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  enqueueProfileEnrichmentJob: vi.fn(),
  ensureSourceCollectionJob: vi.fn(),
  getWorkspaceCreditBalance: vi.fn(),
  getWorkspaceSourceCount: vi.fn(),
  resolveXAccount: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/source-enrichment', () => ({
  enqueueProfileEnrichmentJob: mocks.enqueueProfileEnrichmentJob,
}))
vi.mock('@/lib/source-collections', () => ({
  collectionWindowForHours: vi.fn(() => ({ windowEnd: '2026-05-02T00:00:00.000Z', windowStart: '2026-05-01T00:00:00.000Z' })),
  ensureSourceCollectionJob: mocks.ensureSourceCollectionJob,
}))
vi.mock('@/lib/workspaces', () => ({
  getWorkspaceCreditBalance: mocks.getWorkspaceCreditBalance,
  getWorkspaceSourceCount: mocks.getWorkspaceSourceCount,
}))
vi.mock('@/lib/x-accounts', async () => {
  const actual = await vi.importActual<typeof import('./x-accounts')>('./x-accounts')
  return {
    ...actual,
    resolveXAccount: mocks.resolveXAccount,
  }
})

import { SubscribeWorkspaceSourceError, shouldRunSourceCollectionAfterSubscribe, sourceErrorCode, subscribeWorkspaceSource } from './workspace-sources'

describe('workspace source subscription errors', () => {
  it('returns explicit subscription error codes', () => {
    expect(sourceErrorCode(new SubscribeWorkspaceSourceError('limit-sources', 'Plan limit'))).toBe('limit-sources')
  })

  it('runs the source queue after non-ready subscription states', () => {
    expect(shouldRunSourceCollectionAfterSubscribe('ready')).toBe(false)
    expect(shouldRunSourceCollectionAfterSubscribe('queued')).toBe(true)
    expect(shouldRunSourceCollectionAfterSubscribe('running')).toBe(true)
    expect(shouldRunSourceCollectionAfterSubscribe('missing')).toBe(true)
  })

  it('subscribes exact X handles and enqueues profile enrichment', async () => {
    mocks.getWorkspaceCreditBalance.mockResolvedValue(10)
    mocks.getWorkspaceSourceCount.mockResolvedValue(0)
    mocks.ensureSourceCollectionJob.mockResolvedValue({ decision: { status: 'queued' }, job: { id: 'job-1' } })
    mocks.enqueueProfileEnrichmentJob.mockResolvedValue({ id: 'enrich-1', status: 'queued' })
    mocks.resolveXAccount.mockResolvedValue({
      description: '',
      fetchedAt: '2026-05-02T00:00:00.000Z',
      followersCount: 4416,
      followingCount: null,
      id: 'x-anthropic-person',
      listedCount: null,
      name: 'Paul Jankura',
      profileImageUrl: '',
      tweetCount: 0,
      username: 'Anthropic',
      verified: false,
    })

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
      batch: async () => {},
    } as unknown as D1Database

    await expect(subscribeWorkspaceSource(db, {
      backfillHours: 24,
      type: 'x',
      userId: 'user-1',
      value: 'Anthropic',
      workspace: {
        createdAt: '2026-05-02T00:00:00.000Z',
        id: 'workspace-1',
        name: 'Workspace',
        ownerUserId: 'user-1',
        planId: 'free',
        slug: 'workspace',
        type: 'personal',
        updatedAt: '2026-05-02T00:00:00.000Z',
      },
    })).resolves.toMatchObject({
      profileEnrichmentJobId: 'enrich-1',
      profileEnrichmentStatus: 'queued',
      sourceId: 'tw-anthropic',
    })
    expect(mocks.resolveXAccount).toHaveBeenCalledWith(db, 'Anthropic')
    expect(mocks.enqueueProfileEnrichmentJob).toHaveBeenCalledWith(db, {
      jobType: 'discover_profile_assets',
      sourceType: 'x',
      sourceValue: 'Anthropic',
    })
    expect(writes.some((statement) => statement.sql.includes('INSERT INTO execution_logs') && statement.bindings.includes('subscription'))).toBe(true)
  })
})
