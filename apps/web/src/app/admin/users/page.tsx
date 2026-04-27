import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AdminChrome } from '@/components/admin/AdminChrome'
import { AdminPagination } from '@/components/admin/AdminPagination'
import { getCurrentAuthSession, isAdminSession } from '@/lib/auth'
import { getD1Database } from '@/lib/cloudflare'
import { loadAdminUsersPage } from '@/lib/admin-data'
import { parsePageParam } from '@/lib/pagination'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '用户管理',
}

interface UsersPageProps {
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
  return query ? `/admin/users?${query}` : '/admin/users'
}

function errorMessage(error: string): string | null {
  switch (error) {
    case 'last-admin':
      return '至少要保留一个管理员，不能把最后一个 admin 降权。'
    case 'self-demote':
      return '不能把当前登录账号直接降权，避免后台被锁死。'
    case 'password':
      return '新密码至少需要 8 位。'
    default:
      return null
  }
}

function successMessage(value: string): string | null {
  switch (value) {
    case 'role':
      return '用户角色已更新。'
    case 'password':
      return '用户密码已更新。'
    default:
      return null
  }
}

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default async function AdminUsersPage({ searchParams }: UsersPageProps) {
  const session = await getCurrentAuthSession()
  if (!session) redirect('/login?next=/admin/users')
  if (!isAdminSession(session)) redirect('/')

  const params = await searchParams
  const error = paramValue(params?.error)
  const q = paramValue(params?.q)
  const role = paramValue(params?.role) || 'all'
  const page = parsePageParam(params?.page)
  const success = paramValue(params?.success)
  const db = await getD1Database()
  if (!db) throw new Error('D1 database is required for admin user management')

  const data = await loadAdminUsersPage(db, { page, pageSize: 30, q, role })
  const preservedParams = { q, role: role === 'all' ? '' : role }
  const next = currentPath({ ...preservedParams, page: page > 1 ? String(page) : '' })
  const errorText = errorMessage(error)
  const successText = successMessage(success)

  return (
    <div className="page-shell admin-shell">
      <AdminChrome active="users" />
      <main className="container section-stack">
        <section className="panel admin-panel">
          <div className="panel__header">
            <div>
              <p className="auth-card__eyebrow">Users</p>
              <h1>用户管理</h1>
            </div>
          </div>

          <div className="admin-summary">
            <span>全部 {data.totals.all}</span>
            <span>管理员 {data.totals.admins}</span>
            <span>成员 {data.totals.members}</span>
          </div>

          {successText && <p className="auth-message">{successText}</p>}
          {errorText && <p className="auth-message auth-message--error">{errorText}</p>}

          <form className="admin-filters" method="get">
            <input defaultValue={q} name="q" placeholder="搜索用户名、邮箱或用户 ID" type="search" />
            <select defaultValue={role} name="role">
              <option value="all">全部角色</option>
              <option value="admin">只看管理员</option>
              <option value="member">只看成员</option>
            </select>
            <button className="secondary-button" type="submit">
              筛选
            </button>
          </form>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>用户</th>
                  <th>邮箱</th>
                  <th>角色</th>
                  <th>最近登录</th>
                  <th>创建时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.username}</strong>
                      <small>{user.id}</small>
                    </td>
                    <td>{user.email || '—'}</td>
                    <td>
                      <span className={user.role === 'admin' ? 'status-pill status-pill--ok' : 'status-pill'}>
                        {user.role}
                      </span>
                    </td>
                    <td>{formatDateTime(user.lastLoginAt)}</td>
                    <td>{formatDateTime(user.createdAt)}</td>
                    <td>
                      <div className="admin-row-actions">
                        <form action={`/api/admin/users/${encodeURIComponent(user.id)}`} method="post">
                          <input name="action" type="hidden" value="set-role" />
                          <input name="next" type="hidden" value={next} />
                          <input name="role" type="hidden" value={user.role === 'admin' ? 'member' : 'admin'} />
                          <button className="table-button" type="submit">
                            设为 {user.role === 'admin' ? 'member' : 'admin'}
                          </button>
                        </form>
                        <form action={`/api/admin/users/${encodeURIComponent(user.id)}`} method="post">
                          <input name="action" type="hidden" value="set-password" />
                          <input name="next" type="hidden" value={next} />
                          <input minLength={8} name="password" placeholder="新密码（至少 8 位）" type="password" />
                          <button className="table-button" type="submit">
                            修改密码
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.users.length === 0 && <div className="empty-state">没有匹配的用户。</div>}
          <AdminPagination basePath="/admin/users" pagination={data.pagination} params={preservedParams} />
        </section>
      </main>
    </div>
  )
}
