import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AdminChrome } from '@/components/admin/AdminChrome'
import { AdminPagination } from '@/components/admin/AdminPagination'
import { getCurrentAuthSession, isAdminSession } from '@/lib/auth'
import { getD1Database } from '@/lib/cloudflare'
import { loadAdminBillingLogsPage } from '@/lib/admin-data'
import { parsePageParam } from '@/lib/pagination'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '支付日志',
}

interface BillingPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function paramValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

function currentPath(params: Record<string, string>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value)
  }
  const query = search.toString()
  return query ? `/admin/billing?${query}` : '/admin/billing'
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default async function AdminBillingPage({ searchParams }: BillingPageProps) {
  const session = await getCurrentAuthSession()
  if (!session) redirect('/login?next=/admin/billing')
  if (!isAdminSession(session)) redirect('/')

  const params = await searchParams
  const q = paramValue(params?.q)
  const status = paramValue(params?.status) || 'all'
  const page = parsePageParam(params?.page)
  const db = await getD1Database()
  if (!db) throw new Error('D1 database is required for billing logs')

  const data = await loadAdminBillingLogsPage(db, { page, pageSize: 30, q, status })
  const preservedParams = { q, status: status === 'all' ? '' : status }
  const _next = currentPath({ ...preservedParams, page: page > 1 ? String(page) : '' })

  return (
    <div className="page-shell admin-shell">
      <AdminChrome active="billing" />
      <main className="container section-stack">
        <section className="panel admin-panel">
          <div className="panel__header">
            <div>
              <p className="auth-card__eyebrow">Billing</p>
              <h1>支付日志</h1>
            </div>
          </div>

          <div className="admin-summary">
            <span>全部 {data.totals.all}</span>
            <span>成功 {data.totals.succeeded}</span>
            <span>失败 {data.totals.failed}</span>
          </div>

          <form className="admin-filters admin-filters--wide" method="get">
            <input defaultValue={q} name="q" placeholder="搜索 trace、workspace、session、invoice、event 或错误信息" type="search" />
            <select defaultValue={status} name="status">
              <option value="all">全部状态</option>
              <option value="started">Started</option>
              <option value="succeeded">Succeeded</option>
              <option value="failed">Failed</option>
              <option value="ignored">Ignored</option>
            </select>
            <button className="secondary-button" type="submit">
              筛选
            </button>
          </form>

          <div className="admin-item-list">
            {data.logs.map((log) => (
              <article className="admin-item" key={log.id}>
                <div>
                  <div className="admin-item__meta">
                    <span>{formatDateTime(log.createdAt)}</span>
                    <span>{log.stage}</span>
                    <span className={log.status === 'failed' ? 'status-pill' : log.status === 'succeeded' ? 'status-pill status-pill--ok' : 'status-pill'}>
                      {log.status}
                    </span>
                    {log.planId && <span>{log.planId}</span>}
                    {log.amount != null && <span>{log.amount} {log.currency ?? ''}</span>}
                  </div>
                  <h2>{log.traceId}</h2>
                  {log.message && <p>{log.message}</p>}
                  <small>
                    workspace: {log.workspaceId ?? '-'} | checkout: {log.stripeCheckoutSessionId ?? '-'} | subscription: {log.stripeSubscriptionId ?? '-'} |
                    invoice: {log.stripeInvoiceId ?? '-'} | event: {log.stripeEventId ?? '-'}
                  </small>
                </div>
              </article>
            ))}
          </div>

          {data.logs.length === 0 && <div className="empty-state">没有匹配的支付日志。</div>}
          <AdminPagination basePath="/admin/billing" pagination={data.pagination} params={preservedParams} />
        </section>
      </main>
    </div>
  )
}
