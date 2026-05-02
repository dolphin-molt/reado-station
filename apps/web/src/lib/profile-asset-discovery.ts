import type { SourceProfileAsset } from '@/lib/source-profile-assets'

export interface XProfileForAssetDiscovery {
  description?: string | null
  name: string
  rawJson?: string | null
  username: string
}

export interface ProfileSearchResult {
  title: string
  url: string
  snippet?: string
}

export interface ProfileSearchProvider {
  search(query: string, options?: { limit?: number }): Promise<ProfileSearchResult[]>
}

export interface ProfileAssetSelectorInput {
  candidates: SourceProfileAsset[]
  profile: XProfileForAssetDiscovery
}

export interface ProfileAssetSelector {
  select(input: ProfileAssetSelectorInput): Promise<SourceProfileAsset[]>
}

export interface ProfileAssetDiscoveryOptions {
  assetSelector?: ProfileAssetSelector | null
  fetcher?: typeof fetch
  searchProvider?: ProfileSearchProvider | null
}

interface BraveSearchPayload {
  web?: {
    results?: Array<{
      description?: string
      title?: string
      url?: string
    }>
  }
}

interface OpenAICompatibleChatPayload {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

interface GitHubSearchItem {
  html_url?: string
  login?: string
  type?: string
}

interface GitHubOrgPayload {
  description?: string | null
  html_url?: string
  login?: string
  public_repos?: number
}

function normalizeSlug(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function compactSlug(value: string): string {
  return normalizeSlug(value).replace(/-/g, '')
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values))
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

function safeUrl(value: string): URL | null {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return url
  } catch {
    return null
  }
}

function titleFromHtml(html: string): string | null {
  return html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() || null
}

