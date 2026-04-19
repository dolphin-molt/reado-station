import type { Metadata } from 'next'

import { HomePage } from '@/components/pages/HomePage'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Today',
}

export default async function Page() {
  return <HomePage lang="en" />
}
