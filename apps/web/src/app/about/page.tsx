import type { Metadata } from 'next'

import { AboutPage } from '@/components/pages/AboutPage'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: '关于',
}

export default function Page() {
  return <AboutPage lang="zh" />
}
