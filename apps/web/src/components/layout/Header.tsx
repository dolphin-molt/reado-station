import Link from 'next/link'

import { SourceFilter } from '@/components/news/SourceFilter'
import { getCurrentAuthSession } from '@/lib/auth'
import { getD1Binding } from '@/lib/cloudflare'
import type { CategoryOption } from '@/lib/categories'
import { getSidebarData } from '@/lib/content'
import { formatDayLabel, localizedPath, switchPath, t, type Lang } from '@/lib/i18n'
import { PLAN_LIMITS } from '@/lib/plans'
import { getDefaultWorkspaceForUser, getWorkspaceCreditBalance, getWorkspaceSourceCount } from '@/lib/workspaces'
import { loadUserXSubscriptionCount } from '@/lib/x-accounts'

type NavKey = 'home' | 'archive' | 'about' | 'source-add' | 'subscription' | 'auth'

const FEEDBACK_URL = 'https://github.com/dolphin-molt/reado-station/issues/new/choose'

interface AccountUsage {
  planName: string
  creditsBalance: number
  sourceCount: number
  sourceLimit: number
}

interface HeaderProps {
  lang: Lang
  active: NavKey
  path?: string
  date?: string | null
  itemCount?: number
  sourceCount?: number
  activeCategory?: string | null
  categories?: CategoryOption[]
  showSourceFilter?: boolean
}

