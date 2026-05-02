import type { Metadata } from 'next'

import { HomePage } from '@/components/pages/HomePage'
import { parseCategoryParam } from '@/lib/categories'
import { parsePageParam } from '@/lib/pagination'
import { parseXAccountParam } from '@/lib/x-accounts'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '今日',
}

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function TodayPage({ searchParams }: PageProps) {
  const params = await searchParams
  return (
    <HomePage
      account={parseXAccountParam(params?.account, params?.source)}
      category={parseCategoryParam(params?.category)}
      lang="zh"
      page={parsePageParam(params?.page)}
      subscribed={(Array.isArray(params?.subscribed) ? params?.subscribed[0] : params?.subscribed) === '1'}
    />
  )
}
