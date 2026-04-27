import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { Header } from '@/components/layout/Header'
import { getCurrentAuthSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '注册',
}

interface RegisterPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function paramValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

function safeNextPath(value: string): string {
  if (!value.startsWith('/') || value.startsWith('//')) return '/'
  if (value === '/admin' || value.startsWith('/admin/')) return '/'
  return value
}

function errorMessage(error: string): string | null {
  switch (error) {
    case 'config':
      return '注册暂不可用：请先配置 D1 和 READO_AUTH_SECRET。'
    case 'username':
      return '用户名需为 3-32 位，只能使用字母、数字、点、下划线或短横线。'
    case 'password':
      return '密码至少需要 8 位。'
    case 'mismatch':
      return '两次输入的密码不一致。'
    case 'exists':
      return '这个用户名已经被注册。'
    default:
      return null
  }
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams
  const nextPath = safeNextPath(paramValue(params?.next) || '/')
  const session = await getCurrentAuthSession()

  if (session) {
    redirect(nextPath)
  }

  const message = errorMessage(paramValue(params?.error))

  return (
    <div className="page-shell">
      <Header lang="zh" active="auth" path="register" />
      <main className="auth-page">
        <section className="auth-card">
          <Link className="auth-card__brand" href="/">
            reado
          </Link>
          <p className="auth-card__eyebrow">Create Account</p>
          <h1>注册账号</h1>
          <p className="auth-card__intro">注册后会自动登录，并回到首页继续阅读。</p>

          {message && (
            <p className="auth-message auth-message--error" role="alert">
              {message}
            </p>
          )}

          <div className="auth-oauth">
            <Link className="auth-oauth__button" href={`/api/auth/oauth/google/start?next=${encodeURIComponent(nextPath)}`}>
              Google 注册/登录
            </Link>
            <Link className="auth-oauth__button" href={`/api/auth/oauth/github/start?next=${encodeURIComponent(nextPath)}`}>
              GitHub 注册/登录
            </Link>
          </div>

          <div className="auth-divider">或创建用户名密码账号</div>

          <form action="/api/auth/register" className="auth-form" method="post">
            <input name="next" type="hidden" value={nextPath} />

            <label className="auth-field">
              <span>用户名</span>
              <input autoComplete="username" name="username" required type="text" />
            </label>

            <label className="auth-field">
              <span>密码</span>
              <input autoComplete="new-password" minLength={8} name="password" required type="password" />
            </label>

            <label className="auth-field">
              <span>确认密码</span>
              <input autoComplete="new-password" minLength={8} name="confirmPassword" required type="password" />
            </label>

            <button className="auth-submit" type="submit">
              注册并登录
            </button>
          </form>

          <p className="auth-card__switch">
            已有账号？
            <Link href={`/login?next=${encodeURIComponent(nextPath)}`}>去登录</Link>
          </p>
        </section>
      </main>
    </div>
  )
}
