import { describe, expect, it } from 'vitest'

import { collectionWindowForHours, decideSourceCollection, snapshotCoversWindow } from './source-collections'

describe('public source collection reuse decisions', () => {
  it('reuses a fresh snapshot when it covers the requested window', () => {
    const request = collectionWindowForHours(24, new Date('2026-04-30T12:00:00.000Z'))
    const snapshot = {
      sourceId: 'tw-karpathy',
      sourceType: 'x' as const,
      windowStart: '2026-04-29T00:00:00.000Z',
      windowEnd: '2026-04-30T12:30:00.000Z',
      status: 'fresh' as const,
      itemCount: 20,
      collectedAt: '2026-04-30T12:30:00.000Z',
    }

    expect(snapshotCoversWindow(snapshot, request.windowStart, request.windowEnd)).toBe(true)
    expect(decideSourceCollection({ snapshot, windowStart: request.windowStart, windowEnd: request.windowEnd })).toEqual({
      shouldCollect: false,
      status: 'fresh',
      reason: 'fresh-snapshot',
    })
  })

  it('reuses an active source-level job instead of creating a duplicate workspace job', () => {
    const decision = decideSourceCollection({
      activeJob: {
        id: 'job-1',
        sourceId: 'tw-karpathy',
        sourceType: 'x',
        windowStart: '2026-04-29T12:00:00.000Z',
        windowEnd: '2026-04-30T12:00:00.000Z',
        status: 'running',
      },
      snapshot: null,
      windowStart: '2026-04-29T12:00:00.000Z',
      windowEnd: '2026-04-30T12:00:00.000Z',
    })

    expect(decision).toEqual({
      shouldCollect: false,
      status: 'running',
      reason: 'active-job',
    })
  })
})
