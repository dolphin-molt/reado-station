import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { isXAccountProfileFresh, normalizeXUsername, parseXAccountParam } from './x-accounts'

describe('X account helpers', () => {
  it('normalizes handles, @handles, and x.com URLs to the same username', () => {
    expect(normalizeXUsername('karpathy')).toBe('karpathy')
    expect(normalizeXUsername('@karpathy')).toBe('karpathy')
    expect(normalizeXUsername('https://x.com/karpathy/status/123')).toBe('karpathy')
  })

  it('treats cached profiles inside the TTL as fresh', () => {
    expect(isXAccountProfileFresh('2026-04-24T12:00:00.000Z', new Date('2026-04-30T12:00:00.000Z'))).toBe(true)
    expect(isXAccountProfileFresh('2026-04-20T12:00:00.000Z', new Date('2026-04-30T12:00:00.000Z'))).toBe(false)
  })

  it('parses internal X source ids from URL params as usernames', () => {
    expect(parseXAccountParam('tw-elonmusk')).toBe('elonmusk')
  })

  it('falls back to the source URL param when account is absent', () => {
    expect(parseXAccountParam(undefined, 'tw-elonmusk')).toBe('elonmusk')
  })
})
