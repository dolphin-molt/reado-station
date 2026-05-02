import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { generateObject } from 'ai'
import type { LanguageModel } from 'ai'
import { z } from 'zod/v4'

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

type DiscoverySource = 'profile_url' | 'web_search' | 'provider_api' | 'direct_guess'

interface CandidateProfileAsset extends SourceProfileAsset {
  discoverySource: DiscoverySource
  evidence?: string
}

interface UrlCandidate {
  discoverySource: DiscoverySource
  evidence?: string
  url: string
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

interface BigModelSearchPayload {
  search_result?: Array<{
    content?: string
    link?: string
    title?: string
  }>
}

interface GitHubSearchItem {
  html_url?: string
  login?: string
  type?: string
}

const PROFILE_ASSET_SELECTION_SYSTEM_PROMPT = 'Select official profile assets from candidates. Candidates from web_search and direct_guess are untrusted until you verify they match the X profile. Return only JSON in this shape: {"assets":[{"kind":"website|github|youtube","title":"...","url":"...","summary":"...","meta":"...","thumbnailUrl":"..."}]}. Choose only URLs present in the candidate list. Prefer official website, official GitHub org, official YouTube channel and high-signal videos. Reject parked domains, redirect landers, lookalikes, avatars, unrelated same-name channels, stale fan pages, and zero-content orgs.'

const profileAssetSelectionSchema = z.object({
  assets: z.array(z.object({
    kind: z.enum(['website', 'github', 'youtube']),
    meta: z.string().optional(),
    summary: z.string().default(''),
    thumbnailUrl: z.string().optional(),
    title: z.string(),
    url: z.string(),
  })),
})

type ProfileAssetGenerateObject = (options: {
  maxRetries?: number
  model: LanguageModel
  prompt: string
  schema: typeof profileAssetSelectionSchema
  system: string
}) => Promise<{ object: unknown }>

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

function isRedirectOnlyLander(html: string): boolean {
  const normalized = html.toLowerCase().replace(/\s+/g, '')
  return normalized.includes('window.location.href="/lander"') || normalized.includes("window.location.href='/lander'")
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

function dedupeUrlCandidates(candidates: UrlCandidate[]): UrlCandidate[] {
  const seen = new Set<string>()
  return candidates.filter((candidate) => {
    const key = candidate.url.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function websiteCandidates(profile: XProfileForAssetDiscovery, results: ProfileSearchResult[]): UrlCandidate[] {
  const nameSlug = normalizeSlug(profile.name)
  const fromProfile = urlsFromProfile(profile).map((url) => ({
    discoverySource: 'profile_url' as const,
    evidence: 'URL published on the X profile.',
    url,
  }))
  const fromSearch = results.map((result) => ({
    discoverySource: 'web_search' as const,
    evidence: [result.title, result.snippet].filter(Boolean).join(' - '),
    url: result.url,
  }))
  const direct = nameSlug && !nameSlug.includes('-')
    ? [`https://www.${nameSlug}.com/`, `https://${nameSlug}.com/`].map((url) => ({
      discoverySource: 'direct_guess' as const,
      evidence: 'Generated from the X profile display name.',
      url,
    }))
    : []
  return dedupeUrlCandidates([...fromProfile, ...fromSearch, ...direct])
    .filter((candidate) => {
      const url = safeUrl(candidate.url)
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

async function discoverWebsite(profile: XProfileForAssetDiscovery, results: ProfileSearchResult[], fetcher: typeof fetch): Promise<CandidateProfileAsset | null> {
  for (const candidate of websiteCandidates(profile, results)) {
    const url = safeUrl(candidate.url)
    if (!url) continue
    try {
      const response = await fetcher(url.toString(), { headers: { accept: 'text/html,*/*', 'user-agent': 'reado-station/1.0' } })
      if (!response.ok) continue
      const html = await response.text().catch(() => '')
      if (isRedirectOnlyLander(html)) continue
      const title = titleFromHtml(html)
      if (!title) continue
      const finalUrl = safeUrl(response.url || url.toString()) ?? url
      const finalHostname = finalUrl.hostname.replace(/^www\./, '')
      if (/\.(avif|gif|jpe?g|png|svg|webp)$/i.test(finalUrl.pathname)) continue
      if (finalHostname.includes('x.com') || finalHostname.includes('twitter.com') || finalHostname.includes('github.com') || finalHostname.includes('youtube.com') || finalHostname.includes('youtu.be')) continue
      return {
        discoverySource: candidate.discoverySource,
        evidence: candidate.evidence,
        kind: 'website',
        meta: 'Official website',
        summary: `${profile.name} public website candidate discovered from ${candidate.discoverySource.replace(/_/g, ' ')}.`,
        title,
        url: stripTrailingSlash(finalUrl.toString()),
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

interface LoginCandidate {
  discoverySource: DiscoverySource
  evidence?: string
  login: string
}

function dedupeLoginCandidates(candidates: LoginCandidate[]): LoginCandidate[] {
  const seen = new Set<string>()
  return candidates.filter((candidate) => {
    const key = candidate.login.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function discoverGitHub(profile: XProfileForAssetDiscovery, results: ProfileSearchResult[], fetcher: typeof fetch): Promise<CandidateProfileAsset | null> {
  const discoveredLogins = results.flatMap((result) => {
    const url = safeUrl(result.url)
    if (!url || url.hostname !== 'github.com') return []
    const login = url.pathname.split('/').filter(Boolean)[0]
    return login ? [{
      discoverySource: 'web_search' as const,
      evidence: [result.title, result.snippet].filter(Boolean).join(' - '),
      login,
    }] : []
  })

  const searchResponse = await fetcher(githubSearchUrl(profile), {
    headers: { accept: 'application/vnd.github+json', 'user-agent': 'reado-station/1.0' },
  }).catch(() => null)
  const searchPayload = searchResponse?.ok ? await searchResponse.json().catch(() => ({})) as { items?: GitHubSearchItem[] } : {}
  const searchedLogins = (searchPayload.items ?? [])
    .filter((item) => item.type === 'Organization' || item.type === undefined)
    .flatMap((item) => item.login ? [{
      discoverySource: 'provider_api' as const,
      evidence: item.html_url ? `GitHub user search returned ${item.html_url}.` : 'GitHub user search returned this organization.',
      login: item.login,
    }] : [])
  const guessedLogins = githubLoginCandidates(profile).map((login) => ({
    discoverySource: 'direct_guess' as const,
    evidence: 'Generated from the X profile display name or username.',
    login,
  }))

  for (const candidate of dedupeLoginCandidates([...discoveredLogins, ...searchedLogins, ...guessedLogins])) {
    const response = await fetcher(`https://api.github.com/orgs/${encodeURIComponent(candidate.login)}`, {
      headers: { accept: 'application/vnd.github+json', 'user-agent': 'reado-station/1.0' },
    }).catch(() => null)
    if (!response?.ok) continue
    const org = await response.json().catch(() => ({})) as GitHubOrgPayload
    if (!org.login && !org.html_url) continue
    if (typeof org.public_repos === 'number' && org.public_repos <= 0) continue
    if (!matchesProfileIdentity(profile, org.login, org.description, org.html_url)) continue
    const title = org.login ?? candidate.login
    return {
      discoverySource: candidate.discoverySource,
      evidence: candidate.evidence,
      kind: 'github',
      meta: 'GitHub organization',
      summary: org.description ?? `${profile.name} GitHub organization discovered from public provider data.`,
      title,
      url: org.html_url ?? `https://github.com/${title}`,
    }
  }

  return null
}

interface YouTubeHandleCandidate {
  discoverySource: DiscoverySource
  evidence?: string
  handle: string
}

function dedupeYouTubeHandleCandidates(candidates: YouTubeHandleCandidate[]): YouTubeHandleCandidate[] {
  const seen = new Set<string>()
  return candidates.filter((candidate) => {
    const key = candidate.handle.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function youtubeHandleCandidates(profile: XProfileForAssetDiscovery, results: ProfileSearchResult[]): YouTubeHandleCandidate[] {
  const fromSearch = results.flatMap((result) => {
    const url = safeUrl(result.url)
    if (!url || !url.hostname.includes('youtube.com')) return []
    const handle = url.pathname.split('/').filter(Boolean).find((part) => part.startsWith('@'))
    return handle ? [{
      discoverySource: 'web_search' as const,
      evidence: [result.title, result.snippet].filter(Boolean).join(' - '),
      handle: handle.slice(1),
    }] : []
  })
  const name = normalizeSlug(profile.name)
  const username = normalizeSlug(profile.username)
  const guessed = [name, `${name}-ai`, username].map((handle) => ({
    discoverySource: 'direct_guess' as const,
    evidence: 'Generated from the X profile display name or username.',
    handle,
  }))
  return dedupeYouTubeHandleCandidates([...fromSearch, ...guessed])
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

async function discoverYouTube(profile: XProfileForAssetDiscovery, results: ProfileSearchResult[], fetcher: typeof fetch): Promise<CandidateProfileAsset[]> {
  for (const candidate of youtubeHandleCandidates(profile, results)) {
    const channelUrl = `https://www.youtube.com/@${candidate.handle}`
    const response = await fetcher(channelUrl, { headers: { accept: 'text/html,*/*', 'user-agent': 'reado-station/1.0' } }).catch(() => null)
    if (!response?.ok) continue
    const html = await response.text().catch(() => '')
    const title = titleFromHtml(html)?.replace(/\s+-\s+YouTube$/i, '') || `${profile.name} YouTube`
    if (!matchesProfileIdentity(profile, title)) continue
    const assets: CandidateProfileAsset[] = [{
      discoverySource: candidate.discoverySource,
      evidence: candidate.evidence,
      kind: 'youtube',
      meta: 'Video channel',
      summary: `${profile.name} YouTube channel discovered from public provider data.`,
      title: `${title} YouTube`.replace(/ YouTube YouTube$/, ' YouTube'),
      url: channelUrl,
    }]
    const video = firstYouTubeVideo(html)
    if (video) {
      assets.push({
        discoverySource: candidate.discoverySource,
        evidence: candidate.evidence,
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

function dedupeAssets<T extends SourceProfileAsset>(assets: T[]): T[] {
  const seen = new Set<string>()
  return assets.filter((asset) => {
    const key = asset.url.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function publicAsset(asset: SourceProfileAsset): SourceProfileAsset {
  return {
    kind: asset.kind,
    meta: asset.meta,
    summary: asset.summary,
    thumbnailUrl: asset.thumbnailUrl,
    title: asset.title,
    url: asset.url,
  }
}

function normalizedAssetUrl(value: string): string {
  return stripTrailingSlash(value).toLowerCase()
}

function selectedCandidateAssets(selected: SourceProfileAsset[], candidates: CandidateProfileAsset[]): SourceProfileAsset[] {
  const candidateUrls = new Set(candidates.map((candidate) => normalizedAssetUrl(candidate.url)))
  return dedupeAssets(selected)
    .filter((asset) => candidateUrls.has(normalizedAssetUrl(asset.url)))
    .map(publicAsset)
}

function trustedFallbackAssets(candidates: CandidateProfileAsset[]): SourceProfileAsset[] {
  return dedupeAssets(candidates)
    .filter((candidate) => candidate.discoverySource === 'profile_url')
    .map(publicAsset)
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

export function createBigModelSearchProvider(input: {
  apiKey?: string | null
  endpoint?: string | null
  fetcher?: typeof fetch
}): ProfileSearchProvider | null {
  const apiKey = input.apiKey?.trim()
  if (!apiKey) return null
  const fetcher = input.fetcher ?? fetch
  const endpoint = input.endpoint?.trim() || 'https://open.bigmodel.cn/api/paas/v4/web_search'
  return {
    async search(query, options) {
      const response = await fetcher(endpoint, {
        body: JSON.stringify({
          content_size: 'medium',
          count: Math.max(1, Math.min(10, options?.limit ?? 5)),
          search_engine: 'search_std',
          search_intent: false,
          search_query: query,
          search_recency_filter: 'noLimit',
        }),
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        method: 'POST',
      })
      if (!response.ok) return []
      const payload = await response.json().catch(() => ({})) as BigModelSearchPayload
      return (payload.search_result ?? []).flatMap((result) => {
        if (!result.title || !result.link) return []
        return [{
          snippet: result.content,
          title: result.title,
          url: result.link,
        }]
      })
    },
  }
}

function openAICompatibleBaseUrl(endpoint: string): string {
  return endpoint.replace(/\/chat\/completions\/?$/i, '').replace(/\/+$/, '')
}

function downgradeJsonSchemaToJsonMode(body: Record<string, unknown>): Record<string, unknown> {
  const responseFormat = body.response_format
  if (!responseFormat || typeof responseFormat !== 'object' || (responseFormat as { type?: unknown }).type !== 'json_schema') return body
  return {
    ...body,
    response_format: { type: 'json_object' },
  }
}

export function createAiSdkProfileAssetSelector(input: {
  apiKey?: string | null
  endpoint?: string | null
  fetcher?: typeof fetch
  generateObject?: ProfileAssetGenerateObject
  jsonModeOnly?: boolean | null
  model?: string | null
  providerName?: string | null
}): ProfileAssetSelector | null {
  const endpoint = input.endpoint?.trim()
  const apiKey = input.apiKey?.trim()
  const model = input.model?.trim()
  if (!endpoint || !apiKey || !model) return null
  const provider = createOpenAICompatible({
    apiKey,
    baseURL: openAICompatibleBaseUrl(endpoint),
    fetch: input.fetcher,
    name: input.providerName?.trim() || 'profile-enrichment',
    supportsStructuredOutputs: true,
    transformRequestBody: input.jsonModeOnly ? downgradeJsonSchemaToJsonMode : undefined,
  })
  const runGenerateObject = input.generateObject ?? ((options) => generateObject({
    maxRetries: options.maxRetries,
    model: options.model,
    prompt: options.prompt,
    schema: options.schema,
    system: options.system,
  }))
  return {
    async select(selectionInput) {
      const result = await runGenerateObject({
        maxRetries: 1,
        model: provider(model),
        prompt: JSON.stringify(selectionInput),
        schema: profileAssetSelectionSchema,
        system: PROFILE_ASSET_SELECTION_SYSTEM_PROMPT,
      })
      return normalizeModelAssets(result.object)
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
  const candidates = dedupeAssets([website, github, ...youtube].filter((asset): asset is CandidateProfileAsset => Boolean(asset)))
  if (candidates.length === 0) return []
  if (!options.assetSelector) return trustedFallbackAssets(candidates)
  const selected = await options.assetSelector.select({ candidates, profile }).catch(() => [])
  const approved = selectedCandidateAssets(selected, candidates)
  return approved.length > 0 ? approved : trustedFallbackAssets(candidates)
}
