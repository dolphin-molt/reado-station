import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AdminChrome } from '@/components/admin/AdminChrome'
import { AdminPagination } from '@/components/admin/AdminPagination'
import { loadAdminItemsPage } from '@/lib/admin-data'
import { getCurrentAuthSession, isAdminSession } from '@/lib/auth'
import { getD1Database } from '@/lib/cloudflare'
import { parsePageParam } from '@/lib/pagination'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '资讯管理',
}

interface ItemsPageProps {
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
  return query ? `/admin/items?${query}` : '/admin/items'
}

export default async function AdminItemsPage({ searchParams }: ItemsPageProps) {
  const session = await getCurrentAuthSession()
  if (!session) redirect('/login?next=/admin/items')
  if (!isAdminSession(session)) redirect('/')

  const params = await searchParams
  const q = paramValue(params?.q)
  const date = paramValue(params?.date)
  const category = paramValue(params?.category)
  const source = paramValue(params?.source)
  const visibility = paramValue(params?.visibility) || 'visible'
  const page = parsePageParam(params?.page)
  const db = await getD1Database()
  if (!db) throw new Error('D1 database is required for admin item management')

  const data = await loadAdminItemsPage(db, { page, pageSize: 30, q, date, category, source, visibility })
  const preservedParams = { q, date, category, source, visibility: visibility === 'visible' ? '' : visibility }
  const next = currentPath({ ...preservedParams, page: page > 1 ? String(page) : '' })

  return (
    <div className="page-shell admin-shell">
      <AdminChrome active="items" />
      <main className="container section-stack">
        <section className="panel admin-panel">
          <div className="panel__header">
            <div>
              <p className="auth-card__eyebrow">Items</p>
              <h1>资讯管理</h1>
            </div>
          </div>

          <div className="admin-summary">
            <span>全部 {data.totals.all}</span>
            <span>可见 {data.totals.visible}</span>
            <span>隐藏 {data.totals.hidden}</span>
          </div>

          <form className="admin-filters admin-filters--wide" method="get">
            <input defaultValue={q} name="q" placeholder="搜索标题、URL 或来源" type="search" />
            <input defaultValue={date} name="date" placeholder="日期 YYYY-MM-DD" type="text" />
            <input defaultValue={category} name="category" placeholder="分类" type="text" />
            <input defaultValue={source} name="source" placeholder="source id" type="text" />
            <select defaultValue={visibility} name="visibility">
              <option value="visible">只看可见</option>
              <option value="hidden">只看隐藏</option>
              <option value="all">全部</option>
            </select>
            <button className="secondary-button" type="submit">
              筛选
            </button>
          </form>

          <div className="admin-item-list">
            {data.items.map((item) => (
              <article className="admin-item" key={item.id}>
                <div>
                  <div className="admin-item__meta">
                    <span>{item.date}</span>
                    <span>{item.sourceName}</span>
                    <span>{item.category}</span>
                    {item.hiddenAt && <span className="status-pill">已隐藏</span>}
                  </div>
                  <h2>
                    <a href={item.url} rel="noreferrer" target="_blank">
                      {item.title}
                    </a>
                  </h2>
                  {item.summary && <p>{item.summary}</p>}
                  {item.hiddenReason && <small>隐藏原因：{item.hiddenReason}</small>}
                </div>

                <form action={`/api/admin/items/${encodeURIComponent(item.id)}`} className="admin-item__actions" method="post">
                  <input name="next" type="hidden" value={next} />
                  {item.hiddenAt ? (
                    <>
                      <input name="action" type="hidden" value="unhide" />
                      <button className="secondary-button" type="submit">
                        恢复展示
                      </button>
                    </>
                  ) : (
                    <>
                      <input name="action" type="hidden" value="hide" />
                      <input name="reason" placeholder="隐藏原因" type="text" />
                      <button className="secondary-button" type="submit">
                        隐藏
                      </button>
                    </>
                  )}
                </form>
              </article>
            ))}
          </div>

          {data.items.length === 0 && <div className="empty-state">没有匹配的资讯。</div>}
          <AdminPagination basePath="/admin/items" pagination={data.pagination} params={preservedParams} />
        </section>
      </main>
    </div>
  )
}
