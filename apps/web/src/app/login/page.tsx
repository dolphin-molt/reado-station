import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

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
  if (!value.startsWith('/') || value.startsWith('//')) return '/today'
  return value
}

type LoginLanguage = 'zh' | 'en'

function loginLanguage(value: string): LoginLanguage {
  return value === 'en' ? 'en' : 'zh'
}

function loginSwitchHref(lang: LoginLanguage, nextPath: string): string {
  const params = new URLSearchParams({ next: nextPath })
  if (lang === 'zh') params.set('lang', 'en')
  return `/login?${params.toString()}`
}

function copy(lang: LoginLanguage) {
  return lang === 'en'
    ? {
        aria: 'Sign in to reado',
        switchLabel: '中文',
        switchAria: '切换到中文',
        eyebrow: 'Private signal station',
        headline: 'Return to your daily brief.',
        headlineLines: ['Return to your', 'daily brief.'],
        intro: 'Sign in to receive the brief tuned from the sources you actually care about.',
        previewTitle: "TODAY'S BRIEF",
        previewMeta: '92.4 tuned',
        previewLead: 'Technology',
        previewBody: 'AI, startups, markets, and the changes worth keeping close.',
        previewSources: ['Technology', 'AI', 'Startups', 'Markets'],
        previewTimeline: ['Tuned', 'Personal', 'Yours'],
        kicker: 'Private Access',
        title: 'Enter reado',
        cardIntro: 'Return to your daily brief, saved sources, and personal reading rhythm.',
        google: 'Continue with Google',
        github: 'Continue with GitHub',
        divider: 'or use account password',
        username: 'Account',
        password: 'Password',
        submit: 'Enter',
        registerPrefix: 'No account yet?',
        register: 'Create one',
        errors: {
          config: 'Sign-in is unavailable until D1 and READO_AUTH_SECRET are configured.',
          invalid: 'The username or password is incorrect.',
          locked: 'Too many attempts. Try again in 15 minutes.',
          oauthConfig: 'OAuth is unavailable until the provider Client ID is configured.',
          oauthState: 'OAuth state expired. Try again.',
          oauthToken: 'OAuth sign-in was not completed. Try again.',
        },
      }
    : {
        aria: '登录 reado',
        switchLabel: 'English',
        switchAria: 'Switch to English',
        eyebrow: 'Private signal station',
        headline: '回到你的每日简报',
        headlineLines: ['回到你的', '每日简报'],
        intro: '登录后继续接收为你调频过的信息源、每日简报和阅读节奏。',
        previewTitle: "TODAY'S BRIEF",
        previewMeta: '92.4 tuned',
        previewLead: 'Technology',
        previewBody: 'AI、创业公司、市场变化，以及真正值得靠近的更新。',
        previewSources: ['Technology', 'AI', 'Startups', 'Markets'],
        previewTimeline: ['Tuned', 'Personal', 'Yours'],
        kicker: '私人入口',
        title: '进入 reado',
        cardIntro: '回到你的每日简报、已保存信息源和私人阅读节奏。',
        google: 'Google 登录',
        github: 'GitHub 登录',
        divider: '或使用用户名密码',
        username: '账号',
        password: '密码',
        submit: '进入',
        registerPrefix: '还没有账号？',
        register: '注册',
        errors: {
          config: '登录暂不可用：请先配置 D1 和 READO_AUTH_SECRET。',
          invalid: '用户名或密码不正确。',
          locked: '尝试次数过多，请 15 分钟后再试。',
          oauthConfig: 'OAuth 暂不可用：请先配置对应 provider 的 Client ID。',
          oauthState: 'OAuth 登录状态已失效，请重新尝试。',
          oauthToken: 'OAuth 登录未完成，请重新尝试。',
        },
      }
}

function errorMessage(lang: LoginLanguage, error: string): string | null {
  const messages = copy(lang).errors
  switch (error) {
    case 'config':
      return messages.config
    case 'invalid':
      return messages.invalid
    case 'locked':
      return messages.locked
    case 'oauth-config':
      return messages.oauthConfig
    case 'oauth-state':
      return messages.oauthState
    case 'oauth-token':
    case 'oauth-denied':
      return messages.oauthToken
    default:
      return null
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const lang = loginLanguage(paramValue(params?.lang))
  const labels = copy(lang)
  const nextPath = safeNextPath(paramValue(params?.next) || '/today')
  const session = await getCurrentAuthSession()

  if (session) {
    redirect(safeNextPathForRole(nextPath, session.role))
  }

  const message = errorMessage(lang, paramValue(params?.error))

  return (
    <main className="auth-page auth-page--signal">
      <Link aria-label={labels.switchAria} className="auth-language-button" href={loginSwitchHref(lang, nextPath)}>
        {labels.switchLabel}
      </Link>

      <section className="auth-hero auth-hero--image" aria-labelledby="auth-title">
        <div className="auth-brand-strip">
          <Link className="auth-brand-lockup" href="/">
            <span>reado</span>
          </Link>
          <p className="auth-card__eyebrow">{labels.eyebrow}</p>
          <h1 aria-label={labels.headline} id="auth-title">
            {labels.headlineLines.map((line) => (
              <span className="auth-title__line" key={line}>
                {line}
              </span>
            ))}
          </h1>
          <p className="auth-hero__intro">{labels.intro}</p>
        </div>

        <section className="auth-card" aria-label={labels.aria}>
          <div className="auth-card__header">
            <div className="auth-card__kicker">
              <span>{labels.kicker}</span>
            </div>
            <h2>{labels.title}</h2>
            <p className="auth-card__intro">{labels.cardIntro}</p>
          </div>

          {message && (
            <p className="auth-message auth-message--error" role="alert">
              {message}
            </p>
          )}
          <div className="auth-oauth">
            <Link className="auth-oauth__button" href={`/api/auth/oauth/google/start?next=${encodeURIComponent(nextPath)}`}>
              {labels.google}
            </Link>
            <Link className="auth-oauth__button" href={`/api/auth/oauth/github/start?next=${encodeURIComponent(nextPath)}`}>
              {labels.github}
            </Link>
          </div>

          <div className="auth-divider">{labels.divider}</div>

          <form action="/api/auth/login" className="auth-form" method="post">
            <input name="next" type="hidden" value={nextPath} />
            {lang === 'en' && <input name="lang" type="hidden" value="en" />}

            <label className="auth-field">
              <span>{labels.username}</span>
              <input autoComplete="username" name="username" required type="text" />
            </label>

            <label className="auth-field">
              <span>{labels.password}</span>
              <input autoComplete="current-password" name="password" required type="password" />
            </label>

            <button className="auth-submit" type="submit">
              {labels.submit}
            </button>
          </form>

          <p className="auth-card__switch">
            {labels.registerPrefix}
            <Link href={lang === 'en' ? '/register?lang=en' : '/register'}>{labels.register}</Link>
          </p>
        </section>
      </section>
    </main>
  )
}
