import Link from 'next/link'

import { localizedPath, t, type Lang } from '@/lib/i18n'
import type { PaginationMeta } from '@/lib/pagination'

interface PaginationProps {
  lang: Lang
  pagination: PaginationMeta
  path?: string
  query?: Record<string, string | null | undefined>
}

function pageHref(lang: Lang, path: string | undefined, page: number, query?: Record<string, string | null | undefined>): string {
  const base = localizedPath(lang, path ?? '')
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value) params.set(key, value)
  }

  if (page > 1) params.set('page', String(page))

  const search = params.toString()
  return search ? `${base}?${search}` : base
}

export function Pagination({ lang, pagination, path, query }: PaginationProps) {
  if (pagination.totalPages <= 1) return null

  return (
    <nav aria-label={t(lang, 'pagination.label')} className="pagination">
      {pagination.hasPrevious ? (
        <Link className="pagination__link" href={pageHref(lang, path, pagination.page - 1, query)}>
          {t(lang, 'pagination.previous')}
        </Link>
      ) : (
        <span aria-disabled="true" className="pagination__link pagination__link--disabled">
          {t(lang, 'pagination.previous')}
        </span>
      )}

      <span className="pagination__status">
        {t(lang, 'pagination.page')} {pagination.page} / {pagination.totalPages}
      </span>

      {pagination.hasNext ? (
        <Link className="pagination__link" href={pageHref(lang, path, pagination.page + 1, query)}>
          {t(lang, 'pagination.next')}
        </Link>
      ) : (
        <span aria-disabled="true" className="pagination__link pagination__link--disabled">
          {t(lang, 'pagination.next')}
        </span>
      )}
    </nav>
  )
}
