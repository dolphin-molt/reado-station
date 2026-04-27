import type { Metadata } from 'next'

import { SubscriptionPage } from '@/components/pages/SubscriptionPage'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '订阅',
}

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function paramValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams
  return (
    <SubscriptionPage
      billingError={paramValue(params?.billingError)}
      checkout={paramValue(params?.checkout)}
      lang="zh"
      portal={paramValue(params?.portal)}
      trace={paramValue(params?.trace)}
    />
  )
}
