'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { AppToast } from '@/components/ui/AppToast'

function defaultCollectMessage(status: string, lang: 'en' | 'zh'): string {
  if (status === 'failed') return lang === 'zh' ? '重新处理失败，请稍后再试。' : 'Refresh failed. Please try again later.'
  if (status === 'running') return lang === 'zh' ? '正在处理' : 'Processing'
  if (status === 'ready') return lang === 'zh' ? '处理完成' : 'Processing complete'
  return lang === 'zh' ? '已加入处理队列' : 'Added to the processing queue'
}

interface RefreshableRouter {
  refresh(): void
}

export function handleCollectSuccess(
  status: string,
  lang: 'en' | 'zh',
  router: RefreshableRouter,
  showToast: (message: string) => void,
) {
  showToast(defaultCollectMessage(status, lang))
  router.refresh()
}

export function SourceCollectButton({
  className,
  endpoint,
  label,
  lang,
}: {
  className?: string
  endpoint: string
  label: string
  lang: 'en' | 'zh'
}) {
  const [pending, setPending] = useState(false)
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null)
  const router = useRouter()

  function showToast(message: string) {
    setToast((current) => ({ id: (current?.id ?? 0) + 1, message }))
  }

  async function collectSource() {
    if (pending) return

    setPending(true)
    try {
      const response = await fetch(endpoint, {
        headers: {
          accept: 'application/json',
        },
        method: 'POST',
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string; status?: string }
      if (!response.ok) {
        showToast(payload.error || (lang === 'zh' ? '重新处理失败，请稍后再试。' : 'Refresh failed. Please try again later.'))
        return
      }
      handleCollectSuccess(payload.status ?? 'queued', lang, router, showToast)
    } catch {
      showToast(lang === 'zh' ? '重新处理失败，请稍后再试。' : 'Refresh failed. Please try again later.')
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <button
        className={className}
        data-collect-endpoint={endpoint}
        disabled={pending}
        onClick={collectSource}
        type="button"
      >
        {pending ? (lang === 'zh' ? '处理中' : 'Processing') : label}
      </button>
      {toast && <AppToast key={toast.id} message={toast.message} />}
    </>
  )
}
