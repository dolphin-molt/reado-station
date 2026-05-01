import Link from 'next/link'

import type { CategoryOption } from '@/lib/categories'
import { localizedPath, readerHomePath, t, type Lang } from '@/lib/i18n'

interface SourceFilterProps {
  activeCategory: string | null
  categories: CategoryOption[]
  highlightActive?: boolean
  lang: Lang
  totalItems: number
}

function filterHref(lang: Lang, category: string | null): string {
  const base = readerHomePath(lang)
  if (!category) return `${base}?category=all`
  return `${base}?category=${encodeURIComponent(category)}`
}

function categoryLabel(lang: Lang, category: string): string {
  const label = t(lang, `category.${category}`)
  return label.startsWith('category.') ? category : label
}

export function SourceFilter({ activeCategory, categories, highlightActive = true, lang, totalItems }: SourceFilterProps) {
  return (
    <section aria-label={t(lang, 'sourceFilter.label')} className="source-filter">
      <div className="source-filter__header">
        <span className="source-filter__title">{t(lang, 'sourceFilter.title')}</span>
        <Link
          aria-label={lang === 'zh' ? '添加' : 'Add'}
          className="source-filter__add"
          href={localizedPath(lang, 'sources/new')}
          title={lang === 'zh' ? '添加' : 'Add'}
        >
          +
        </Link>
      </div>
      <nav className="source-filter__list">
        <Link
          className="source-filter__item"
          data-active={highlightActive && activeCategory === 'all'}
          data-short={t(lang, 'sourceFilter.all').slice(0, 1)}
          href={filterHref(lang, null)}
        >
          <span>{t(lang, 'sourceFilter.all')}</span>
          <strong>{totalItems}</strong>
        </Link>
        {categories.map((category) => (
          <Link
            className="source-filter__item"
            data-active={highlightActive && activeCategory === category.id}
            data-short={categoryLabel(lang, category.id).slice(0, 1)}
            href={filterHref(lang, category.id)}
            key={category.id}
          >
            <span>{categoryLabel(lang, category.id)}</span>
            <strong>{category.count}</strong>
          </Link>
        ))}
      </nav>
    </section>
  )
}
