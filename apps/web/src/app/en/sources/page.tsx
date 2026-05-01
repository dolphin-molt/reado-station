import type { Metadata } from 'next'

import { MySourcesPage } from '@/components/pages/MySourcesPage'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'My sources | reado',
}

export default function EnSourcesPage() {
  return <MySourcesPage lang="en" />
}
