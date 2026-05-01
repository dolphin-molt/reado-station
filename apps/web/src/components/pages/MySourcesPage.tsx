import Link from 'next/link'

import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { getCurrentAuthSession } from '@/lib/auth'
import { getD1Binding } from '@/lib/cloudflare'
import { localizedPath, type Lang } from '@/lib/i18n'
import { loadWorkspaceSources, sourceDisplayUrl } from '@/lib/my-sources'
import { getDefaultWorkspaceForUser } from '@/lib/workspaces'

export async function MySourcesPage({ lang }: { lang: Lang }) {
  const session = await getCurrentAuthSession()
  const loginPath = `${localizedPath(lang, 'login')}?next=${encodeURIComponent(localizedPath(lang, 'sources'))}`

  if (!session) {
    return (
      <div className="page-shell reader-shell">
        <Header active="source-add" lang={lang} path="sources" />
        <main className="container section-stack">
          <section className="panel panel--narrow">
            <h1>{lang === 'zh' ? '我的信息源' : 'My sources'}</h1>
            <p>{lang === 'zh' ? '登录后查看和管理你关注的信息源。' : 'Sign in to manage your sources.'}</p>
            <Link className="nav-button" href={loginPath}>{lang === 'zh' ? '登录' : 'Sign in'}</Link>
          </section>
        </main>
        <Footer lang={lang} />
      </div>
    )
  }

  const db = await getD1Binding().catch(() => null)
  const workspace = db ? await getDefaultWorkspaceForUser(db, session.userId, session.username) : null
  const sources = db && workspace ? await loadWorkspaceSources(db, workspace.id) : []

  return (
    <div className="page-shell reader-shell">
      <Header active="source-add" lang={lang} path="sources" />
      <main className="container section-stack">
        <section className="panel my-sources">
          <div className="panel__header">
            <div>
              <h1>{lang === 'zh' ? '我的信息源' : 'My sources'}</h1>
              <p>{lang === 'zh' ? '这些是你订阅的输入源，内容采集来自平台公共资源池。' : 'Your subscribed inputs. Collection results are reused from the shared public pool.'}</p>
            </div>
            <Link className="nav-button" href={localizedPath(lang, 'channels')}>{lang === 'zh' ? '发现频道' : 'Discover channels'}</Link>
          </div>

          {sources.length > 0 ? (
            <div className="my-sources__list">
              {sources.map((source) => (
                <article className="my-sources__item" key={source.sourceId}>
                  <div>
                    <div className="source-suggestion__meta">
                      <span className="status-pill status-pill--ok">{source.sourceType.toUpperCase()}</span>
                      <span>{source.status}</span>
                      <span>{source.itemCount} {lang === 'zh' ? '条内容' : 'items'}</span>
                    </div>
                    <h2>{source.name}</h2>
                    <p>{sourceDisplayUrl(source)}</p>
                    <small>{lang === 'zh' ? '最近采集' : 'Last collected'}: {source.latestCollectedAt ?? (lang === 'zh' ? '等待采集' : 'pending')}</small>
                  </div>
                  <div className="source-suggestion__actions">
                    <Link className="table-link" href={localizedPath(lang, 'channels')}>{lang === 'zh' ? '查看频道库' : 'Channel library'}</Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state my-sources__empty">
              <p>{lang === 'zh' ? '你还没有关注任何信息源。先选择一个频道包，reado 才能开始为你建立输入。' : 'No sources yet. Choose a starter pack so reado can build your input stream.'}</p>
              <Link className="table-link" href={localizedPath(lang, 'channels')}>{lang === 'zh' ? '去频道发现' : 'Go to channels'}</Link>
            </div>
          )}
        </section>
      </main>
      <Footer lang={lang} />
    </div>
  )
}
