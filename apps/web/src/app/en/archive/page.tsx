import type { Metadata } from 'next'

import { ArchivePage } from '@/components/pages/ArchivePage'
import { parsePageParam } from '@/lib/pagination'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Archive',
}

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function Page({ searchParams }: PageProps) {
  return <ArchivePage lang="en" page={parsePageParam((await searchParams)?.page)} />
}
