import { describe, expect, it, vi } from 'vitest'

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>()
  return {
    ...actual,
    after: vi.fn(),
  }
})

vi.mock('@/lib/auth', () => ({
  getCurrentAuthSession: vi.fn(async () => ({ userId: 'user-1', username: 'testuser' })),
}))

vi.mock('@/lib/cloudflare', () => ({
  getD1Binding: vi.fn(async () => ({
    prepare: vi.fn(() => ({
      bind: vi.fn(() => ({
        first: vi.fn(async () => ({ backfillHours: 24, sourceType: 'x' })),
      })),
    })),
  })),
}))

vi.mock('@/lib/workspaces', () => ({
  getDefaultWorkspaceForUser: vi.fn(async () => ({ id: 'workspace-1' })),
}))

vi.mock('@/lib/source-collections', () => ({
  collectionWindowForHours: vi.fn(() => ({
    windowEnd: '2026-05-02T00:00:00.000Z',
    windowStart: '2026-05-01T00:00:00.000Z',
  })),
  ensureSourceCollectionJob: vi.fn(async () => ({ job: { status: 'queued' } })),
  findActiveSourceCollectionJobForSource: vi.fn(async () => null),
}))

vi.mock('@/lib/source-collection-runner', () => ({
  runSourceCollectionQueue: vi.fn(async () => null),
}))

vi.mock('@/lib/source-enrichment', () => ({
  enqueueProfileEnrichmentJob: vi.fn(async () => ({ id: 'enrich-1' })),
  runProfileEnrichmentQueue: vi.fn(async () => null),
}))

import { POST } from './route'

describe('workspace source collect route', () => {
  it('returns JSON status for fetch requests instead of redirecting', async () => {
    const request = new Request('http://localhost/api/workspace-sources/tw-openai/collect?lang=zh', {
      headers: { accept: 'application/json' },
      method: 'POST',
    })

    const response = await POST(request as never, { params: Promise.resolve({ sourceId: 'tw-openai' }) })

    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
    await expect(response.json()).resolves.toEqual({
      sourceId: 'tw-openai',
      status: 'queued',
    })
  })
})
