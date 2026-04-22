import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { DailyObservations } from '@/components/news/DailyObservations'
import { KeyStories } from '@/components/news/KeyStories'
import { NewsCard } from '@/components/news/NewsCard'
import { Pagination } from '@/components/ui/Pagination'
import { getHomePageData } from '@/lib/content'
import { t, type Lang } from '@/lib/i18n'

export async function HomePage({ lang, page = 1 }: { lang: Lang; page?: number }) {
  const data = await getHomePageData(lang, page)

  return (
    <div className="page-shell">
      <Header
        lang={lang}
        active="home"
        date={data.date}
        itemCount={data.totalItems}
        sourceCount={data.sourceCount}
      />

      <DailyObservations lang={lang} observationText={data.observationText} />
      <KeyStories lang={lang} stories={data.keyStories} />

      <main className="container section-stack">
        <section className="panel">
          <div className="panel__header">
            <h2>{t(lang, 'allItems.title')}</h2>
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

          <Pagination lang={lang} pagination={data.pagination} />
        </section>
      </main>

      <Footer lang={lang} />
    </div>
  )
}
