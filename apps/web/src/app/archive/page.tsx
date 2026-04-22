import type { Metadata } from 'next'

import { ArchivePage } from '@/components/pages/ArchivePage'
import { parsePageParam } from '@/lib/pagination'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '归档',
}

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function Page({ searchParams }: PageProps) {
  return <ArchivePage lang="zh" page={parsePageParam((await searchParams)?.page)} />
}
