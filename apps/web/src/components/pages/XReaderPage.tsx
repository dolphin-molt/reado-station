import Link from 'next/link'

import { NewsCard } from '@/components/news/NewsCard'
import { getCurrentAuthSession } from '@/lib/auth'
import { getD1Binding } from '@/lib/cloudflare'
import { localizedPath, readerHomePath, t, type Lang } from '@/lib/i18n'
import { getDefaultWorkspaceForUser } from '@/lib/workspaces'
import { loadWorkspaceXReaderData } from '@/lib/x-accounts'

interface XReaderPageProps {
  account?: string | null
  lang: Lang
  subscribed?: boolean
}

function accountHref(lang: Lang, username: string): string {
  const base = readerHomePath(lang)
  return `${base}?category=twitter&account=${encodeURIComponent(username)}`
}

function sourceDetailHref(lang: Lang, username: string): string {
  return `${localizedPath(lang, 'sources')}/tw-${encodeURIComponent(username.toLowerCase())}`
}

export async function XReaderPage({ account = null, lang, subscribed = false }: XReaderPageProps) {
  const session = await getCurrentAuthSession()

  if (!session) {
    const addSourcePath = `${localizedPath(lang, 'sources/new')}?type=x`
    const loginPath = `${localizedPath(lang, 'login')}?next=${encodeURIComponent(addSourcePath)}`

    return (
      <main className="container section-stack">
        <section className="panel panel--narrow x-reader-empty">
          <h2>{t(lang, 'xReader.loginTitle')}</h2>
          <p>{t(lang, 'xReader.loginText')}</p>
          <div className="admin-actions">
            <Link className="nav-button" href={loginPath}>
              {t(lang, 'auth.login')}
            </Link>
            <Link className="table-link" href={addSourcePath}>
              {t(lang, 'xReader.addAccount')}
            </Link>
          </div>
        </section>
      </main>
    )
  }

  const db = await getD1Binding().catch(() => null)
  if (!db) {
    return (
      <main className="container section-stack">
        <section className="panel panel--narrow x-reader-empty">
          <h2>{t(lang, 'xReader.unavailableTitle')}</h2>
          <p>{t(lang, 'xReader.unavailableText')}</p>
        </section>
      </main>
    )
  }

  const workspace = await getDefaultWorkspaceForUser(db, session.userId, session.username)
  const data = await loadWorkspaceXReaderData(db, workspace.id, account)

  return (
    <main className="container section-stack">
      <section className="panel x-reader">
        <div className="panel__header">
          <div>
            <h2>{t(lang, 'xReader.title')}</h2>
          </div>
          <Link className="nav-button" href={`${localizedPath(lang, 'sources/new')}?type=x`}>
            {t(lang, 'xReader.addAccount')}
          </Link>
        </div>

        {subscribed && data.activeAccount && (
          <div className="source-intake__notice">
            {t(lang, 'xReader.subscribedPrefix')} @{data.activeAccount.account.username}
          </div>
        )}

        {data.subscriptions.length > 0 ? (
          <div className="x-reader__layout">
            <aside className="x-reader__accounts">
              <nav className="x-reader__account-list">
                {data.subscriptions.map((entry) => {
                  const active = data.activeAccount?.account.id === entry.account.id
                  return (
                    <article className="x-reader__account" data-active={active} key={entry.account.id}>
                      <Link className="x-reader__account-main" href={accountHref(lang, entry.account.username)}>
                        <div className="x-reader__account-header">
                          {entry.account.profileImageUrl ? (
                            <img alt="" className="x-reader__avatar x-reader__avatar--image" src={entry.account.profileImageUrl} />
                          ) : (
                            <span className="x-reader__avatar">{entry.account.name.slice(0, 1)}</span>
                          )}
                          <div className="x-reader__account-text">
                            <strong>{entry.account.name}</strong>
                            <small>@{entry.account.username}</small>
                          </div>
                        </div>
                      </Link>
                      <div className="x-reader__account-meta">
                        <span>{entry.itemCount} {t(lang, 'xReader.items')}</span>
                        <Link className="x-reader__account-detail" href={sourceDetailHref(lang, entry.account.username)}>
                          {t(lang, 'xReader.detail')}
                        </Link>
                      </div>
                    </article>
                  )
                })}
              </nav>
            </aside>

            <div className="x-reader__content">
              {data.activeAccount && (
                <section className="x-reader__profile">
                  {data.activeAccount.account.profileImageUrl ? (
                    <img alt="" className="x-reader__profile-avatar x-reader__profile-avatar--image" src={data.activeAccount.account.profileImageUrl} />
                  ) : (
                    <span className="x-reader__profile-avatar">{data.activeAccount.account.name.slice(0, 1)}</span>
                  )}

                  <div className="x-reader__profile-body">
                    <div className="x-reader__profile-headline">
                      <div>
                        <h3>
                          <a href={`https://x.com/${data.activeAccount.account.username}`} rel="noreferrer" target="_blank">
                            {data.activeAccount.account.name}
                          </a>
                        </h3>
                        <p>@{data.activeAccount.account.username}</p>
                      </div>
                      {data.activeAccount.account.verified && <span className="status-pill status-pill--ok">Verified</span>}
                    </div>

                    {data.activeAccount.account.description && <p className="x-reader__profile-description">{data.activeAccount.account.description}</p>}

                    <div className="x-reader__profile-stats">
                      {data.activeAccount.account.followersCount != null && (
                        <span>{data.activeAccount.account.followersCount} {t(lang, 'xReader.followers')}</span>
                      )}
                      <span>{data.activeAccount.itemCount} {t(lang, 'xReader.items')}</span>
                    </div>
                  </div>
                </section>
              )}

              {data.items.length > 0 ? (
                <div className="news-grid">
                  {data.items.map((item) => (
                    <NewsCard item={item} key={item.id} lang={lang} />
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  {data.activeAccount
                    ? `${t(lang, 'xReader.emptyItemsPrefix')} @${data.activeAccount.account.username}`
                    : t(lang, 'xReader.empty')}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="empty-state x-reader__empty">
            <p>{t(lang, 'xReader.empty')}</p>
            <Link className="table-link" href={`${localizedPath(lang, 'sources/new')}?type=x`}>
              {t(lang, 'xReader.addAccount')}
            </Link>
          </div>
        )}
      </section>
    </main>
  )
}
