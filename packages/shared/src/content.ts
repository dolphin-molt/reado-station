export interface InfoItem {
  title: string
  url: string
  summary: string
  publishedAt: string
  source: string
  sourceName: string
}

export interface SiteItem extends InfoItem {
  id: string
  date: string
  batch: string
  category: string
  imageUrl: string
  titleZh?: string
  summaryZh?: string
}

export interface DayMeta {
  date: string
  batches: string[]
  itemCount: number
  digestPath: string | null
}

export interface DigestStory {
  title: string
  titleZh?: string
  summary: string
  summaryZh?: string
  sources: Array<{ name: string; url: string }>
  impact?: string
}

export interface DigestCluster {
  name: string
  stories: DigestStory[]
}

export interface Observation {
  expert: string
  avatar: string
  text: string
}

export interface DigestData {
  date: string
  headline: string
  observationText: string
  observations: Observation[]
  clusters: DigestCluster[]
}
