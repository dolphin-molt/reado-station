import { describe, expect, it, vi } from 'vitest'

import { handleCollectSuccess } from './SourceCollectButton'

describe('SourceCollectButton', () => {
  it('refreshes server-rendered task surfaces after a collect job is queued', () => {
    const refresh = vi.fn()
    const showToast = vi.fn()

    handleCollectSuccess('queued', 'zh', { refresh }, showToast)

    expect(showToast).toHaveBeenCalledWith('已加入处理队列')
    expect(refresh).toHaveBeenCalledTimes(1)
  })
})
