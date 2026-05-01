import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Archive',
}

export default function Page() {
  redirect('/en')
}
