import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { Pagination } from '@/components/ui/Pagination'
import { getArchivePageData } from '@/lib/content'
import { t, type Lang } from '@/lib/i18n'

export async function ArchivePage({ lang, page = 1 }: { lang: Lang; page?: number }) {
  const data = await getArchivePageData(page)

  return (
    <div className="page-shell">
      <Header lang={lang} active="archive" path="archive" />

      <main className="container section-stack">
        <section className="panel panel--narrow">
          <div className="panel__header">
            <h1>{t(lang, 'archive.title')}</h1>
            <p>
              {data.pagination.totalItems} {t(lang, 'archive.days')}
            </p>
          </div>

          {data.days.length > 0 ? (
            <ul className="archive-list">
              {data.days.map((day) => (
                <li className="archive-day" key={day.date}>
                  <div>
                    <div className="archive-day__date">{day.date}</div>
                    {day.digestPath && (
                      <div className="archive-day__badge">{t(lang, 'archive.digestReady')}</div>
                    )}
                  </div>
                  <div className="archive-day__meta">
                    {day.itemCount} {t(lang, 'archive.items')} · {day.batches.join(', ')}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">{t(lang, 'archive.empty')}</div>
          )}

          <Pagination lang={lang} pagination={data.pagination} path="archive" />
        </section>
      </main>

      <Footer lang={lang} />
    </div>
  )
}
