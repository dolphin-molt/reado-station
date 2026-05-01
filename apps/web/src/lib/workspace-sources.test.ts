import { describe, expect, it } from 'vitest'

import { vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  ensureSourceCollectionJob: vi.fn(),
  getWorkspaceCreditBalance: vi.fn(),
  getWorkspaceSourceCount: vi.fn(),
  resolveXAccount: vi.fn(),
}))

vi.mock('server-only', () => ({}))
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

import { SubscribeWorkspaceSourceError, sourceErrorCode, subscribeWorkspaceSource } from './workspace-sources'

describe('workspace source subscription errors', () => {
  it('returns an explicit error code for ambiguous preset X names', () => {
    expect(sourceErrorCode(new SubscribeWorkspaceSourceError('ambiguous-handle', 'Choose the preset handle'))).toBe('ambiguous-handle')
  })

  it('blocks preset company names before subscribing the wrong exact handle', async () => {
    mocks.getWorkspaceCreditBalance.mockResolvedValue(10)
    mocks.getWorkspaceSourceCount.mockResolvedValue(0)
    mocks.ensureSourceCollectionJob.mockResolvedValue({ decision: { status: 'queued' }, job: { id: 'job-1' } })
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

    const db = {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
          run: async () => {},
        }),
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
    })).rejects.toMatchObject({ code: 'ambiguous-handle' })
    expect(mocks.resolveXAccount).not.toHaveBeenCalled()
  })
})
