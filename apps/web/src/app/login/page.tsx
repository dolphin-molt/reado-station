import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { getCurrentAuthSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '登录',
}

interface LoginPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function paramValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

function safeNextPath(value: string): string {
  if (!value.startsWith('/') || value.startsWith('//')) return '/admin'
  return value
}

function errorMessage(error: string): string | null {
  switch (error) {
    case 'config':
      return '登录暂不可用：请先配置 READO_ADMIN_PASSWORD 和 READO_AUTH_SECRET。'
    case 'invalid':
      return '用户名或密码不正确。'
    case 'locked':
      return '尝试次数过多，请 15 分钟后再试。'
    default:
      return null
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const nextPath = safeNextPath(paramValue(params?.next) || '/admin')
  const session = await getCurrentAuthSession()

  if (session) {
    redirect(nextPath)
  }

  const message = errorMessage(paramValue(params?.error))
  const loggedOut = paramValue(params?.loggedOut) === '1'

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="auth-card__brand" href="/">
          reado
        </Link>
        <p className="auth-card__eyebrow">Admin Access</p>
        <h1>登录控制台</h1>
        <p className="auth-card__intro">登录后可以进入管理入口。公开阅读页面仍然保持无需登录访问。</p>

        {message && (
          <p className="auth-message auth-message--error" role="alert">
            {message}
          </p>
        )}
        {loggedOut && <p className="auth-message">你已退出登录。</p>}

        <form action="/api/auth/login" className="auth-form" method="post">
          <input name="next" type="hidden" value={nextPath} />

          <label className="auth-field">
            <span>用户名</span>
            <input autoComplete="username" defaultValue="admin" name="username" required type="text" />
          </label>

          <label className="auth-field">
            <span>密码</span>
            <input autoComplete="current-password" name="password" required type="password" />
          </label>

          <button className="auth-submit" type="submit">
            登录
          </button>
        </form>
      </section>
    </main>
  )
}
