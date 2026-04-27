import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { Header } from '@/components/layout/Header'
import { getCurrentAuthSession, safeNextPathForRole } from '@/lib/auth'

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
      return '登录暂不可用：请先配置 D1 和 READO_AUTH_SECRET。'
    case 'invalid':
      return '用户名或密码不正确。'
    case 'locked':
      return '尝试次数过多，请 15 分钟后再试。'
    case 'oauth-config':
      return 'OAuth 暂不可用：请先配置对应 provider 的 Client ID。'
    case 'oauth-state':
      return 'OAuth 登录状态已失效，请重新尝试。'
    case 'oauth-token':
    case 'oauth-denied':
      return 'OAuth 登录未完成，请重新尝试。'
    default:
      return null
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const nextPath = safeNextPath(paramValue(params?.next) || '/admin')
  const session = await getCurrentAuthSession()

  if (session) {
    redirect(safeNextPathForRole(nextPath, session.role))
  }

  const message = errorMessage(paramValue(params?.error))

  return (
    <div className="page-shell">
      <Header lang="zh" active="auth" path="login" />
      <main className="auth-page">
        <section className="auth-card">
          <Link className="auth-card__brand" href="/">
            reado
          </Link>
          <p className="auth-card__eyebrow">Account Access</p>
          <h1>登录账号</h1>
          <p className="auth-card__intro">普通账号会回到阅读页，管理员账号才会进入控制台。</p>

          {message && (
            <p className="auth-message auth-message--error" role="alert">
              {message}
            </p>
          )}
          <div className="auth-oauth">
            <Link className="auth-oauth__button" href={`/api/auth/oauth/google/start?next=${encodeURIComponent(nextPath)}`}>
              Google 登录
            </Link>
            <Link className="auth-oauth__button" href={`/api/auth/oauth/github/start?next=${encodeURIComponent(nextPath)}`}>
              GitHub 登录
            </Link>
          </div>

          <div className="auth-divider">或使用用户名密码</div>

          <form action="/api/auth/login" className="auth-form" method="post">
            <input name="next" type="hidden" value={nextPath} />

            <label className="auth-field">
              <span>用户名</span>
              <input autoComplete="username" name="username" required type="text" />
            </label>

            <label className="auth-field">
              <span>密码</span>
              <input autoComplete="current-password" name="password" required type="password" />
            </label>

            <button className="auth-submit" type="submit">
              登录
            </button>
          </form>

          <p className="auth-card__switch">
            还没有账号？
            <Link href="/register">注册</Link>
          </p>
        </section>
      </main>
    </div>
  )
}
