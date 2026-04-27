import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { AdminChrome } from '@/components/admin/AdminChrome'
import { AdminPagination } from '@/components/admin/AdminPagination'
import { getCurrentAuthSession, isAdminSession } from '@/lib/auth'
import { getD1Database } from '@/lib/cloudflare'
import { loadAdminSourcesPage } from '@/lib/admin-data'
import { parsePageParam } from '@/lib/pagination'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '数据源管理',
}

interface SourcesPageProps {
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
  return query ? `/admin/sources?${query}` : '/admin/sources'
}

export default async function AdminSourcesPage({ searchParams }: SourcesPageProps) {
  const session = await getCurrentAuthSession()
  if (!session) redirect('/login?next=/admin/sources')
  if (!isAdminSession(session)) redirect('/')

  const params = await searchParams
  const q = paramValue(params?.q)
  const enabled = paramValue(params?.enabled) || 'all'
  const page = parsePageParam(params?.page)
  const db = await getD1Database()
  if (!db) throw new Error('D1 database is required for admin source management')

  const data = await loadAdminSourcesPage(db, { page, pageSize: 30, q, enabled })
  const preservedParams = { q, enabled: enabled === 'all' ? '' : enabled }
  const next = currentPath({ ...preservedParams, page: page > 1 ? String(page) : '' })

  return (
    <div className="page-shell admin-shell">
      <AdminChrome active="sources" />
      <main className="container section-stack">
        <section className="panel admin-panel">
          <div className="panel__header">
            <div>
              <p className="auth-card__eyebrow">Sources</p>
              <h1>数据源管理</h1>
            </div>
            <Link className="cta-button" href="/admin/sources/new">
              新增数据源
            </Link>
          </div>

          <div className="admin-summary">
            <span>全部 {data.totals.all}</span>
            <span>启用 {data.totals.enabled}</span>
            <span>停用 {data.totals.disabled}</span>
          </div>

          <form className="admin-filters" method="get">
            <input defaultValue={q} name="q" placeholder="搜索 ID、名称、适配器或分类" type="search" />
            <select defaultValue={enabled} name="enabled">
              <option value="all">全部状态</option>
              <option value="enabled">只看启用</option>
              <option value="disabled">只看停用</option>
            </select>
            <button className="secondary-button" type="submit">
              筛选
            </button>
          </form>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>数据源</th>
                  <th>适配器</th>
                  <th>分类</th>
                  <th>状态</th>
                  <th>资讯</th>
                  <th>健康</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {data.sources.map((source) => (
                  <tr key={source.id}>
                    <td>
                      <strong>{source.name}</strong>
                      <small>{source.id}</small>
                    </td>
                    <td>{source.adapter}</td>
                    <td>{source.category || '-'}</td>
                    <td>
                      <span className={source.enabled ? 'status-pill status-pill--ok' : 'status-pill'}>
                        {source.enabled ? '启用' : '停用'}
                      </span>
                    </td>
                    <td>{source.itemCount}</td>
                    <td>
                      <small>失败 {source.consecutiveFailures}</small>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <Link className="table-link" href={`/admin/sources/${encodeURIComponent(source.id)}`}>
                          编辑
                        </Link>
                        <form action={`/api/admin/sources/${encodeURIComponent(source.id)}`} method="post">
                          <input name="action" type="hidden" value={source.enabled ? 'disable' : 'enable'} />
                          <input name="next" type="hidden" value={next} />
                          <button className="table-button" type="submit">
                            {source.enabled ? '停用' : '启用'}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.sources.length === 0 && <div className="empty-state">没有匹配的数据源。</div>}
          <AdminPagination basePath="/admin/sources" pagination={data.pagination} params={preservedParams} />
        </section>
      </main>
    </div>
  )
}
