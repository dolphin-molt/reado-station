import type { Metadata } from 'next'

import { SourceDetailPage } from '@/components/pages/SourceDetailPage'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '信息源详情',
}

interface PageProps {
  params: Promise<{ sourceId: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function SourcePage({ params, searchParams }: PageProps) {
  const { sourceId } = await params
  const query = await searchParams
  const collect = Array.isArray(query?.collect) ? query?.collect[0] : query?.collect
  return <SourceDetailPage collectStatus={collect} lang="zh" sourceId={decodeURIComponent(sourceId)} />
}
