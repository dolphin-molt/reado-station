import Link from 'next/link'

import { t, type Lang } from '@/lib/i18n'

const FEEDBACK_PATH = '/#apply'

export function Footer({ lang, showSlogan = true }: { lang: Lang; showSlogan?: boolean }) {
  return (
    <footer className="footer container">
      <div className="footer__logo">reado</div>
      {showSlogan && <p>{t(lang, 'footer.slogan')}</p>}
      <div className="footer__links">
        <Link href={FEEDBACK_PATH}>
          {t(lang, 'footer.feedback')}
        </Link>
      </div>
    </footer>
  )
}
