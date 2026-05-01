import type { Metadata } from 'next'

import { ChannelProfilePage } from '@/components/pages/ChannelProfilePage'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '频道主页 | reado',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ChannelPage({ params }: PageProps) {
  const { id } = await params
  return <ChannelProfilePage id={id} lang="zh" />
}
