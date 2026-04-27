import type { Metadata } from 'next'

import { AddSourcePage } from '@/components/pages/AddSourcePage'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Add Source',
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
    <AddSourcePage
      error={paramValue(params?.error)}
      intent={paramValue(params?.intent)}
      lang="en"
      query={paramValue(params?.q)}
      type={paramValue(params?.type)}
    />
  )
}
