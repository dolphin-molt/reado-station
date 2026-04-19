import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { t, type Lang } from '@/lib/i18n'

const FEEDBACK_URL = 'https://github.com/dolphin-molt/reado-station/issues/new/choose'

export function AboutPage({ lang }: { lang: Lang }) {
  return (
    <div className="page-shell">
      <Header lang={lang} active="about" path="about" />

      <main className="container section-stack">
        <section className="panel panel--narrow prose-block">
          <h1>{t(lang, 'about.title')}</h1>
          <p className="about-subtitle">{t(lang, 'about.subtitle')}</p>

          <p>{t(lang, 'about.description')}</p>

          <h2>{t(lang, 'about.vision.title')}</h2>
          <p>{t(lang, 'about.vision.text')}</p>

          <h2>{t(lang, 'about.sources.title')}</h2>
          <p>{t(lang, 'about.sources.text')}</p>

          <h2>{t(lang, 'about.how.title')}</h2>
          <p>{t(lang, 'about.how.text')}</p>

          <h2>{t(lang, 'about.join.title')}</h2>
          <p>{t(lang, 'about.join.text')}</p>

          <div className="about-actions">
            <a className="cta-button" href={FEEDBACK_URL} target="_blank" rel="noreferrer">
              {t(lang, 'feedback.cta')}
            </a>
          </div>
        </section>
      </main>

      <Footer lang={lang} />
    </div>
  )
}
