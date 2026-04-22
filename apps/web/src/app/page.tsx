import type { Metadata } from 'next'

import { HomePage } from '@/components/pages/HomePage'
import { parsePageParam } from '@/lib/pagination'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '今日',
}

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function Page({ searchParams }: PageProps) {
  return <HomePage lang="zh" page={parsePageParam((await searchParams)?.page)} />
}
