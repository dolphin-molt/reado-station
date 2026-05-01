import type { Metadata } from 'next'

import { SourceDetailPage } from '@/components/pages/SourceDetailPage'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '信息源详情',
}

interface PageProps {
  params: Promise<{ sourceId: string }>
}

export default async function SourcePage({ params }: PageProps) {
  const { sourceId } = await params
  return <SourceDetailPage lang="zh" sourceId={decodeURIComponent(sourceId)} />
}
