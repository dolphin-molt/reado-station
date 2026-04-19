import 'server-only'

import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { cache } from 'react'

import type { DayMeta, DigestData, SiteItem } from '../../../../packages/shared/src'
import type { Lang } from '@/lib/i18n'

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
  sourceCount: number
}

export interface SiteContent {
  days: DayMeta[]
  digests: DigestData[]
  items: SiteItem[]
}

const REPO_ROOT = resolve(process.cwd(), '..', '..')
const SITE_DATA_DIR = join(REPO_ROOT, 'site', 'src', 'data')
const SITE_PUBLIC_DIR = join(REPO_ROOT, 'site', 'public')

async function readJsonFile<T>(filename: string): Promise<T> {
  const fullPath = join(SITE_DATA_DIR, filename)
  const raw = await readFile(fullPath, 'utf8')
  return JSON.parse(raw) as T
}

export const loadSiteContent = cache(async (): Promise<SiteContent> => {
  const [days, digests, items] = await Promise.all([
    readJsonFile<DayMeta[]>('days.json'),
    readJsonFile<DigestData[]>('digests.json'),
    readJsonFile<SiteItem[]>('items.json'),
  ])

  return {
    days: [...days].sort((a, b) => a.date.localeCompare(b.date)),
    digests: [...digests].sort((a, b) => b.date.localeCompare(a.date)),
    items,
  }
})

export const getArchiveDays = cache(async (): Promise<DayMeta[]> => {
  const { days } = await loadSiteContent()
  return [...days].sort((a, b) => b.date.localeCompare(a.date))
})

export const getHomePageData = cache(async (_lang: Lang): Promise<HomePageData> => {
  const { days, digests, items } = await loadSiteContent()
  const latestDay = days.at(-1)

  if (!latestDay) {
    return {
      date: null,
      items: [],
      observationText: '',
      keyStories: [],
      sourceCount: 0,
    }
  }

  const todayItems = items.filter((item) => item.date === latestDay.date)
  const sourceCount = new Set(todayItems.map((item) => item.sourceName).filter(Boolean)).size
  const digest = digests.find((entry) => entry.date === latestDay.date)

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

  return {
    date: latestDay.date,
    items: todayItems,
    observationText: digest?.observationText ?? '',
    keyStories,
    sourceCount,
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
