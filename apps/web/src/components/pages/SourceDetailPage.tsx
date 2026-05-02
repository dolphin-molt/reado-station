import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ExternalBlankLink } from '@/components/common/ExternalBlankLink'
import { InlineYouTubePlayer } from '@/components/common/InlineYouTubePlayer'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { SourceCollectButton } from '@/components/ui/SourceCollectButton'
import { getCurrentAuthSession } from '@/lib/auth'
import { getD1Binding } from '@/lib/cloudflare'
import { localizedPath, type Lang } from '@/lib/i18n'
import { loadWorkspaceSourceDetail, sourceDisplayUrl } from '@/lib/my-sources'
import { getDefaultWorkspaceForUser } from '@/lib/workspaces'

function compactNumber(value: number | null | undefined, lang: Lang): string {
  if (typeof value !== 'number') return ''
  return new Intl.NumberFormat(lang === 'zh' ? 'zh-CN' : 'en-US', {
    maximumFractionDigits: 1,
    notation: 'compact',
  }).format(value)
}

function XVerifiedMark({ lang }: { lang: Lang }) {
  const label = lang === 'zh' ? '已认证' : 'Verified'

  return (
    <span aria-label={label} className="x-verified-mark" role="img" title={label}>
      <svg aria-hidden="true" viewBox="0 0 20 20">
        <path d="M10 1.7 12.1 3l2.5-.1 1.1 2.2 2.1 1.3-.5 2.4.5 2.4-2.1 1.3-1.1 2.2-2.5-.1L10 16.3l-2.1-1.3-2.5.1-1.1-2.2-2.1-1.3.5-2.4-.5-2.4 2.1-1.3 1.1-2.2 2.5.1L10 1.7Z" />
        <path d="m6.7 10.1 2 2 4.6-5" />
      </svg>
    </span>
  )
}

function profileAssetKindLabel(kind: string, lang: Lang): string {
  if (kind === 'website') return lang === 'zh' ? '官网' : 'Website'
  if (kind === 'github') return 'GitHub'
  if (kind === 'youtube') return 'YouTube'
  return kind
}

function profileAssetGroupTitle(kind: string, lang: Lang): string {
  if (kind === 'github') return lang === 'zh' ? 'GitHub 项目' : 'GitHub projects'
  if (kind === 'youtube') return 'YouTube'
  return profileAssetKindLabel(kind, lang)
}

function isYouTubeVideoAsset(asset: { kind: string; thumbnailUrl?: string; url: string }): boolean {
  return asset.kind === 'youtube' && Boolean(asset.thumbnailUrl) && (asset.url.includes('youtube.com/watch') || asset.url.includes('youtu.be/'))
}

