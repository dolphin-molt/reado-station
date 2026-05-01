import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ExternalBlankLink } from '@/components/common/ExternalBlankLink'
import { InlineYouTubePlayer } from '@/components/common/InlineYouTubePlayer'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { channelSubtitle, findMarketChannel, type MarketChannel } from '@/lib/channel-catalog'
import { loadChannelProfileMock, type MockPost } from '@/lib/channel-profile-mock'
import { localizedPath, type Lang } from '@/lib/i18n'

function sourceExternalUrl(channel: MarketChannel): string {
  if (channel.type === 'x') return `https://x.com/${channel.value}`
  return channel.value
}

function compactNumber(value: number | undefined, lang: Lang): string {
  if (typeof value !== 'number') return ''
  return new Intl.NumberFormat(lang === 'zh' ? 'zh-CN' : 'en-US', {
    maximumFractionDigits: 1,
    notation: 'compact',
  }).format(value)
}

function extensionTitle(key: string, lang: Lang): string {
  const titles = {
    github: { en: 'GitHub projects', zh: 'GitHub 项目' },
    videos: { en: 'YouTube', zh: 'YouTube' },
    website: { en: 'Website', zh: '个人网站' },
  } as const
  return titles[key as keyof typeof titles]?.[lang] ?? key
}

function extensionMetrics(item: { commits?: string; forks?: string; language?: string; stars?: string }) {
  return [
    item.stars ? `${item.stars} stars` : null,
    item.forks ? `${item.forks} forks` : null,
    item.commits ? `${item.commits} commits` : null,
    item.language ?? null,
  ].filter(Boolean)
}

