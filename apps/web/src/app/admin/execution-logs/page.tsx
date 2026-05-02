import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AdminChrome } from '@/components/admin/AdminChrome'
import { ExecutionLogsPage } from '@/components/pages/ExecutionLogsPage'
import { getCurrentAuthSession, isAdminSession } from '@/lib/auth'
import { getD1Database } from '@/lib/cloudflare'
import { listExecutionLogs } from '@/lib/execution-logs'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '执行过程',
}

interface ExecutionLogsRouteProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function paramValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

export default async function AdminExecutionLogsRoute({ searchParams }: ExecutionLogsRouteProps) {
  const session = await getCurrentAuthSession()
  if (!session) redirect('/login?next=/admin/execution-logs')
  if (!isAdminSession(session)) redirect('/')

  const params = await searchParams
  const filters = {
    runId: paramValue(params?.runId),
    scope: paramValue(params?.scope),
    status: paramValue(params?.status),
    subjectId: paramValue(params?.subjectId),
  }
  const db = await getD1Database()
  if (!db) throw new Error('D1 database is required for execution logs')

  const logs = await listExecutionLogs(db, {
    limit: 200,
    runId: filters.runId,
    scope: filters.scope,
    status: filters.status,
    subjectId: filters.subjectId,
  })

  return (
    <div className="page-shell admin-shell">
      <AdminChrome active="execution-logs" />
      <main className="container section-stack">
        <section className="panel admin-panel">
          <ExecutionLogsPage filters={filters} logs={logs} />
        </section>
      </main>
    </div>
  )
}
