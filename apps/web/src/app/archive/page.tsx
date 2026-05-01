import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: '归档',
}

export default function Page() {
  redirect('/today')
}