function urlsFromProfile(profile: XProfileForAssetDiscovery): string[] {
  const urls = Array.from((profile.description ?? '').matchAll(/https?:\/\/[^\s"'<>]+/g)).map((match) => match[0].replace(/[),.]+$/g, ''))
  try {
    const raw = profile.rawJson ? JSON.parse(profile.rawJson) as { data?: { entities?: { url?: { urls?: Array<{ expanded_url?: string; url?: string }> } } } } : null
    const expanded = raw?.data?.entities?.url?.urls?.flatMap((entry) => entry.expanded_url ?? entry.url ?? []) ?? []
    return unique([...urls, ...expanded])
  } catch {
    return unique(urls)
  }
}

function profileSearchQueries(profile: XProfileForAssetDiscovery): string[] {
  return [
    `${profile.name} official website`,
    `${profile.name} GitHub`,
    `${profile.name} YouTube`,
    `${profile.username} official website`,
  ]
}

async function searchResults(provider: ProfileSearchProvider | null | undefined, profile: XProfileForAssetDiscovery): Promise<ProfileSearchResult[]> {
  if (!provider) return []
  const batches = await Promise.all(profileSearchQueries(profile).map((query) => provider.search(query, { limit: 5 }).catch(() => [])))
  return batches.flat()
}

function websiteCandidates(profile: XProfileForAssetDiscovery, results: ProfileSearchResult[]): string[] {
  const nameSlug = normalizeSlug(profile.name)
  const fromProfile = urlsFromProfile(profile)
  const fromSearch = results.map((result) => result.url)
  const direct = [`https://www.${nameSlug}.com/`, `https://${nameSlug}.com/`]
  return unique([...direct, ...fromProfile, ...fromSearch])
    .filter((value) => {
      const url = safeUrl(value)
      if (!url) return false
      const hostname = url.hostname.replace(/^www\./, '')
      if (/\.(avif|gif|jpe?g|png|svg|webp)$/i.test(url.pathname)) return false
      return !hostname.includes('x.com') && !hostname.includes('twitter.com') && !hostname.includes('github.com') && !hostname.includes('youtube.com') && !hostname.includes('youtu.be')
    })
}

function profileIdentityTerms(profile: XProfileForAssetDiscovery): string[] {
  const name = normalizeSlug(profile.name)
  const compactName = compactSlug(profile.name)
  const username = normalizeSlug(profile.username)
  return unique([name, compactName, `${name}s`, `${compactName}s`, username].filter(Boolean))
}

function matchesProfileIdentity(profile: XProfileForAssetDiscovery, ...values: Array<string | null | undefined>): boolean {
  const haystack = values.map((value) => normalizeSlug(value ?? '')).join(' ')
  const compactHaystack = haystack.replace(/-/g, '')
  return profileIdentityTerms(profile).some((term) => {
    const compactTerm = term.replace(/-/g, '')
    return haystack.includes(term) || compactHaystack.includes(compactTerm)
  })
}

async function discoverWebsite(profile: XProfileForAssetDiscovery, results: ProfileSearchResult[], fetcher: typeof fetch): Promise<SourceProfileAsset | null> {
  for (const candidate of websiteCandidates(profile, results)) {
    const url = safeUrl(candidate)
    if (!url) continue
    try {
      const response = await fetcher(url.toString(), { headers: { accept: 'text/html,*/*', 'user-agent': 'reado-station/1.0' } })
      if (!response.ok) continue
      const html = await response.text().catch(() => '')
      const title = titleFromHtml(html) ?? profile.name
      return {
        kind: 'website',
        meta: 'Official website',
        summary: `${profile.name} public website discovered from the profile and public search results.`,
        title,
        url: stripTrailingSlash(url.toString()),
      }
    } catch {
      // Try the next public candidate.
    }
  }
  return null
}

function githubLoginCandidates(profile: XProfileForAssetDiscovery): string[] {
  const name = normalizeSlug(profile.name)
  const username = normalizeSlug(profile.username)
  const compactName = compactSlug(profile.name)
  return unique([name, compactName, `${name}s`, `${compactName}s`, username])
}

function githubSearchUrl(profile: XProfileForAssetDiscovery): string {
  const query = `${profile.name} ${profile.username} type:org`
  const url = new URL('https://api.github.com/search/users')
  url.searchParams.set('q', query)
  url.searchParams.set('per_page', '5')
  return url.toString()
}

async function discoverGitHub(profile: XProfileForAssetDiscovery, results: ProfileSearchResult[], fetcher: typeof fetch): Promise<SourceProfileAsset | null> {
  const discoveredLogins = results.flatMap((result) => {
    const url = safeUrl(result.url)
    if (!url || url.hostname !== 'github.com') return []
    const login = url.pathname.split('/').filter(Boolean)[0]
    return login ? [login] : []
  })

  const searchResponse = await fetcher(githubSearchUrl(profile), {
    headers: { accept: 'application/vnd.github+json', 'user-agent': 'reado-station/1.0' },
  }).catch(() => null)
  const searchPayload = searchResponse?.ok ? await searchResponse.json().catch(() => ({})) as { items?: GitHubSearchItem[] } : {}
  const searchedLogins = (searchPayload.items ?? [])
    .filter((item) => item.type === 'Organization' || item.type === undefined)
    .flatMap((item) => item.login ? [item.login] : [])

  for (const login of unique([...discoveredLogins, ...searchedLogins, ...githubLoginCandidates(profile)])) {
    const response = await fetcher(`https://api.github.com/orgs/${encodeURIComponent(login)}`, {
      headers: { accept: 'application/vnd.github+json', 'user-agent': 'reado-station/1.0' },
    }).catch(() => null)
    if (!response?.ok) continue
    const org = await response.json().catch(() => ({})) as GitHubOrgPayload
    if (!org.login && !org.html_url) continue
    if (typeof org.public_repos === 'number' && org.public_repos <= 0) continue
    if (!matchesProfileIdentity(profile, org.login, org.description, org.html_url)) continue
    const title = org.login ?? login
    return {
      kind: 'github',
      meta: 'GitHub organization',
      summary: org.description ?? `${profile.name} GitHub organization discovered from public provider data.`,
      title,
      url: org.html_url ?? `https://github.com/${title}`,
    }
  }

  return null
}

function youtubeHandleCandidates(profile: XProfileForAssetDiscovery, results: ProfileSearchResult[]): string[] {
  const fromSearch = results.flatMap((result) => {
    const url = safeUrl(result.url)
    if (!url || !url.hostname.includes('youtube.com')) return []
    const handle = url.pathname.split('/').filter(Boolean).find((part) => part.startsWith('@'))
    return handle ? [handle.slice(1)] : []
  })
  const name = normalizeSlug(profile.name)
  const username = normalizeSlug(profile.username)
  return unique([...fromSearch, name, `${name}-ai`, username])
}

function decodeJsonText(value: string): string {
  try {
    return JSON.parse(`"${value.replace(/"/g, '\\"')}"`) as string
  } catch {
    return value
  }
}

function firstYouTubeVideo(html: string): { id: string; title: string } | null {
  const match = html.match(/"videoId"\s*:\s*"([^"]+)"[\s\S]{0,800}?"title"\s*:\s*\{[\s\S]{0,400}?"text"\s*:\s*"([^"]+)"/)
  if (!match?.[1] || !match[2]) return null
  return { id: match[1], title: decodeJsonText(match[2]) }
}

async function discoverYouTube(profile: XProfileForAssetDiscovery, results: ProfileSearchResult[], fetcher: typeof fetch): Promise<SourceProfileAsset[]> {
  for (const handle of youtubeHandleCandidates(profile, results)) {
    const channelUrl = `https://www.youtube.com/@${handle}`
    const response = await fetcher(channelUrl, { headers: { accept: 'text/html,*/*', 'user-agent': 'reado-station/1.0' } }).catch(() => null)
    if (!response?.ok) continue
    const html = await response.text().catch(() => '')
    const title = titleFromHtml(html)?.replace(/\s+-\s+YouTube$/i, '') || `${profile.name} YouTube`
    if (!matchesProfileIdentity(profile, title)) continue
    const assets: SourceProfileAsset[] = [{
      kind: 'youtube',
      meta: 'Video channel',
      summary: `${profile.name} YouTube channel discovered from public provider data.`,
      title: `${title} YouTube`.replace(/ YouTube YouTube$/, ' YouTube'),
      url: channelUrl,
    }]
    const video = firstYouTubeVideo(html)
    if (video) {
      assets.push({
        kind: 'youtube',
        meta: 'Video',
        summary: `${profile.name} public YouTube video.`,
        thumbnailUrl: `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
        title: video.title,
        url: `https://www.youtube.com/watch?v=${video.id}`,
      })
    }
    return assets
  }
  return []
}

function dedupeAssets(assets: SourceProfileAsset[]): SourceProfileAsset[] {
  const seen = new Set<string>()
  return assets.filter((asset) => {
    const key = asset.url.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function normalizeModelAssets(value: unknown): SourceProfileAsset[] {
  const maybeAssets = typeof value === 'object' && value && 'assets' in value ? (value as { assets?: unknown }).assets : value
  if (!Array.isArray(maybeAssets)) return []
  return maybeAssets.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const asset = item as Partial<SourceProfileAsset>
    if (
      (asset.kind !== 'website' && asset.kind !== 'github' && asset.kind !== 'youtube') ||
      typeof asset.title !== 'string' ||
      typeof asset.url !== 'string'
    ) {
      return []
    }
    return [{
      kind: asset.kind,
      meta: typeof asset.meta === 'string' ? asset.meta : undefined,
      summary: typeof asset.summary === 'string' ? asset.summary : '',
      thumbnailUrl: typeof asset.thumbnailUrl === 'string' ? asset.thumbnailUrl : undefined,
      title: asset.title,
      url: asset.url,
    }]
  })
}

export function createBraveSearchProvider(input: {
  apiKey?: string | null
  fetcher?: typeof fetch
}): ProfileSearchProvider | null {
  const apiKey = input.apiKey?.trim()
  if (!apiKey) return null
  const fetcher = input.fetcher ?? fetch
  return {
    async search(query, options) {
      const url = new URL('https://api.search.brave.com/res/v1/web/search')
      url.searchParams.set('q', query)
      url.searchParams.set('count', String(Math.max(1, Math.min(10, options?.limit ?? 5))))
      const response = await fetcher(url.toString(), {
        headers: {
          accept: 'application/json',
          'X-Subscription-Token': apiKey,
        },
      })
      if (!response.ok) return []
      const payload = await response.json().catch(() => ({})) as BraveSearchPayload
      return (payload.web?.results ?? []).flatMap((result) => {
        if (!result.title || !result.url) return []
        return [{
          snippet: result.description,
          title: result.title,
          url: result.url,
        }]
      })
    },
  }
}

export function createOpenAICompatibleProfileAssetSelector(input: {
  apiKey?: string | null
  endpoint?: string | null
  fetcher?: typeof fetch
  model?: string | null
}): ProfileAssetSelector | null {
  const endpoint = input.endpoint?.trim()
  const apiKey = input.apiKey?.trim()
  const model = input.model?.trim()
  if (!endpoint || !apiKey || !model) return null
  const fetcher = input.fetcher ?? fetch
  return {
    async select(selectionInput) {
      const response = await fetcher(endpoint, {
        body: JSON.stringify({
          messages: [
            {
              content: 'Select official profile assets from candidates. Return only JSON: {"assets":[{"kind":"website|github|youtube","title":"...","url":"...","summary":"...","meta":"...","thumbnailUrl":"..."}]}. Prefer official website, official GitHub org, official YouTube channel and high-signal videos. Reject lookalikes, avatars, unrelated same-name channels, and zero-content orgs.',
              role: 'system',
            },
            {
              content: JSON.stringify(selectionInput),
              role: 'user',
            },
          ],
          model,
          response_format: { type: 'json_object' },
        }),
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        method: 'POST',
      })
      if (!response.ok) return []
      const payload = await response.json().catch(() => ({})) as OpenAICompatibleChatPayload
      const content = payload.choices?.[0]?.message?.content
      if (!content) return []
      try {
        return normalizeModelAssets(JSON.parse(content) as unknown)
      } catch {
        return []
      }
    },
  }
}

export async function discoverXProfileAssets(
  profile: XProfileForAssetDiscovery,
  options: ProfileAssetDiscoveryOptions = {},
): Promise<SourceProfileAsset[]> {
  const fetcher = options.fetcher ?? fetch
  const results = await searchResults(options.searchProvider, profile)
  const [website, github, youtube] = await Promise.all([
    discoverWebsite(profile, results, fetcher),
    discoverGitHub(profile, results, fetcher),
    discoverYouTube(profile, results, fetcher),
  ])
  const candidates = dedupeAssets([website, github, ...youtube].filter((asset): asset is SourceProfileAsset => Boolean(asset)))
  if (!options.assetSelector || candidates.length === 0) return candidates
  const selected = await options.assetSelector.select({ candidates, profile }).catch(() => [])
  return selected.length > 0 ? dedupeAssets(selected) : candidates
}
