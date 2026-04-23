import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { AdminChrome } from '@/components/admin/AdminChrome'
import { SourceForm } from '@/components/admin/SourceForm'
import { getAdminSource } from '@/lib/admin-data'
import { getCurrentAuthSession } from '@/lib/auth'
import { getD1Database } from '@/lib/cloudflare'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '编辑数据源',
}

interface SourceEditPageProps {
  params: Promise<{ id: string }>
}

export default async function SourceEditPage({ params }: SourceEditPageProps) {
  const { id } = await params
  const session = await getCurrentAuthSession()
  if (!session) redirect(`/login?next=/admin/sources/${encodeURIComponent(id)}`)

  const db = await getD1Database()
  if (!db) throw new Error('D1 database is required for admin source management')

  const source = await getAdminSource(db, id)
  if (!source) notFound()

  return (
    <div className="page-shell admin-shell">
      <AdminChrome active="sources" />
      <main className="container section-stack">
        <section className="panel admin-panel">
          <p className="auth-card__eyebrow">Edit Source</p>
          <h1>编辑数据源</h1>
          <SourceForm action={`/api/admin/sources/${encodeURIComponent(source.id)}`} source={source} />
        </section>
      </main>
    </div>
  )
}
