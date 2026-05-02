import Link from 'next/link'

import { SourceFilter } from '@/components/news/SourceFilter'
import { TaskFloatingPanel } from '@/components/ui/TaskFloatingPanel'
import { getCurrentAuthSession } from '@/lib/auth'
import { getD1Binding } from '@/lib/cloudflare'
import type { CategoryOption } from '@/lib/categories'
import { getSidebarData } from '@/lib/content'
import { formatDayLabel, localizedPath, readerHomePath, switchPath, t, type Lang } from '@/lib/i18n'
import { PLAN_LIMITS } from '@/lib/plans'
import { loadWorkspaceTasks, type WorkspaceTask } from '@/lib/tasks'
import { getDefaultWorkspaceForUser, getWorkspaceCreditBalance, getWorkspaceSourceCount } from '@/lib/workspaces'
import { loadUserXSubscriptionCount } from '@/lib/x-accounts'

type NavKey = 'home' | 'channels' | 'archive' | 'about' | 'source-add' | 'subscription' | 'auth' | 'tasks'

const FEEDBACK_PATH = '/#apply'

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
  showMasthead?: boolean
  showSourceFilter?: boolean
}

function HomeNavIcon() {
  return (
    <svg
      aria-hidden="true"
      className="sidebar-nav__icon"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path d="M4 11.2 12 4l8 7.2" />
      <path d="M6.7 10.7V20h10.6v-9.3" />
      <path d="M10 20v-5.2h4V20" />
    </svg>
  )
}

function ChannelNavIcon() {
  return (
    <svg
      aria-hidden="true"
      className="sidebar-nav__icon"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path d="M5 6.5h14" />
      <path d="M7.5 12h9" />
      <path d="M5 17.5h14" />
      <path d="M9 4.5v4" />
      <path d="M15 10v4" />
      <path d="M11 15.5v4" />
    </svg>
  )
}

function SourcesNavIcon() {
  return (
    <svg
      aria-hidden="true"
      className="sidebar-nav__icon"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path d="M5 5.5h14" />
      <path d="M5 12h14" />
      <path d="M5 18.5h14" />
      <path d="M8.5 4v3" />
      <path d="M15.5 10.5v3" />
      <path d="M11.5 17v3" />
    </svg>
  )
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
  showMasthead: showMastheadProp = true,
  showSourceFilter = true,
}: HeaderProps) {
  let sidebarDate = date
  let sidebarItemCount = itemCount
  let sidebarSourceCount = sourceCount
  let sidebarActiveCategory = activeCategory
  let sidebarCategories = categories
  let activeTasks: WorkspaceTask[] = []

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
  if (session) {
    const db = await getD1Binding().catch(() => null)
    if (db) {
      const workspace = await getDefaultWorkspaceForUser(db, session.userId, session.username)
      activeTasks = await loadWorkspaceTasks(db, workspace.id).catch(() => [])
      if (session.role !== 'admin') {
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
  }

  const dateLabel = sidebarDate ? formatDayLabel(sidebarDate, lang) : undefined
  const navItems = [
    {
      className: 'sidebar-nav__link--home',
      href: readerHomePath(lang),
      icon: <HomeNavIcon />,
      key: 'home' as const,
      label: t(lang, 'nav.today'),
    },
    {
      className: 'sidebar-nav__link--channels',
      href: localizedPath(lang, 'channels'),
      icon: <ChannelNavIcon />,
      key: 'channels' as const,
      label: t(lang, 'nav.channels'),
    },
    {
      className: 'sidebar-nav__link--sources',
      href: localizedPath(lang, 'sources'),
      icon: <SourcesNavIcon />,
      key: 'source-add' as const,
      label: t(lang, 'nav.sources'),
    },
  ]
  const username = session?.username ?? 'admin'
  const userInitial = username.slice(0, 1).toUpperCase()
  const isAdmin = session?.role === 'admin'
  const showPageMeta = active === 'home' && !sidebarActiveCategory
  const highlightSourceFilter = active === 'home' && Boolean(sidebarActiveCategory)
  const showMasthead = showMastheadProp && active === 'home'
  const mastheadTitle = active === 'home' && !sidebarActiveCategory
    ? t(lang, 'home.briefTitle')
    : t(lang, 'home.channelTitle')
  const mastheadSubtitle = active === 'home' && !sidebarActiveCategory
    ? t(lang, 'home.briefSubtitle')
    : active === 'home'
      ? t(lang, 'home.channelSubtitle')
      : ''

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
            <Link href={readerHomePath(lang)} className="sidebar-brand">
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
                aria-label={item.label}
                className={`sidebar-nav__link ${item.className}`}
                data-active={active === item.key && !highlightSourceFilter}
                data-short={item.label.slice(0, 1)}
                href={item.href}
                key={item.key}
              >
                {item.icon}
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
              <Link href={switchPath(lang, path)}>{t(lang, 'lang.switch')}</Link>
              <Link href={FEEDBACK_PATH}>
                {t(lang, 'footer.feedback')}
              </Link>
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
      {session && (
        <TaskFloatingPanel lang={lang} tasks={activeTasks.slice(0, 5)} totalCount={activeTasks.length} />
      )}
      <label aria-hidden="true" className="sidebar-backdrop" htmlFor="app-sidebar-toggle" />

      {showMasthead && (
        <header className="masthead container">
          <div className="masthead__copy">
            <span className="masthead__label">{t(lang, 'home.signalLabel')}</span>
            <h1 className="masthead__tagline">{mastheadTitle}</h1>
            {mastheadSubtitle && <p className="masthead__summary">{mastheadSubtitle}</p>}
          </div>
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
      )}
    </>
  )
}