export async function ChannelProfilePage({ id, lang }: { id: string; lang: Lang }) {
  const channel = findMarketChannel(id)
  if (!channel) notFound()
  const mock = await loadChannelProfileMock(id)
  const account = mock?.account
  const posts = mock?.posts ?? []
  const displayPosts: MockPost[] = posts.length > 0
    ? posts
    : channel.samples[lang].map((sample) => ({ id: sample, text: sample, url: '' }))
  const externalUrl = sourceExternalUrl(channel)
  const extensionEntries = Object.entries(mock?.extensions ?? {}).filter(([, items]) => items && items.length > 0)
  const website = mock?.extensions?.website?.[0]
  const githubProfile = account?.username ? `https://github.com/${account.username}` : 'https://github.com/karpathy'
  const youtubeChannel = mock?.extensions?.videos?.find((item) => item.url.includes('@'))?.url

  return (
    <div className="page-shell reader-shell">
      <Header active="channels" lang={lang} path={`channels/${id}`} />
      <main className="container section-stack">
        <section className="panel channel-profile">
          <Link className="channel-profile__back" href={localizedPath(lang, 'channels')}>
            {lang === 'zh' ? '返回' : 'Back'}
          </Link>
          <div className="channel-profile__hero">
            <div>
              <span>{channel.type.toUpperCase()} · {account?.verified ? (lang === 'zh' ? '已认证' : 'Verified') : channel.role[lang]}</span>
              <h1>{account?.name ?? channel.name}</h1>
              <p>
                <a className="channel-profile__source-link" href={externalUrl} rel="noreferrer" target="_blank">
                  {account ? `@${account.username}` : channelSubtitle(channel)}
                </a>
              </p>
            </div>
            <form action="/api/channel-subscriptions/batch" method="post">
              <input name="lang" type="hidden" value={lang} />
              <input name="next" type="hidden" value={localizedPath(lang, 'sources')} />
              <input name="channelId" type="hidden" value={channel.id} />
              <button
                aria-label={lang === 'zh' ? '加入我的信息源' : 'Add to my sources'}
                className="channel-profile__add-button"
                title={lang === 'zh' ? '加入我的信息源' : 'Add to my sources'}
                type="submit"
              >
                +
              </button>
            </form>
          </div>

          <section className="channel-profile__content">
            {mock?.error ? (
              <div className="channel-profile__probe-error">
                <strong>{lang === 'zh' ? '本次没有返回可展示数据' : 'No displayable data returned'}</strong>
                <p>{mock.error}</p>
                {mock.request && (
                  <small>
                    {mock.request.endpoint} · expansions={mock.request.expansions.join(',')}
                  </small>
                )}
              </div>
            ) : (
              <>
                {account && (
                  <section className="channel-profile__account-card">
                    {account.profileImageUrl && <img alt="" src={account.profileImageUrl} />}
                    <div>
                      <p>{account.description}</p>
                      <div className="channel-profile__metric-row">
                        <span>{compactNumber(account.publicMetrics?.followers_count, lang)} followers</span>
                        <span>{compactNumber(account.publicMetrics?.tweet_count, lang)} posts</span>
                        <span>{account.location}</span>
                        {account.expandedUrl && <a href={account.expandedUrl} rel="noreferrer" target="_blank">{account.expandedUrl.replace(/^https?:\/\//, '')}</a>}
                        <a href={githubProfile} rel="noreferrer" target="_blank">github.com/{account.username}</a>
                        {youtubeChannel && <a href={youtubeChannel} rel="noreferrer" target="_blank">YouTube</a>}
                      </div>
                    </div>
                  </section>
                )}
                <div className="channel-profile__sample-list">
                  {displayPosts.map((post) => (
                    <article key={post.id}>
                      <span>{post.createdAt ? new Date(post.createdAt).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US') : channel.type.toUpperCase()}</span>
                      <h3>{post.text}</h3>
                      {post.publicMetrics && (
                        <p>
                          {[
                            ['likes', post.publicMetrics.like_count],
                            ['reposts', post.publicMetrics.retweet_count],
                            ['replies', post.publicMetrics.reply_count],
                            ['views', post.publicMetrics.impression_count],
                          ].filter(([, value]) => typeof value === 'number').map(([key, value]) => `${compactNumber(value as number, lang)} ${key}`).join(' / ')}
                        </p>
                      )}
                      {post.url && <a className="table-link" href={post.url} rel="noreferrer" target="_blank">{lang === 'zh' ? '查看原帖' : 'View original post'}</a>}
                    </article>
                  ))}
                </div>
                {extensionEntries.length > 0 && (
                  <section className="channel-profile__extensions">
                    {website && (
                      <a className="channel-profile__website-band" href={website.url} rel="noreferrer" target="_blank">
                        <span>{lang === 'zh' ? '个人网站' : 'Website'}</span>
                        <strong>{website.title}</strong>
                        {website.summary && <p>{website.summary}</p>}
                      </a>
                    )}
                    {extensionEntries.filter(([key]) => key !== 'website').map(([key, items]) => (
                      <section className="channel-profile__extension-group" key={key}>
                        <h3>{extensionTitle(key, lang)}</h3>
                        <div>
                          {items?.map((item) => (
                            item.kind === 'video' && item.thumbnailUrl ? (
                              <article className="channel-profile__video-card" key={item.url}>
                                <InlineYouTubePlayer className="channel-profile__video-cover" thumbnailUrl={item.thumbnailUrl} title={item.title} url={item.url} />
                                <ExternalBlankLink className="channel-profile__video-meta" href={item.url}>
                                  <span>{item.meta ?? item.source}</span>
                                  <strong>{item.title}</strong>
                                  {item.summary && <p>{item.summary}</p>}
                                </ExternalBlankLink>
                              </article>
                            ) : (
                              <a className="channel-profile__media-link" href={item.url} key={item.url} rel="noreferrer" target="_blank">
                                {item.thumbnailUrl && <img alt="" src={item.thumbnailUrl} />}
                                <span>{item.meta ?? item.source}</span>
                                <strong>{item.title}</strong>
                                {extensionMetrics(item).length > 0 && (
                                  <ul className="channel-profile__extension-metrics">
                                    {extensionMetrics(item).map((metric) => <li key={metric}>{metric}</li>)}
                                  </ul>
                                )}
                                {item.summary && <p>{item.summary}</p>}
                              </a>
                            )
                          ))}
                        </div>
                      </section>
                    ))}
                  </section>
                )}
              </>
            )}
          </section>

        </section>
      </main>
      <Footer lang={lang} />
    </div>
  )
}
