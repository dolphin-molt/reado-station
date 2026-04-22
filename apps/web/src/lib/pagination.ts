export interface PaginationMeta {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  hasPrevious: boolean
  hasNext: boolean
}

export function parsePageParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number.parseInt(raw ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

export function createPaginationMeta(page: number, pageSize: number, totalItems: number): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)

  return {
    page: safePage,
    pageSize,
    totalItems,
    totalPages,
    hasPrevious: safePage > 1,
    hasNext: safePage < totalPages,
  }
}

export function paginationOffset(pagination: PaginationMeta): number {
  return (pagination.page - 1) * pagination.pageSize
}