export async function Header({
  lang,
  active,
  path = '',
  date,
  itemCount = 0,
  sourceCount = 0,
  activeCategory = null,
  categories = [],
  showSourceFilter = true,
}: HeaderProps) {
  let sidebarDate = date
  let sidebarItemCount = itemCount
  let sidebarSourceCount = sourceCount
  let sidebarActiveCategory = activeCategory
  let sidebarCategories = categories

  const shouldLoadSidebarData = showSourceFilter && !sidebarDate && sidebarItemCount === 0 && sidebarSourceCount === 0 && sidebarCategories.length === 0
  const [sidebarData, session] = await Promise.all([
    shouldLoadSidebarData ? getSidebarData(lang, sidebarActiveCategory) : Promise.resolve(null),
    getCurrentAuthSession(),
  ])

  if (sidebarData) {
    sidebarDate = sidebarData.date
    sidebarItemCount = sidebarData.totalItems
    sidebarSourceCount = sidebarData.sourceCount
    sidebarActiveCategory = sidebarData.activeCategory
    sidebarCategories = sidebarData.categories
  }

  if (showSourceFilter && session) {
    const db = await getD1Binding().catch(() => null)
    if (db) {
      const xSubscriptionCount = await loadUserXSubscriptionCount(db, session.userId)
      const hasTwitterCategory = sidebarCategories.some((category) => category.id === 'twitter')

      sidebarCategories = sidebarCategories.map((category) =>
        category.id === 'twitter' ? { ...category, count: xSubscriptionCount } : category,
      )

      if (!hasTwitterCategory && (xSubscriptionCount > 0 || sidebarActiveCategory === 'twitter')) {
        sidebarCategories = [...sidebarCategories, { id: 'twitter', count: xSubscriptionCount }]
      }
    }
  }

  let accountUsage: AccountUsage | null = null
  if (session && session.role !== 'admin') {
    const db = await getD1Binding().catch(() => null)
    if (db) {
      const workspace = await getDefaultWorkspaceForUser(db, session.userId, session.username)
      const limits = PLAN_LIMITS[workspace.planId]
      const [creditsBalance, workspaceSourceCount] = await Promise.all([
        getWorkspaceCreditBalance(db, workspace.id),
        getWorkspaceSourceCount(db, workspace.id),
      ])
      accountUsage = {
        planName: limits.name,
        creditsBalance,
        sourceCount: workspaceSourceCount,
        sourceLimit: limits.sourceLimit,
      }
    }
  }

  const dateLabel = sidebarDate ? formatDayLabel(sidebarDate, lang) : undefined
  const navItems = [
    { key: 'home' as const, href: localizedPath(lang), label: t(lang, 'nav.today') },
  ]
  const username = session?.username ?? 'admin'
  const userInitial = username.slice(0, 1).toUpperCase()
  const isAdmin = session?.role === 'admin'
  const showPageMeta = active === 'home' && !sidebarActiveCategory
  const highlightSourceFilter = active === 'home' && Boolean(sidebarActiveCategory)

  return (
    <>
      <input aria-hidden="true" className="sidebar-toggle" id="app-sidebar-toggle" type="checkbox" />
      <label aria-label="Open navigation" className="sidebar-floating-toggle" htmlFor="app-sidebar-toggle">
        <span />
        <span />
        <span />
      </label>
      <aside className="app-sidebar">
        <div className="sidebar-main">
          <div className="sidebar-brand-row">
            <Link href={localizedPath(lang)} className="sidebar-brand">
              <span className="sidebar-brand__mark">r</span>
              <span className="sidebar-brand__text">reado</span>
            </Link>
            <label aria-label="Toggle navigation" className="sidebar-toggle-control" htmlFor="app-sidebar-toggle">
              <span />
              <span />
            </label>
          </div>

          <nav aria-label="Main navigation" className="sidebar-nav">
            {navItems.map((item) => (
              <Link
                className="sidebar-nav__link"
                data-active={active === item.key && !highlightSourceFilter}
                data-short={item.label.slice(0, 1)}
                href={item.href}
                key={item.key}
              >
                <span className="sidebar-nav__text">{item.label}</span>
              </Link>
            ))}
          </nav>

          {showSourceFilter && (
            <SourceFilter
              activeCategory={sidebarActiveCategory}
              categories={sidebarCategories}
              highlightActive={highlightSourceFilter}
              lang={lang}
              totalItems={sidebarItemCount}
            />
          )}
        </div>

        {session ? (
          <details className="sidebar-account">
            <summary className="sidebar-account__summary">
              <span className="sidebar-account__avatar">{userInitial}</span>
              <span className="sidebar-account__identity">
                <strong>{username}</strong>
                <small>{isAdmin ? 'Admin' : 'Member'}</small>
              </span>
            </summary>
            <div className="sidebar-account__menu">
              <div className="sidebar-account__info">
                <strong>{username}</strong>
                <span>{t(lang, 'auth.login')}</span>
              </div>
              {accountUsage && (
                <div className="sidebar-account__usage">
                  <div>
                    <span>{lang === 'zh' ? '套餐' : 'Plan'}</span>
                    <strong>{accountUsage.planName}</strong>
                  </div>
                  <div>
                    <span>{lang === 'zh' ? '积分' : 'Credits'}</span>
                    <strong>{accountUsage.creditsBalance}</strong>
                  </div>
                  <div>
                    <span>{lang === 'zh' ? '信息源' : 'Sources'}</span>
                    <strong>{accountUsage.sourceCount}/{accountUsage.sourceLimit}</strong>
                  </div>
                </div>
              )}
              {isAdmin && <Link href="/admin">{lang === 'zh' ? '控制台' : 'Console'}</Link>}
              <Link href={localizedPath(lang, 'subscription')}>{t(lang, 'nav.subscription')}</Link>
              <Link href={localizedPath(lang, 'archive')}>{t(lang, 'nav.archive')}</Link>
              <Link href={switchPath(lang, path)}>{t(lang, 'lang.switch')}</Link>
              <Link href={localizedPath(lang, 'about')}>{t(lang, 'nav.about')}</Link>
              <a href={FEEDBACK_URL} rel="noreferrer" target="_blank">
                {t(lang, 'footer.feedback')}
              </a>
              <form action="/api/auth/logout" method="post">
                <button type="submit">{lang === 'zh' ? '退出登录' : 'Sign out'}</button>
              </form>
            </div>
          </details>
        ) : (
          <div className="sidebar-account sidebar-account--signed-out">
            <Link className="sidebar-account__summary" href="/login">
              <span className="sidebar-account__avatar">{t(lang, 'auth.login').slice(0, 1)}</span>
              <span className="sidebar-account__identity">
                <strong>{t(lang, 'auth.login')}</strong>
                <small>{lang === 'zh' ? '登录或注册' : 'Sign in or register'}</small>
              </span>
            </Link>
          </div>
        )}
      </aside>
      <label aria-hidden="true" className="sidebar-backdrop" htmlFor="app-sidebar-toggle" />

      <header className="masthead container">
        <div className="masthead__tagline">{t(lang, 'tagline')}</div>
        {showPageMeta && (
          <div className="masthead__meta">
            {dateLabel && <span>{dateLabel}</span>}
            {sidebarSourceCount > 0 && (
              <span>
                {sidebarSourceCount} {t(lang, 'header.sources')}
              </span>
            )}
            {sidebarItemCount > 0 && (
              <span>
                {sidebarItemCount} {t(lang, 'header.items')}
              </span>
            )}
          </div>
        )}
      </header>
    </>
  )
}
