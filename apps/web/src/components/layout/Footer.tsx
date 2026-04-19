import Link from 'next/link'

import { localizedPath, t, type Lang } from '@/lib/i18n'

const FEEDBACK_URL = 'https://github.com/dolphin-molt/reado-station/issues/new/choose'

export function Footer({ lang }: { lang: Lang }) {
  return (
    <footer className="footer container">
      <div className="footer__logo">reado</div>
      <p>{t(lang, 'footer.slogan')}</p>
      <div className="footer__links">
        <Link href={localizedPath(lang, 'about')}>{t(lang, 'nav.about')}</Link>
        <a href={FEEDBACK_URL} target="_blank" rel="noreferrer">
          {t(lang, 'footer.feedback')}
        </a>
      </div>
    </footer>
  )
}
