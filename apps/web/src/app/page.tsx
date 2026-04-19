import type { Metadata } from 'next'

import { HomePage } from '@/components/pages/HomePage'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: '今日',
}

export default async function Page() {
  return <HomePage lang="zh" />
}
