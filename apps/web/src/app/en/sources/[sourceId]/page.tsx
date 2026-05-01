import type { Metadata } from 'next'

import { SourceDetailPage } from '@/components/pages/SourceDetailPage'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Source detail',
}

interface PageProps {
  params: Promise<{ sourceId: string }>
}

export default async function SourcePage({ params }: PageProps) {
  const { sourceId } = await params
  return <SourceDetailPage lang="en" sourceId={decodeURIComponent(sourceId)} />
}
