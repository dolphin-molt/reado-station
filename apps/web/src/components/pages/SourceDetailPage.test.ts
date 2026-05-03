import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { SourceDetailPage } from './SourceDetailPage'
import { loadWorkspaceSourceDetail } from '@/lib/my-sources'

vi.mock('@/components/layout/Header', () => ({
  Header: vi.fn(() => createElement('header')),
}))

vi.mock('@/components/layout/Footer', () => ({
  Footer: vi.fn(() => createElement('footer')),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('not-found')
  }),
  useRouter: vi.fn(() => ({ refresh: vi.fn() })),
}))

vi.mock('@/lib/auth', () => ({
  getCurrentAuthSession: vi.fn(async () => ({ userId: 'user-1', username: 'testuser' })),
}))

vi.mock('@/lib/cloudflare', () => ({
  getD1Binding: vi.fn(async () => ({})),
}))

vi.mock('@/lib/workspaces', () => ({
  getDefaultWorkspaceForUser: vi.fn(async () => ({ id: 'workspace-1' })),
}))

vi.mock('@/lib/my-sources', () => ({
  loadWorkspaceSourceDetail: vi.fn(async () => ({
    sourceId: 'tw-openai',
    sourceType: 'x',
    name: '@OpenAI (X)',
    url: 'https://x.com/OpenAI',
    status: 'missing',
    visibility: 'private',
    backfillHours: 24,
    createdAt: '2026-05-01T00:00:00.000Z',
    latestCollectedAt: null,
    itemCount: 0,
    collectionPreferences: {
      includeOriginalPosts: true,
      includeThreads: true,
      includeLongformPosts: true,
      includeReplies: false,
      includeReposts: false,
      includeQuotes: false,
      includeMediaPosts: true,
    },
    preferenceLabels: ['原创', 'Thread', '长文', '媒体帖'],
    latestWindowStart: null,
    latestWindowEnd: null,
    latestCollectionStatus: null,
    latestFailureReason: null,
    profileAssets: [
      {
        kind: 'website',
        title: 'Anthropic',
        url: 'https://www.anthropic.com',
        summary: 'Official Anthropic website.',
      },
      {
        kind: 'github',
        title: 'anthropics',
        url: 'https://github.com/anthropics',
        summary: 'Official Anthropic GitHub organization.',
      },
      {
        kind: 'youtube',
        title: 'Anthropic YouTube',
        url: 'https://www.youtube.com/@anthropic-ai',
        summary: 'Official Anthropic video channel.',
      },
      {
        kind: 'youtube',
        title: 'Prompting 101 | Code w/ Claude',
        url: 'https://www.youtube.com/watch?v=ysPbXH0LpIE',
        summary: 'Anthropic Code w/ Claude session.',
        thumbnailUrl: 'https://i.ytimg.com/vi/ysPbXH0LpIE/hqdefault.jpg',
      },
      {
        kind: 'organization',
        title: 'Anthropic',
        url: 'https://www.anthropic.com/company',
        summary: 'Company profile and public information.',
      },
      {
        kind: 'project',
        title: 'Claude',
        url: 'https://claude.ai',
        summary: 'Anthropic assistant product.',
      },
      {
        kind: 'article',
        title: 'Anthropic company profile',
        url: 'https://www.anthropic.com/news',
        summary: 'Public company updates.',
      },
      {
        kind: 'interview',
        title: 'Anthropic interview',
        url: 'https://example.com/anthropic-interview',
        summary: 'Public interview with the team.',
      },
    ],
    xAccount: {
      username: 'OpenAI',
      name: 'OpenAI',
      description: 'OpenAI mission text.',
      profileImageUrl: '',
      verified: true,
      followersCount: 100,
      tweetCount: 200,
    },
    recentItems: [],
  })),
  sourceDisplayUrl: vi.fn(() => 'https://x.com/OpenAI'),
}))

