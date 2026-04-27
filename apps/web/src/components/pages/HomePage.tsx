import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { DailyObservations } from '@/components/news/DailyObservations'
import { KeyStories } from '@/components/news/KeyStories'
import { NewsCard } from '@/components/news/NewsCard'
import { XReaderPage } from '@/components/pages/XReaderPage'
import { Pagination } from '@/components/ui/Pagination'
import { getHomePageData } from '@/lib/content'
import { t, type Lang } from '@/lib/i18n'

function ItemsPanel({
  data,
  lang,
  title,
}: {
  data: Awaited<ReturnType<typeof getHomePageData>>
  lang: Lang
  title: string
}) {
  return (
    <main className="container section-stack">
      <section className="panel">
        <div className="panel__header">
          <h2>{title}</h2>
          {data.date && (
            <p>
              {data.pagination.totalItems} {t(lang, 'allItems.items')}
            </p>
          )}
        </div>

        {data.items.length > 0 ? (
          <div className="news-grid">
            {data.items.map((item) => (
              <NewsCard item={item} key={item.id} lang={lang} />
            ))}
          </div>
        ) : (
          <div className="empty-state">{t(lang, 'allItems.empty')}</div>
        )}

        <Pagination
          lang={lang}
          pagination={data.pagination}
          query={data.activeCategory ? { category: data.activeCategory } : undefined}
        />
      </section>
    </main>
  )
}

function DigestPending({ lang }: { lang: Lang }) {
  return (
    <main className="container section-stack">
      <section className="panel">
        <div className="empty-state">{t(lang, 'home.digestPending')}</div>
      </section>
    </main>
  )
}

export async function HomePage({
  account = null,
  category = null,
  lang,
  page = 1,
  subscribed = false,
}: {
  account?: string | null
  category?: string | null
  lang: Lang
  page?: number
  subscribed?: boolean
}) {
  if (category === 'twitter') {
    return (
      <div className="page-shell">
        <Header active="home" activeCategory={category} lang={lang} showSourceFilter />
        <XReaderPage account={account} lang={lang} subscribed={subscribed} />
        <Footer lang={lang} />
      </div>
    )
  }

  const data = await getHomePageData(lang, page, category)
  const hasDigest = Boolean(data.observationText || data.keyStories.length > 0)

  return (
    <div className="page-shell">
      <Header
        lang={lang}
        active="home"
        date={data.date}
        itemCount={data.totalItems}
        sourceCount={data.sourceCount}
        activeCategory={data.activeCategory}
        categories={data.categories}
        showSourceFilter
      />

      {!data.activeCategory ? (
        hasDigest ? (
          <>
            <DailyObservations lang={lang} observationText={data.observationText} />
            <KeyStories lang={lang} stories={data.keyStories} />
          </>
        ) : (
          <DigestPending lang={lang} />
        )
      ) : (
        <ItemsPanel data={data} lang={lang} title={t(lang, 'allItems.title')} />
      )}

      <Footer lang={lang} />
    </div>
  )
}
