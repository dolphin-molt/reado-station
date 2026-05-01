import type { Metadata } from 'next'

import { MySourcesPage } from '@/components/pages/MySourcesPage'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '我的信息源 | reado',
}

export default function SourcesPage() {
  return <MySourcesPage lang="zh" />
}