export async function SourceDetailPage({ lang, sourceId }: { collectStatus?: string; lang: Lang; sourceId: string }) {
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
  const xAccount = source.xAccount

  if (source.sourceType === 'x') {
    const username = xAccount?.username ?? source.sourceId.replace(/^tw-/i, '')
    const displayName = xAccount?.name ?? source.name.replace(/\s*\(X\)$/i, '')
    const xUrl = `https://x.com/${username}`
    const websiteAsset = source.profileAssets.find((asset) => asset.kind === 'website')
    const groupedProfileAssets = [
      ['github', source.profileAssets.filter((asset) => asset.kind === 'github')],
      ['youtube', source.profileAssets.filter((asset) => asset.kind === 'youtube')],
    ].filter(([, assets]) => Array.isArray(assets) && assets.length > 0) as Array<[string, typeof source.profileAssets]>
    const collectEndpoint = `/api/workspace-sources/${encodeURIComponent(source.sourceId)}/collect?lang=${lang}`

    return (
      <div className="page-shell reader-shell">
        <Header active="source-add" lang={lang} path="sources" />
        <main className="container section-stack">
          <section className="panel channel-profile">
            <div className="channel-profile__topbar">
              <Link className="channel-profile__back" href={localizedPath(lang, 'sources')}>
                {lang === 'zh' ? '返回' : 'Back'}
              </Link>
              <SourceCollectButton className="channel-profile__back" endpoint={collectEndpoint} label={lang === 'zh' ? '重新采集' : 'Refresh'} lang={lang} />
            </div>
            <div className="channel-profile__hero">
              <div>
                <h1 className="x-profile-title">
                  {displayName}
                  {xAccount?.verified && <XVerifiedMark lang={lang} />}
                </h1>
                <p>
                  <a className="channel-profile__source-link" href={xUrl} rel="noreferrer" target="_blank">
                    @{username}
                  </a>
                </p>
              </div>
            </div>

            {xAccount && (
              <section className="channel-profile__account-card">
                {xAccount.profileImageUrl && <img alt="" src={xAccount.profileImageUrl} />}
                <div>
                  {xAccount.description && <p>{xAccount.description}</p>}
                  <div className="channel-profile__metric-row">
                    {xAccount.followersCount != null && <span>{compactNumber(xAccount.followersCount, lang)} followers</span>}
                    {xAccount.tweetCount != null && <span>{compactNumber(xAccount.tweetCount, lang)} posts</span>}
                    <a href={xUrl} rel="noreferrer" target="_blank">x.com/{username}</a>
                    {websiteAsset && <a href={websiteAsset.url} rel="noreferrer" target="_blank">{websiteAsset.url.replace(/^https?:\/\//, '')}</a>}
                  </div>
                </div>
              </section>
            )}
            {source.profileAssets.length > 0 && (
              <section className="channel-profile__extensions source-profile-assets">
                {websiteAsset && (
                  <a className="channel-profile__website-band" href={websiteAsset.url} rel="noreferrer" target="_blank">
                    <span>{lang === 'zh' ? '个人网站' : 'Website'}</span>
                    <strong>{websiteAsset.title}</strong>
                    {websiteAsset.summary && <p>{websiteAsset.summary}</p>}
                  </a>
                )}
                {groupedProfileAssets.map(([kind, assets]) => (
                  <section className="channel-profile__extension-group" key={kind}>
                    <h3>{profileAssetGroupTitle(kind, lang)}</h3>
                    <div>
                      {assets.map((asset) => (
                        isYouTubeVideoAsset(asset) ? (
                          <article className="channel-profile__video-card" key={asset.url}>
                            <InlineYouTubePlayer className="channel-profile__video-cover" thumbnailUrl={asset.thumbnailUrl ?? ''} title={asset.title} url={asset.url} />
                            <ExternalBlankLink className="channel-profile__video-meta" href={asset.url}>
                              <span>{asset.meta ?? profileAssetKindLabel(asset.kind, lang)}</span>
                              <strong>{asset.title}</strong>
                              {asset.summary && <p>{asset.summary}</p>}
                            </ExternalBlankLink>
                          </article>
                        ) : (
                          <a className="channel-profile__media-link" href={asset.url} key={asset.url} rel="noreferrer" target="_blank">
                            <span>{asset.meta ?? profileAssetKindLabel(asset.kind, lang)}</span>
                            <strong>{asset.title}</strong>
                            <ul className="channel-profile__extension-metrics">
                              <li>{profileAssetKindLabel(asset.kind, lang)}</li>
                            </ul>
                            {asset.summary && <p>{asset.summary}</p>}
                          </a>
                        )
                      ))}
                    </div>
                  </section>
                ))}
              </section>
            )}
          </section>
        </main>
        <Footer lang={lang} />
      </div>
    )
  }

  const collectEndpoint = `/api/workspace-sources/${encodeURIComponent(source.sourceId)}/collect?lang=${lang}`

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
            <SourceCollectButton className="nav-button" endpoint={collectEndpoint} label={lang === 'zh' ? '重新采集' : 'Collect again'} lang={lang} />
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
