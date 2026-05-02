import { describe, expect, it } from 'vitest'

import { canViewExecutionLogs } from './developer-access'

describe('developer access', () => {
  it('allows non-admin signed-in users to view execution logs in development', () => {
    expect(canViewExecutionLogs({ role: 'member' }, 'development')).toBe(true)
  })

  it('keeps execution logs admin-only in production', () => {
    expect(canViewExecutionLogs({ role: 'member' }, 'production')).toBe(false)
    expect(canViewExecutionLogs({ role: 'admin' }, 'production')).toBe(true)
  })
})
