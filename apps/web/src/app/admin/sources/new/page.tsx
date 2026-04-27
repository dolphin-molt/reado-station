import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AdminChrome } from '@/components/admin/AdminChrome'
import { SourceForm } from '@/components/admin/SourceForm'
import { getCurrentAuthSession, isAdminSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '新增数据源',
}

export default async function NewSourcePage() {
  const session = await getCurrentAuthSession()
  if (!session) redirect('/login?next=/admin/sources/new')
  if (!isAdminSession(session)) redirect('/')

  return (
    <div className="page-shell admin-shell">
      <AdminChrome active="sources" />
      <main className="container section-stack">
        <section className="panel admin-panel">
          <p className="auth-card__eyebrow">New Source</p>
          <h1>新增数据源</h1>
          <SourceForm action="/api/admin/sources" />
        </section>
      </main>
    </div>
  )
}
