'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function ProcessingQueueAutoRefresh({ intervalMs = 8000 }: { intervalMs?: number }) {
  const router = useRouter()

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        router.refresh()
      }
    }, intervalMs)

    return () => window.clearInterval(timer)
  }, [intervalMs, router])

  return null
}
