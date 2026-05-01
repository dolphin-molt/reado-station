import Link from 'next/link'

import {
  channelPacks,
  channelSubtitle,
  manualSourceHref,
  marketChannels,
  sourceHref,
  type MarketChannel,
  type MarketDomain,
} from '@/lib/channel-catalog'
import { type Lang } from '@/lib/i18n'

const domainCopy: Record<MarketDomain, Record<Lang, string>> = {
  ai: { zh: 'AI', en: 'AI' },
  finance: { zh: '金融', en: 'Finance' },
}

const text = {
  zh: {
    ariaLabel: 'AI 与金融频道目录',
    addSelected: '加入我的信息源',
    packs: '频道包',
    profile: '查看主页',
  },
  en: {
    ariaLabel: 'AI and finance channel directory',
    addSelected: 'Add to my sources',
    packs: 'Starter packs',
    profile: 'View profile',
  },
} satisfies Record<Lang, Record<string, string>>

function channelAvatarText(channel: MarketChannel) {
  if (channel.type === 'rss') return 'rss'
  return channel.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toLowerCase()
}

function packSourceNames(channelIds: string[]): string {
  return channelIds
    .map((id) => marketChannels.find((channel) => channel.id === id)?.name)
    .filter(Boolean)
    .join(' / ')
}

function ChannelCard({ channel, lang }: { channel: MarketChannel; lang: Lang }) {
  return (
    <article className="channel-directory__card" data-channel-type={channel.type}>
      <label className="channel-directory__select">
        <input name="channelId" type="checkbox" value={channel.id} />
        <span>{lang === 'zh' ? '选择' : 'Select'}</span>
      </label>
      <div className="channel-directory__profile">
        <span className="channel-directory__avatar" data-channel-type={channel.type}>
          {channelAvatarText(channel)}
        </span>
        <div className="channel-directory__identity">
          <h4>{channel.name}</h4>
          <span>{channelSubtitle(channel)}</span>
        </div>
      </div>
      <div className="source-suggestion__meta">
        <span className="status-pill status-pill--ok">{channel.type.toUpperCase()}</span>
        <span>{channel.role[lang]}</span>
      </div>
      <p className="channel-directory__bio">{channel.description[lang]}</p>
      <ul className="channel-directory__samples">
        {channel.samples[lang].map((sample) => <li key={sample}>{sample}</li>)}
      </ul>
      <div className="channel-directory__card-actions">
        <Link className="table-link" href={sourceHref(lang, channel)}>{text[lang].profile}</Link>
        <Link className="table-link" href={manualSourceHref(lang, channel)}>{lang === 'zh' ? '单独添加' : 'Add one'}</Link>
      </div>
    </article>
  )
}

export function ChannelMarket({
  contained = true,
  id,
  lang,
  showIntro = true,
}: {
  contained?: boolean
  id?: string
  lang: Lang
  showIntro?: boolean
}) {
  const className = contained ? 'container channel-directory' : 'channel-directory'
  const domains: MarketDomain[] = ['ai', 'finance']

  return (
    <section aria-label={text[lang].ariaLabel} className={className} id={id}>
      {showIntro && (
        <div className="channel-directory__intro">
          <div>
            <span>{lang === 'zh' ? '频道库' : 'Directory'}</span>
            <h2>{lang === 'zh' ? '输入频道库' : 'Input channel library'}</h2>
            <p>{lang === 'zh' ? '从可信账号和订阅源开始建立你的每日输入。' : 'Build your daily input from trusted accounts and feeds.'}</p>
          </div>
        </div>
      )}

      <form action="/api/channel-subscriptions/batch" method="post">
        <input name="lang" type="hidden" value={lang} />
        <input name="next" type="hidden" value={lang === 'zh' ? '/sources' : '/en/sources'} />

        <div className="channel-directory__batch-bar">
          <button className="nav-button" type="submit">{text[lang].addSelected}</button>
        </div>

        <section className="channel-directory__packs" aria-label={text[lang].packs}>
          <div className="channel-directory__section-head">
            <div>
              <h3>{text[lang].packs}</h3>
              <p>{lang === 'zh' ? '先从一组可复用的信息源开始，而不是一个个找。' : 'Start with a reusable set instead of finding sources one by one.'}</p>
            </div>
          </div>
          <div className="channel-directory__grid channel-directory__pack-grid">
            {channelPacks.map((pack) => (
              <article className="channel-directory__pack" key={pack.id}>
                <label className="channel-directory__select">
                  <input name="packId" type="checkbox" value={pack.id} />
                  <span>{lang === 'zh' ? '选择整包' : 'Select pack'}</span>
                </label>
                <h4>{pack.title[lang]}</h4>
                <p>{packSourceNames(pack.channelIds)}</p>
                <small>{pack.channelIds.length} {lang === 'zh' ? '个信息源' : 'sources'}</small>
              </article>
            ))}
          </div>
        </section>

        <div className="channel-directory__sections">
          {domains.map((domain) => (
            <section className="channel-directory__section" id={`${domain}-directory`} key={domain}>
              <div className="channel-directory__section-head">
                <div>
                  <h3>{domainCopy[domain][lang]}</h3>
                  <p>{domain === 'ai'
                    ? (lang === 'zh' ? '研究者、公司官方源和工程实践入口。' : 'Researchers, official sources, and engineering practice.')
                    : (lang === 'zh' ? '宏观、监管和市场信息的基础输入。' : 'Baseline inputs for macro, regulation, and markets.')}</p>
                </div>
                <span>{marketChannels.filter((channel) => channel.domain === domain).length} {lang === 'zh' ? '个源' : 'sources'}</span>
              </div>
              <div className="channel-directory__grid">
                {marketChannels.filter((channel) => channel.domain === domain).map((channel) => (
                  <ChannelCard channel={channel} key={channel.id} lang={lang} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </form>
    </section>
  )
}
