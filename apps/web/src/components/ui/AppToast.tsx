'use client'

import { useEffect, useState } from 'react'

export function AppToast({ durationMs = 2000, message }: { durationMs?: number; message: string }) {
  const [visible, setVisible] = useState(Boolean(message))

  useEffect(() => {
    setVisible(Boolean(message))
    if (!message) return

    const timer = window.setTimeout(() => {
      setVisible(false)
    }, durationMs)

    return () => window.clearTimeout(timer)
  }, [durationMs, message])

  if (!visible || !message) return null

  return (
    <div aria-live="polite" className="app-toast" role="status">
      {message}
    </div>
  )
}
