import type { SiteItem } from '../../../../../packages/shared/src'

import { getLegacyAssetPath } from '@/lib/content'
import { formatPublishedAt, t, type Lang } from '@/lib/i18n'

export function NewsCard({
  item,
  lang,
}: {
  item: SiteItem
  lang: Lang
}) {
  const title = lang === 'zh' && item.titleZh ? item.titleZh : item.title
  const summary = lang === 'zh' && item.summaryZh ? item.summaryZh : item.summary
  const imageUrl = getLegacyAssetPath(item.imageUrl)
  const categoryLabel = t(lang, `category.${item.category}`)

  return (
    <article className="card">
      {imageUrl && (
        <img className="card__image" src={imageUrl} alt="" loading="lazy" />
      )}
      <div className="card__source">
        <span className={`category-tag category-tag--${item.category}`}>{categoryLabel}</span>
        <span>{item.sourceName}</span>
      </div>
      <h3 className="card__title">
        <a href={item.url} target="_blank" rel="noreferrer">
          {title}
        </a>
      </h3>
      {summary && <p className="card__summary">{summary}</p>}
      {item.publishedAt && (
        <div className="card__meta">{formatPublishedAt(item.publishedAt, lang)}</div>
      )}
    </article>
  )
}
