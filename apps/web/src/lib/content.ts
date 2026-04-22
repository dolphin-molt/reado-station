import 'server-only'

import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { cache } from 'react'

import type { DayMeta, DigestData, SiteItem } from '../../../../packages/shared/src'
import { D1UnavailableError, getD1Database, shouldRequireD1 } from '@/lib/cloudflare'
import { loadD1ArchivePageContent, loadD1HomePageContent, loadD1SiteContent } from '@/lib/content-d1'
import type { Lang } from '@/lib/i18n'
import { createPaginationMeta, paginationOffset, type PaginationMeta } from '@/lib/pagination'

export interface KeyStory {
  title: string
  summary: string
  sources: Array<{ name: string; url: string }>
  impact?: string
  cluster: string
}

export interface HomePageData {
  date: string | null
  items: SiteItem[]
  observationText: string
  keyStories: KeyStory[]
  pagination: PaginationMeta
  sourceCount: number
  totalItems: number
}

export interface ArchivePageData {
  days: DayMeta[]
  pagination: PaginationMeta
}

export interface SiteContent {
  days: DayMeta[]
  digests: DigestData[]
  items: SiteItem[]
}

const REPO_ROOT = resolve(process.cwd(), '..', '..')
const SITE_DATA_DIR = join(REPO_ROOT, 'site', 'src', 'data')
const SITE_PUBLIC_DIR = join(REPO_ROOT, 'site', 'public')
const HOME_ITEMS_PAGE_SIZE = 48
const ARCHIVE_DAYS_PAGE_SIZE = 20

async function readJsonFile<T>(filename: string, fallback: T): Promise<T> {
  const fullPath = join(SITE_DATA_DIR, filename)
  try {
    const raw = await readFile(fullPath, 'utf8')
    return JSON.parse(raw) as T
  } catch (error) {
    if (!shouldRequireD1()) return fallback
    throw error
  }
}

async function loadJsonSiteContent(): Promise<SiteContent> {
  const [days, digests, items] = await Promise.all([
    readJsonFile<DayMeta[]>('days.json', []),
    readJsonFile<DigestData[]>('digests.json', []),
    readJsonFile<SiteItem[]>('items.json', []),
  ])

  return {
    days: [...days].sort((a, b) => a.date.localeCompare(b.date)),
    digests: [...digests].sort((a, b) => b.date.localeCompare(a.date)),
    items,
  }
}

export const loadSiteContent = cache(async (): Promise<SiteContent> => {
  let db: D1Database | null = null

  try {
    db = await getD1Database()
  } catch (error) {
    if (error instanceof D1UnavailableError || shouldRequireD1()) {
      throw error
    }
    console.warn('D1 content read failed, falling back to repository JSON', error)
  }

  if (db) return loadD1SiteContent(db)
  return loadJsonSiteContent()
})

async function getD1DatabaseForContent(): Promise<D1Database | null> {
  try {
    return await getD1Database()
  } catch (error) {
    if (error instanceof D1UnavailableError || shouldRequireD1()) {
      throw error
    }
    console.warn('D1 content read failed, falling back to repository JSON', error)
    return null
  }
}

function buildKeyStories(digest: DigestData | null | undefined): KeyStory[] {
  const keyStories: KeyStory[] = []
  for (const cluster of digest?.clusters ?? []) {
    for (const story of cluster.stories) {
      keyStories.push({
        title: story.title,
        summary: story.summary,
        sources: story.sources,
        impact: story.impact,
        cluster: cluster.name,
      })
      if (keyStories.length >= 5) break
    }
    if (keyStories.length >= 5) break
  }
  return keyStories
}

export const getArchivePageData = cache(async (page = 1): Promise<ArchivePageData> => {
  const db = await getD1DatabaseForContent()
  if (db) {
    return loadD1ArchivePageContent(db, {
      page,
      pageSize: ARCHIVE_DAYS_PAGE_SIZE,
    })
  }

  const { days } = await loadSiteContent()
  const sortedDays = [...days].sort((a, b) => b.date.localeCompare(a.date))
  const pagination = createPaginationMeta(page, ARCHIVE_DAYS_PAGE_SIZE, sortedDays.length)

  return {
    days: sortedDays.slice(paginationOffset(pagination), paginationOffset(pagination) + pagination.pageSize),
    pagination,
  }
})

export const getHomePageData = cache(async (_lang: Lang, page = 1): Promise<HomePageData> => {
  const db = await getD1DatabaseForContent()
  if (db) {
    const data = await loadD1HomePageContent(db, {
      page,
      pageSize: HOME_ITEMS_PAGE_SIZE,
    })
    return {
      date: data.date,
      items: data.items,
      observationText: data.digest?.observationText ?? '',
      keyStories: buildKeyStories(data.digest),
      pagination: data.pagination,
      sourceCount: data.sourceCount,
      totalItems: data.pagination.totalItems,
    }
  }

  const { days, digests, items } = await loadSiteContent()
  const latestDay = days.at(-1)

  if (!latestDay) {
    const pagination = createPaginationMeta(page, HOME_ITEMS_PAGE_SIZE, 0)
    return {
      date: null,
      items: [],
      observationText: '',
      keyStories: [],
      pagination,
      sourceCount: 0,
      totalItems: 0,
    }
  }

  const todayItems = items.filter((item) => item.date === latestDay.date)
  const pagination = createPaginationMeta(page, HOME_ITEMS_PAGE_SIZE, todayItems.length)
  const pageItems = todayItems.slice(paginationOffset(pagination), paginationOffset(pagination) + pagination.pageSize)
  const sourceCount = new Set(todayItems.map((item) => item.sourceName).filter(Boolean)).size
  const digest = digests.find((entry) => entry.date === latestDay.date)

  return {
    date: latestDay.date,
    items: pageItems,
    observationText: digest?.observationText ?? '',
    keyStories: buildKeyStories(digest),
    pagination,
    sourceCount,
    totalItems: todayItems.length,
  }
})

export function getLegacyAssetPath(assetPath?: string): string | null {
  if (!assetPath) return null
  if (assetPath.startsWith('http://') || assetPath.startsWith('https://')) return assetPath
  if (!assetPath.startsWith('/')) return null
  return `/legacy-assets${assetPath}`
}

export function getSitePublicDir(): string {
  return SITE_PUBLIC_DIR
}
