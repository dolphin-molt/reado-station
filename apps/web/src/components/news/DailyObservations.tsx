import { t, type Lang } from '@/lib/i18n'

export function DailyObservations({
  lang,
  observationText,
}: {
  lang: Lang
  observationText?: string
}) {
  if (!observationText) return null

  return (
    <section className="observations">
      <div className="container">
        <h2 className="observations__title">{t(lang, 'observations.title')}</h2>
        <p className="observations__text">{observationText}</p>
      </div>
    </section>
  )
}
