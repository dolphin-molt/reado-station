import { describe, expect, it, vi } from 'vitest'

const refreshState = vi.hoisted(() => ({
  clearInterval: vi.fn(),
  intervalHandler: null as null | (() => void),
  refresh: vi.fn(),
  setInterval: vi.fn((handler: () => void) => {
    refreshState.intervalHandler = handler
    return 7
  }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshState.refresh }),
}))

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useEffect: vi.fn((effect: () => void | (() => void)) => effect()),
  }
})

import { ProcessingQueueAutoRefresh } from './ProcessingQueueAutoRefresh'

describe('ProcessingQueueAutoRefresh', () => {
  it('refreshes route data without forcing a full page reload', () => {
    const fakeWindow = {
      clearInterval: refreshState.clearInterval,
      setInterval: refreshState.setInterval,
    }
    Object.defineProperty(globalThis, 'window', { configurable: true, value: fakeWindow })
    Object.defineProperty(globalThis, 'document', { configurable: true, value: { visibilityState: 'visible' } })

    ProcessingQueueAutoRefresh({ intervalMs: 1000 })
    refreshState.intervalHandler?.()

    expect(refreshState.setInterval).toHaveBeenCalledWith(expect.any(Function), 1000)
    expect(refreshState.refresh).toHaveBeenCalledTimes(1)
    expect('location' in fakeWindow).toBe(false)
  })
})
