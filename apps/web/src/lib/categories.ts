export interface CategoryOption {
  id: string
  count: number
}

const CATEGORY_ORDER = [
  'ai-company',
  'tech-media',
  'opensource',
  'academic',
  'community',
  'twitter',
  'china-media',
]

const CATEGORY_ORDER_INDEX = new Map(CATEGORY_ORDER.map((category, index) => [category, index]))
const PINNED_CATEGORIES = ['twitter']

export function parseCategoryParam(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value
  const normalized = raw?.trim().toLowerCase()
  if (!normalized) return null
  if (normalized === 'all') return 'all'
  return /^[a-z0-9][a-z0-9-]{0,63}$/.test(normalized) ? normalized : null
}

export function buildCategoryOptions(counts: Map<string, number>, activeCategory?: string | null): CategoryOption[] {
  const options = [...counts.entries()]
    .filter(([category, count]) => category && count > 0)
    .map(([id, count]) => ({ id, count }))

  if (activeCategory && !counts.has(activeCategory)) {
    options.push({ id: activeCategory, count: 0 })
  }

  for (const category of PINNED_CATEGORIES) {
    if (!counts.has(category) && category !== activeCategory) {
      options.push({ id: category, count: 0 })
    }
  }

  return options.sort((a, b) => {
    const orderA = CATEGORY_ORDER_INDEX.get(a.id) ?? Number.MAX_SAFE_INTEGER
    const orderB = CATEGORY_ORDER_INDEX.get(b.id) ?? Number.MAX_SAFE_INTEGER
    return orderA - orderB || a.id.localeCompare(b.id)
  })
}
