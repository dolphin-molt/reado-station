import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { getArchiveDays } from '@/lib/content'
import { t, type Lang } from '@/lib/i18n'

export async function ArchivePage({ lang }: { lang: Lang }) {
  const days = await getArchiveDays()

  return (
    <div className="page-shell">
      <Header lang={lang} active="archive" path="archive" />

      <main className="container section-stack">
        <section className="panel panel--narrow">
          <div className="panel__header">
            <h1>{t(lang, 'archive.title')}</h1>
          </div>

          {days.length > 0 ? (
            <ul className="archive-list">
              {days.map((day) => (
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
        </section>
      </main>

      <Footer lang={lang} />
    </div>
  )
}
