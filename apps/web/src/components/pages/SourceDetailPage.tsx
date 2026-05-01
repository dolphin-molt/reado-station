import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { getCurrentAuthSession } from '@/lib/auth'
import { getD1Binding } from '@/lib/cloudflare'
import { localizedPath, type Lang } from '@/lib/i18n'
import { loadWorkspaceSourceDetail, sourceDisplayUrl } from '@/lib/my-sources'
import { getDefaultWorkspaceForUser } from '@/lib/workspaces'

export async function SourceDetailPage({ lang, sourceId }: { lang: Lang; sourceId: string }) {
  const session = await getCurrentAuthSession()
  const loginPath = `${localizedPath(lang, 'login')}?next=${encodeURIComponent(`${localizedPath(lang, 'sources')}/${sourceId}`)}`

  if (!session) {
    return (
      <div className="page-shell reader-shell">
        <Header active="source-add" lang={lang} path="sources" />
        <main className="container section-stack">
          <section className="panel panel--narrow">
            <h1>{lang === 'zh' ? '信息源详情' : 'Source detail'}</h1>
            <p>{lang === 'zh' ? '登录后查看采集状态和最近内容。' : 'Sign in to view collection status and recent items.'}</p>
            <Link className="nav-button" href={loginPath}>{lang === 'zh' ? '登录' : 'Sign in'}</Link>
          </section>
        </main>
        <Footer lang={lang} />
      </div>
    )
  }

  const db = await getD1Binding().catch(() => null)
  if (!db) notFound()

  const workspace = await getDefaultWorkspaceForUser(db, session.userId, session.username)
  const source = await loadWorkspaceSourceDetail(db, workspace.id, sourceId, lang)
  if (!source) notFound()

  return (
    <div className="page-shell reader-shell">
      <Header active="source-add" lang={lang} path="sources" />
      <main className="container section-stack">
        <section className="panel my-sources">
          <div className="panel__header">
            <div>
              <div className="source-suggestion__meta">
                <span className="status-pill status-pill--ok">{source.sourceType.toUpperCase()}</span>
                <span>{source.status}</span>
                <span>{source.itemCount} {lang === 'zh' ? '条内容' : 'items'}</span>
              </div>
              <h1>{source.name}</h1>
              <p>{sourceDisplayUrl(source)}</p>
            </div>
            <form action={`/api/workspace-sources/${encodeURIComponent(source.sourceId)}/collect?lang=${lang}`} method="post">
              <button className="nav-button" type="submit">{lang === 'zh' ? '重新采集' : 'Collect again'}</button>
            </form>
          </div>

          <div className="my-sources__list">
            <article className="my-sources__item">
              <div>
                <div className="source-suggestion__meta">
                  <span>{lang === 'zh' ? '采集窗口' : 'Window'}</span>
                  <span>{source.latestCollectionStatus ?? source.status}</span>
                </div>
                <h2>{lang === 'zh' ? '采集状态' : 'Collection status'}</h2>
                <p>{source.latestWindowStart && source.latestWindowEnd ? `${source.latestWindowStart} - ${source.latestWindowEnd}` : (lang === 'zh' ? '等待首次采集' : 'Waiting for first collection')}</p>
                {source.latestFailureReason && <small>{lang === 'zh' ? '失败原因' : 'Failure'}: {source.latestFailureReason}</small>}
              </div>
            </article>

            {source.collectionPreferences && (
              <article className="my-sources__item">
                <div>
                  <div className="source-suggestion__meta">
                    {source.preferenceLabels.map((label) => <span className="status-pill" key={label}>{label}</span>)}
                  </div>
                  <h2>{lang === 'zh' ? '采集规则' : 'Collection rules'}</h2>
                  <p>{lang === 'zh' ? '这些规则决定这个 workspace 每天读取哪些 X 内容。' : 'These rules decide which X items this workspace reads every day.'}</p>
                </div>
              </article>
            )}
          </div>
        </section>

        <section className="panel my-sources">
          <div className="panel__header">
            <div>
              <h2>{lang === 'zh' ? '最近内容' : 'Recent items'}</h2>
              <p>{lang === 'zh' ? 'X 信息源默认展示原创、thread、长文和原创媒体帖。' : 'X sources show original posts, threads, longform posts, and original media by default.'}</p>
            </div>
          </div>

          {source.recentItems.length > 0 ? (
            <div className="my-sources__list">
              {source.recentItems.map((item) => (
                <article className="my-sources__item" key={item.id}>
                  <div>
                    <div className="source-suggestion__meta">
                      <span>{item.contentType}</span>
                      <span>{item.publishedAt || (lang === 'zh' ? '未知时间' : 'unknown time')}</span>
                    </div>
                    <h2><a href={item.url}>{item.title}</a></h2>
                    {item.summary && <p>{item.summary}</p>}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">{lang === 'zh' ? '还没有可展示的内容。' : 'No visible items yet.'}</div>
          )}
        </section>
      </main>
      <Footer lang={lang} />
    </div>
  )
}
