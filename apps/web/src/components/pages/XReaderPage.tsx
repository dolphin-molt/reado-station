import Link from 'next/link'

import { NewsCard } from '@/components/news/NewsCard'
import { ProcessingQueueAutoRefresh } from '@/components/ui/ProcessingQueueAutoRefresh'
import { getCurrentAuthSession } from '@/lib/auth'
import { getD1Binding } from '@/lib/cloudflare'
import { localizedPath, t, type Lang } from '@/lib/i18n'
import { getDefaultWorkspaceForUser } from '@/lib/workspaces'
import { loadWorkspaceXReaderData } from '@/lib/x-accounts'

interface XReaderPageProps {
  account?: string | null
  lang: Lang
  subscribed?: boolean
}

function sourceDetailHref(lang: Lang, username: string): string {
  return `${localizedPath(lang, 'sources')}/tw-${encodeURIComponent(username.toLowerCase())}`
}

function xProfileHref(username: string): string {
  return `https://x.com/${username}`
}

function statusLabel(status: string, lang: Lang): string {
  if (status === 'queued') return lang === 'zh' ? '排队中' : 'Queued'
  if (status === 'running') return lang === 'zh' ? '处理中' : 'Processing'
  if (status === 'failed') return lang === 'zh' ? '处理失败' : 'Failed'
  if (status === 'ready') return lang === 'zh' ? '已完成' : 'Ready'
  return lang === 'zh' ? '等待处理' : 'Pending'
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
  const readySubscriptions = data.subscriptions.filter((entry) => entry.status === 'ready')
  const processingSubscriptions = data.subscriptions.filter((entry) => entry.status !== 'ready')
  const selectedProcessing = account
    ? processingSubscriptions.find((entry) => entry.account.username.toLowerCase() === account.toLowerCase())
    : null
  const shouldAutoRefresh = processingSubscriptions.some((entry) => entry.status !== 'failed')

  return (
    <main className="container section-stack">
      <section className="panel x-reader">
        {shouldAutoRefresh && <ProcessingQueueAutoRefresh />}
        <div className="panel__header">
          <div>
            <h2>{t(lang, 'xReader.title')}</h2>
          </div>
          <Link className="nav-button" href={`${localizedPath(lang, 'sources/new')}?type=x`}>
            {t(lang, 'xReader.addAccount')}
          </Link>
        </div>

        {subscribed && selectedProcessing && (
          <div className="source-intake__notice">
            {lang === 'zh'
              ? `已加入处理队列：@${selectedProcessing.account.username}。处理完成后会出现在 X 账号列表。`
              : `Added to processing queue: @${selectedProcessing.account.username}. It will appear in X accounts when processing finishes.`}
          </div>
        )}

        {subscribed && !selectedProcessing && data.activeAccount && (
          <div className="source-intake__notice">
            {lang === 'zh'
              ? `处理完成：@${data.activeAccount.account.username}，可以查看了。`
              : `Processing complete: @${data.activeAccount.account.username}. It is ready to read.`}
          </div>
        )}

        {data.subscriptions.length > 0 ? (
          <div className="x-reader__layout">
            <aside className="x-reader__accounts">
              <nav className="x-reader__account-list">
                {readySubscriptions.map((entry) => {
                  const active = data.activeAccount?.account.id === entry.account.id
                  return (
                    <article className="x-reader__account" data-active={active} key={entry.account.id}>
                      <Link className="x-reader__account-main" href={sourceDetailHref(lang, entry.account.username)}>
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
                      </div>
                    </article>
                  )
                })}
              </nav>
            </aside>

            <div className="x-reader__content">
              {processingSubscriptions.length > 0 && (
                <section className="x-reader__queue" aria-live="polite">
                  <div className="x-reader__queue-head">
                    <h3>{lang === 'zh' ? '处理队列' : 'Processing queue'}</h3>
                    <p>{lang === 'zh' ? '账号资料已保存；内容采集完成后会进入 X 账号列表。' : 'Profiles are saved. Accounts move into the X list after collection finishes.'}</p>
                  </div>
                  <div className="x-reader__queue-list">
                    {processingSubscriptions.map((entry) => (
                      <article className="x-reader__queue-item" key={entry.account.id}>
                        {entry.account.profileImageUrl ? (
                          <img alt="" className="x-reader__avatar x-reader__avatar--image" src={entry.account.profileImageUrl} />
                        ) : (
                          <span className="x-reader__avatar">{entry.account.name.slice(0, 1)}</span>
                        )}
                        <div>
                          <strong>{entry.account.name}</strong>
                          <small>@{entry.account.username}</small>
                        </div>
                        <span className="status-pill">{statusLabel(entry.status, lang)}</span>
                      </article>
                    ))}
                  </div>
                </section>
              )}

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
                          <a href={xProfileHref(data.activeAccount.account.username)} rel="noreferrer" target="_blank">
                            {data.activeAccount.account.name}
                          </a>
                        </h3>
                        <p>
                          <a href={xProfileHref(data.activeAccount.account.username)} rel="noreferrer" target="_blank">
                            @{data.activeAccount.account.username}
                          </a>
                        </p>
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
                    : processingSubscriptions.length > 0
                      ? (lang === 'zh' ? '正在处理，完成后这里会出现可读账号。' : 'Processing is underway. Ready accounts will appear here.')
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
