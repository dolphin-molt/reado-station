import Link from 'next/link'

import type { PaginationMeta } from '@/lib/pagination'

interface AdminPaginationProps {
  basePath: string
  pagination: PaginationMeta
  params?: Record<string, string>
}

function hrefFor(basePath: string, params: Record<string, string>, page: number): string {
  const nextParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) nextParams.set(key, value)
  }
  if (page > 1) nextParams.set('page', String(page))
  else nextParams.delete('page')
  const query = nextParams.toString()
  return query ? `${basePath}?${query}` : basePath
}

export function AdminPagination({ basePath, pagination, params = {} }: AdminPaginationProps) {
  if (pagination.totalPages <= 1) return null

  return (
    <nav aria-label="后台分页" className="pagination">
      {pagination.hasPrevious ? (
        <Link className="pagination__link" href={hrefFor(basePath, params, pagination.page - 1)}>
          上一页
        </Link>
      ) : (
        <span aria-disabled="true" className="pagination__link pagination__link--disabled">
          上一页
        </span>
      )}
      <span className="pagination__status">
        第 {pagination.page} / {pagination.totalPages} 页
      </span>
      {pagination.hasNext ? (
        <Link className="pagination__link" href={hrefFor(basePath, params, pagination.page + 1)}>
          下一页
        </Link>
      ) : (
        <span aria-disabled="true" className="pagination__link pagination__link--disabled">
          下一页
        </span>
      )}
    </nav>
  )
}