describe('SourceDetailPage', () => {
  it('renders X source details like an account profile, not an internal collection page', async () => {
    const element = await SourceDetailPage({ lang: 'zh', sourceId: 'tw-openai' })
    const html = renderToStaticMarkup(createElement(() => element))

    expect(html).toContain('OpenAI mission text.')
    expect(html).toContain('href="https://x.com/OpenAI"')
    expect(html).toContain('class="x-verified-mark"')
    expect(html).toContain('title="已认证"')
    expect(html).not.toContain('X · 已认证')
    expect(html).not.toContain('X · 0 条内容')
    expect(html).not.toContain('采集状态')
    expect(html).not.toContain('采集规则')
    expect(html).not.toContain('最近内容')
    expect(html).not.toContain('action="/api/workspace-sources/tw-openai/collect?lang=zh"')
    expect(html).toContain('data-collect-endpoint="/api/workspace-sources/tw-openai/collect?lang=zh"')
    expect(html).toContain('重新采集')
  })

  it('does not replay queue feedback from collect query params', async () => {
    const element = await SourceDetailPage({ collectStatus: 'queued', lang: 'zh', sourceId: 'tw-openai' })
    const html = renderToStaticMarkup(createElement(() => element))

    expect(html).not.toContain('已加入处理队列')
    expect(html).not.toContain('处理完成后页面会自动刷新')
    expect(html).not.toContain('class="app-toast"')
    expect(html).not.toContain('source-intake__notice')
    expect(html).not.toContain('采集状态')
    expect(html).not.toContain('采集规则')
  })

  it('renders profile assets for subscribed X accounts', async () => {
    const element = await SourceDetailPage({ lang: 'zh', sourceId: 'tw-anthropicai' })
    const html = renderToStaticMarkup(createElement(() => element))

    expect(html).not.toContain('相关资产')
    expect(html).toContain('个人网站')
    expect(html).toContain('GitHub 项目')
    expect(html).toContain('YouTube')
    expect(html).toContain('关联组织/项目')
    expect(html).toContain('公开资料/采访')
    expect(html).toContain('class="channel-profile__website-band"')
    expect(html).toContain('href="https://www.anthropic.com"')
    expect(html).toContain('href="https://github.com/anthropics"')
    expect(html).toContain('href="https://www.youtube.com/@anthropic-ai"')
    expect(html).toContain('href="https://claude.ai"')
    expect(html).toContain('href="https://example.com/anthropic-interview"')
    expect(html).toContain('class="channel-profile__video-card"')
    expect(html).toContain('播放 Prompting 101 | Code w/ Claude')
    expect(html).toContain('https://i.ytimg.com/vi/ysPbXH0LpIE/hqdefault.jpg')
  })

  it('puts the X handle beside the avatar and hides raw profile URL bios', async () => {
    vi.mocked(loadWorkspaceSourceDetail).mockResolvedValueOnce({
      sourceId: 'tw-elonmusk',
      sourceType: 'x',
      name: '@elonmusk (X)',
      url: 'https://x.com/elonmusk',
      status: 'ready',
      visibility: 'private',
      backfillHours: 24,
      createdAt: '2026-05-01T00:00:00.000Z',
      latestCollectedAt: null,
      itemCount: 20,
      collectionPreferences: null,
      preferenceLabels: [],
      latestWindowStart: null,
      latestWindowEnd: null,
      latestCollectionStatus: null,
      latestFailureReason: null,
      profileAssets: [
        {
          kind: 'website',
          title: 'Join Us On Our Journey',
          url: 'https://terafab.ai',
          summary: 'Public link discovered from the X profile.',
        },
      ],
      xAccount: {
        username: 'elonmusk',
        name: 'Elon Musk',
        description: 'https://t.co/dDtDyVssfm',
        profileImageUrl: 'https://pbs.twimg.com/profile_images/avatar_normal.jpg',
        verified: false,
        followersCount: 239825435,
        followingCount: 1320,
        listedCount: 168680,
        tweetCount: 102050,
      },
      recentItems: [],
    })

    const element = await SourceDetailPage({ lang: 'zh', sourceId: 'tw-elonmusk' })
    const html = renderToStaticMarkup(createElement(() => element))
    const accountCardIndex = html.indexOf('channel-profile__account-card')
    const avatarIndex = html.indexOf('<img alt="" src="https://pbs.twimg.com/profile_images/avatar_normal.jpg"')
    const handleIndex = html.indexOf('@elonmusk')

    expect(html).not.toContain('https://t.co/dDtDyVssfm')
    expect(accountCardIndex).toBeGreaterThan(-1)
    expect(avatarIndex).toBeGreaterThan(accountCardIndex)
    expect(handleIndex).toBeGreaterThan(avatarIndex)
    expect(html).toContain('主页链接')
    expect(html).not.toContain('个人网站')
    expect(html).toContain('href="https://terafab.ai"')
  })
})
