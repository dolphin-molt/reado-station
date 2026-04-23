import Link from 'next/link'

import { formatDayLabel, localizedPath, switchPath, t, type Lang } from '@/lib/i18n'

type NavKey = 'home' | 'archive' | 'about'

interface HeaderProps {
  lang: Lang
  active: NavKey
  path?: string
  date?: string | null
  itemCount?: number
  sourceCount?: number
}

export function Header({
  lang,
  active,
  path = '',
  date,
  itemCount = 0,
  sourceCount = 0,
}: HeaderProps) {
  const dateLabel = date ? formatDayLabel(date, lang) : undefined

  return (
    <>
      <nav className="topnav">
        <div className="container topnav__inner">
          <Link href={localizedPath(lang)} className="topnav__brand">
            reado
          </Link>

          <div className="topnav__links">
            <Link href={localizedPath(lang)} data-active={active === 'home'}>
              {t(lang, 'nav.today')}
            </Link>
            <Link href={localizedPath(lang, 'archive')} data-active={active === 'archive'}>
              {t(lang, 'nav.archive')}
            </Link>
            <Link href={localizedPath(lang, 'about')} data-active={active === 'about'}>
              {t(lang, 'nav.about')}
            </Link>
          </div>

          <div className="topnav__actions">
            <Link href="/login" className="lang-switch">
              {t(lang, 'auth.login')}
            </Link>
            <Link href={switchPath(lang, path)} className="lang-switch">
              {t(lang, 'lang.switch')}
            </Link>
          </div>
        </div>
      </nav>

      <header className="masthead container">
        <div className="masthead__tagline">{t(lang, 'tagline')}</div>
        <div className="masthead__meta">
          {dateLabel && <span>{dateLabel}</span>}
          {sourceCount > 0 && (
            <span>
              {sourceCount} {t(lang, 'header.sources')}
            </span>
          )}
          {itemCount > 0 && (
            <span>
              {itemCount} {t(lang, 'header.items')}
            </span>
          )}
        </div>
      </header>
    </>
  )
}
