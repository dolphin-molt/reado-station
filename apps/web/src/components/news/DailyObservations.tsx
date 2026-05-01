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
    <section className="observations reader-signal-note">
      <div className="reader-signal-note__copy">
        <span className="observations__title">{t(lang, 'observations.title')}</span>
        <h2>{lang === 'zh' ? '今天值得留下的信号' : 'Signals worth keeping today'}</h2>
        <p className="observations__text">{observationText}</p>
      </div>
      <div aria-hidden="true" className="reader-signal-note__meter">
        <span />
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
    </section>
  )
}
