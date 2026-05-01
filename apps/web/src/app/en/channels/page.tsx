import type { Metadata } from 'next'

import { ChannelMarketPage } from '@/components/pages/ChannelMarketPage'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Channel Discovery',
}

export default function Page() {
  return <ChannelMarketPage lang="en" />
}
