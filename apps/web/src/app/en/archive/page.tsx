import type { Metadata } from 'next'

import { ArchivePage } from '@/components/pages/ArchivePage'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Archive',
}

export default async function Page() {
  return <ArchivePage lang="en" />
}
