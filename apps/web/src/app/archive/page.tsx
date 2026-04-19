import type { Metadata } from 'next'

import { ArchivePage } from '@/components/pages/ArchivePage'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: '归档',
}

export default async function Page() {
  return <ArchivePage lang="zh" />
}
