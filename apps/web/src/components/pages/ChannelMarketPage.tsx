import Link from 'next/link'

import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { ChannelMarket } from '@/components/news/ChannelMarket'
import { localizedPath, type Lang } from '@/lib/i18n'

const copy = {
  zh: {
    kicker: '频道库',
    title: '频道发现',
    subtitle: '发现优质 X 账号、RSS、论文和工具源。',
    custom: '手动添加信息源',
    current: '当前开放',
    coming: '排期中',
    domainLabel: '领域',
    domains: ['AI', '科技', '政治', '经济', '教育', '商业', '科学', '设计'],
  },
  en: {
    kicker: 'Directory',
    title: 'Channel Discovery',
    subtitle: 'Find quality X accounts, RSS feeds, papers, and tools.',
    custom: 'Add source manually',
    current: 'Open now',
    coming: 'Planned',
    domainLabel: 'Domains',
    domains: ['AI', 'Tech', 'Politics', 'Economics', 'Education', 'Business', 'Science', 'Design'],
  },
} satisfies Record<Lang, {
  coming: string
  current: string
  custom: string
  domainLabel: string
  domains: string[]
  kicker: string
  subtitle: string
  title: string
}>

export function ChannelMarketPage({ lang }: { lang: Lang }) {
  const text = copy[lang]

  return (
    <div className="page-shell reader-shell">
      <Header active="channels" lang={lang} path="channels" />

      <main className="container channel-market-page">
        <section className="channel-market-page__hero">
          <div className="channel-market-page__hero-copy">
            <span>{text.kicker}</span>
            <div>
              <h1>{text.title}</h1>
              <p>{text.subtitle}</p>
            </div>
          </div>
          <Link className="channel-directory__action" href={localizedPath(lang, 'sources/new')}>
            {text.custom}
          </Link>
        </section>

        <div className="channel-market-page__workspace">
          <nav aria-label={text.domainLabel} className="channel-market-page__domain-tabs">
            {text.domains.map((domain, index) => (
              <a
                className="channel-market-page__domain"
                data-active={index === 0}
                href={index === 0 ? '#ai-directory' : '#'}
                key={domain}
              >
                <strong>{domain}</strong>
                <span>{index === 0 ? text.current : text.coming}</span>
              </a>
            ))}
          </nav>

          <ChannelMarket contained={false} id="ai-directory" lang={lang} showIntro={false} />
        </div>
      </main>

      <Footer lang={lang} showSlogan={false} />
    </div>
  )
}
