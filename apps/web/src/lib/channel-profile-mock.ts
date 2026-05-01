import xKarpathyProfile from '@/mocks/channel-profiles/x-karpathy.json'

interface MockAccount {
  id: string
  username: string
  name: string
  description: string
  location?: string
  url?: string
  expandedUrl?: string
  profileImageUrl?: string
  createdAt?: string
  verified?: boolean
  verifiedType?: string
  protected?: boolean
  pinnedTweetId?: string
  publicMetrics?: Record<string, number>
}

export interface MockPost {
  id: string
  url: string
  text: string
  createdAt?: string
  lang?: string
  publicMetrics?: Record<string, number>
}

export interface MockExtensionItem {
  commits?: string
  title: string
  url: string
  embedUrl?: string
  evidence?: string
  forks?: string
  kind?: 'channel' | 'repo' | 'video' | 'website'
  language?: string
  meta?: string
  source?: string
  stars?: string
  summary?: string
  thumbnailUrl?: string
}

export interface ChannelProfileMock {
  id: string
  fetchedAt: string
  status: number
  error?: string
  account: MockAccount | null
  posts: MockPost[]
  extensions?: {
    website?: MockExtensionItem[]
    github?: MockExtensionItem[]
    videos?: MockExtensionItem[]
  }
  request?: {
    endpoint: string
    expansions: string[]
    userFields: string[]
    tweetFields: string[]
  }
}

const mocks: Record<string, ChannelProfileMock> = {
  'x-karpathy': xKarpathyProfile as ChannelProfileMock,
}

export async function loadChannelProfileMock(id: string): Promise<ChannelProfileMock | null> {
  return mocks[id] ?? null
}
