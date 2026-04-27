import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { AdminChrome } from '@/components/admin/AdminChrome'
import { loadAdminOverview } from '@/lib/admin-data'
import { getCurrentAuthSession, isAdminSession } from '@/lib/auth'
import { getD1Database } from '@/lib/cloudflare'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '控制台',
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default async function AdminPage() {
  const session = await getCurrentAuthSession()

  if (!session) {
    redirect('/login?next=/admin')
  }
  if (!isAdminSession(session)) {
    redirect('/')
  }

  const db = await getD1Database()
  if (!db) {
    throw new Error('D1 database is required for admin console')
  }

  const overview = await loadAdminOverview(db)

  return (
    <div className="page-shell admin-shell">
      <AdminChrome active="overview" />

      <main className="container section-stack">
        <section className="panel panel--narrow admin-panel">
          <p className="auth-card__eyebrow">Admin Console</p>
          <h1>控制台已开启</h1>
          <p className="admin-panel__intro">
            当前登录为 <strong>{session.username}</strong>。认证层已经就绪，后续可以把采集状态、手动同步、数据修复等操作接到这里。
          </p>

          <dl className="admin-facts">
            <div>
              <dt>会话创建</dt>
              <dd>{formatDateTime(session.createdAt)}</dd>
            </div>
            <div>
              <dt>有效期至</dt>
              <dd>{formatDateTime(session.expiresAt)}</dd>
            </div>
          </dl>

          <div className="admin-stats">
            <Link className="admin-stat" href="/admin/sources">
              <span>{overview.enabledSourceCount} / {overview.sourceCount}</span>
              <strong>启用数据源</strong>
            </Link>
            <Link className="admin-stat" href="/admin/items">
              <span>{overview.itemCount}</span>
              <strong>资讯总量</strong>
            </Link>
            <Link className="admin-stat" href="/admin/items?visibility=hidden">
              <span>{overview.hiddenItemCount}</span>
              <strong>已隐藏资讯</strong>
            </Link>
            <div className="admin-stat">
              <span>{overview.latestDate ?? '暂无'}</span>
              <strong>最新日期</strong>
            </div>
          </div>

          <div className="admin-actions">
            <Link className="cta-button" href="/admin/sources">
              管理数据源
            </Link>
            <Link className="secondary-button" href="/admin/items">
              管理资讯
            </Link>
            <form action="/api/auth/logout" method="post">
              <button className="secondary-button" type="submit">
                退出登录
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  )
}
