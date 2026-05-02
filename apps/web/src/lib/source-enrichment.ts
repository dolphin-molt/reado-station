import 'server-only'

import { getCloudflareEnv, type ReadoCloudflareEnv } from '@/lib/cloudflare'
import { createBraveSearchProvider, createOpenAICompatibleProfileAssetSelector, discoverXProfileAssets, type ProfileAssetDiscoveryOptions } from '@/lib/profile-asset-discovery'
import { presetXProfileAssets, type SourceProfileAsset } from '@/lib/source-profile-assets'

export type EnrichmentJobType =
  | 'discover_profile_assets'
  | 'refresh_github_projects'
  | 'refresh_youtube_assets'
  | 'refresh_personal_site'

export interface EnqueueProfileEnrichmentJobInput {
  jobType: EnrichmentJobType
  sourceType: string
  sourceValue: string
}

interface EnrichmentJobRow {
  id: string
  jobType: EnrichmentJobType
  sourceType: string
  sourceValue: string
}

interface XAccountProfileRow {
  username: string
  name: string
  description: string | null
  profileImageUrl: string | null
  rawJson: string | null
  verified: number | null
}

interface ProfileEnrichmentRunOptions extends ProfileAssetDiscoveryOptions {
  env?: ReadoCloudflareEnv | null
}

export interface ProfileEnrichmentProviderStatus {
  missing: string[]
  model: {
    configured: boolean
    endpointConfigured: boolean
    model: string | null
    provider: 'custom' | 'openai-compatible'
    tokenConfigured: boolean
  }
  ready: boolean
  search: {
    configured: boolean
    provider: 'custom' | 'brave'
  }
}

type ProfileEnrichmentRunResult = NonNullable<Awaited<ReturnType<typeof runOneProfileEnrichmentJob>>>

class ProfileEnrichmentConfigurationError extends Error {
  constructor(public providerStatus: ProfileEnrichmentProviderStatus) {
    super(`Missing profile enrichment providers: ${providerStatus.missing.join(', ')}`)
    this.name = 'ProfileEnrichmentConfigurationError'
  }
}

export async function enqueueProfileEnrichmentJob(
  db: D1Database,
  input: EnqueueProfileEnrichmentJobInput,
): Promise<{ id: string; status: 'queued' | 'existing' }> {
  const existing = await db
    .prepare(
      `
        SELECT id
        FROM enrichment_jobs
        WHERE source_type = ?
          AND lower(source_value) = lower(?)
          AND job_type = ?
          AND status IN ('queued', 'running')
        ORDER BY created_at DESC
        LIMIT 1
      `,
    )
    .bind(input.sourceType, input.sourceValue, input.jobType)
    .first<{ id: string }>()

  if (existing?.id) return { id: existing.id, status: 'existing' }

  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  await db
    .prepare(
      `
        INSERT INTO enrichment_jobs (
          id, source_type, source_value, job_type, status, input_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'queued', ?, ?, ?)
      `,
    )
    .bind(id, input.sourceType, input.sourceValue, input.jobType, JSON.stringify(input), now, now)
    .run()

  return { id, status: 'queued' }
}

async function claimQueuedEnrichmentJob(db: D1Database): Promise<EnrichmentJobRow | null> {
  const job = await db
    .prepare(
      `
        SELECT id, source_type AS sourceType, source_value AS sourceValue, job_type AS jobType
        FROM enrichment_jobs
        WHERE status = 'queued'
        ORDER BY created_at ASC
        LIMIT 1
      `,
    )
    .first<EnrichmentJobRow>()

  if (!job) return null
  const now = new Date().toISOString()
  await db
    .prepare("UPDATE enrichment_jobs SET status = 'running', started_at = ?, updated_at = ? WHERE id = ? AND status = 'queued'")
    .bind(now, now, job.id)
    .run()
  return job
}

async function loadXAccountProfile(db: D1Database, username: string): Promise<XAccountProfileRow | null> {
  return db
    .prepare(
      `
        SELECT
          username,
          name,
          description,
          profile_image_url AS profileImageUrl,
          raw_json AS rawJson,
          verified
        FROM x_accounts
        WHERE lower(username) = lower(?)
        LIMIT 1
      `,
    )
    .bind(username)
    .first<XAccountProfileRow>()
}

function braveSearchApiKey(env: ReadoCloudflareEnv | null | undefined): string | null {
  return env?.READO_BRAVE_SEARCH_API_KEY ?? env?.BRAVE_SEARCH_API_KEY ?? process.env.READO_BRAVE_SEARCH_API_KEY ?? process.env.BRAVE_SEARCH_API_KEY ?? null
}

function profileModelEndpoint(env: ReadoCloudflareEnv | null | undefined): string | null {
  return env?.READO_PROFILE_ENRICHMENT_MODEL_ENDPOINT
    ?? env?.CLOUDFLARE_AI_GATEWAY_URL
    ?? process.env.READO_PROFILE_ENRICHMENT_MODEL_ENDPOINT
    ?? process.env.CLOUDFLARE_AI_GATEWAY_URL
    ?? null
}

function profileModelToken(env: ReadoCloudflareEnv | null | undefined): string | null {
  return env?.READO_PROFILE_ENRICHMENT_MODEL_TOKEN
    ?? env?.CLOUDFLARE_AI_GATEWAY_TOKEN
    ?? process.env.READO_PROFILE_ENRICHMENT_MODEL_TOKEN
    ?? process.env.CLOUDFLARE_AI_GATEWAY_TOKEN
    ?? null
}

function profileModelName(env: ReadoCloudflareEnv | null | undefined): string | null {
  return env?.READO_PROFILE_ENRICHMENT_MODEL
    ?? env?.LLM_MODEL
    ?? process.env.READO_PROFILE_ENRICHMENT_MODEL
    ?? process.env.LLM_MODEL
    ?? null
}

function resolveProfileEnrichmentProviders(
  env: ReadoCloudflareEnv | null | undefined,
  options: ProfileEnrichmentRunOptions,
): {
  assetSelector: NonNullable<ProfileAssetDiscoveryOptions['assetSelector']> | null
  providerStatus: ProfileEnrichmentProviderStatus
  searchProvider: NonNullable<ProfileAssetDiscoveryOptions['searchProvider']> | null
} {
  const customSearchProvider = options.searchProvider !== undefined && options.searchProvider !== null
  const customAssetSelector = options.assetSelector !== undefined && options.assetSelector !== null
  const searchApiKey = options.searchProvider === undefined ? braveSearchApiKey(env) : null
  const modelEndpoint = options.assetSelector === undefined ? profileModelEndpoint(env) : null
  const modelToken = options.assetSelector === undefined ? profileModelToken(env) : null
  const modelName = options.assetSelector === undefined ? profileModelName(env) : null
  const searchProvider = options.searchProvider === undefined
    ? createBraveSearchProvider({ apiKey: searchApiKey, fetcher: options.fetcher })
    : options.searchProvider
  const assetSelector = options.assetSelector === undefined
    ? createOpenAICompatibleProfileAssetSelector({
      apiKey: modelToken,
      endpoint: modelEndpoint,
      fetcher: options.fetcher,
      model: modelName,
    })
    : options.assetSelector
  const missing: string[] = []
  if (!searchProvider) missing.push('READO_BRAVE_SEARCH_API_KEY or BRAVE_SEARCH_API_KEY')
  if (!assetSelector) {
    if (customAssetSelector) {
      missing.push('profile asset selector')
    } else {
      if (!modelEndpoint) missing.push('READO_PROFILE_ENRICHMENT_MODEL_ENDPOINT or CLOUDFLARE_AI_GATEWAY_URL')
      if (!modelToken) missing.push('READO_PROFILE_ENRICHMENT_MODEL_TOKEN or CLOUDFLARE_AI_GATEWAY_TOKEN')
      if (!modelName) missing.push('READO_PROFILE_ENRICHMENT_MODEL or LLM_MODEL')
    }
  }

  const providerStatus: ProfileEnrichmentProviderStatus = {
    missing,
    model: {
      configured: Boolean(assetSelector),
      endpointConfigured: customAssetSelector || Boolean(modelEndpoint),
      model: customAssetSelector ? 'custom' : modelName,
      provider: customAssetSelector ? 'custom' : 'openai-compatible',
      tokenConfigured: customAssetSelector || Boolean(modelToken),
    },
    ready: missing.length === 0,
    search: {
      configured: Boolean(searchProvider),
      provider: customSearchProvider ? 'custom' : 'brave',
    },
  }

  return { assetSelector, providerStatus, searchProvider }
}

async function discoverProfileAssets(db: D1Database, job: EnrichmentJobRow, options: ProfileEnrichmentRunOptions): Promise<{
  assets: SourceProfileAsset[]
  providerStatus: ProfileEnrichmentProviderStatus | null
}> {
  if (job.jobType !== 'discover_profile_assets') return { assets: [], providerStatus: null }
  if (job.sourceType === 'x') {
    const profile = await loadXAccountProfile(db, job.sourceValue)
    if (!profile) return { assets: presetXProfileAssets(job.sourceValue), providerStatus: null }
    const env = options.env ?? await getCloudflareEnv().catch(() => null)
    const { assetSelector, providerStatus, searchProvider } = resolveProfileEnrichmentProviders(env, options)
    if (!providerStatus.ready) throw new ProfileEnrichmentConfigurationError(providerStatus)
    const discovered = await discoverXProfileAssets({
      description: profile.description,
      name: profile.name,
      rawJson: profile.rawJson,
      username: profile.username,
    }, {
      assetSelector,
      fetcher: options.fetcher,
      searchProvider,
    })
    return { assets: discovered, providerStatus }
  }
  return { assets: [], providerStatus: null }
}

async function upsertChannelProfile(
  db: D1Database,
  job: EnrichmentJobRow,
  assets: SourceProfileAsset[],
): Promise<void> {
  const profile = job.sourceType === 'x' ? await loadXAccountProfile(db, job.sourceValue) : null
  const id = `${job.sourceType}-${job.sourceValue.toLowerCase()}`
  const now = new Date().toISOString()
  await db
    .prepare(
      `
        INSERT INTO channel_profiles (
          id, source_type, source_value, domain, name, role, description, featured_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          source_type = excluded.source_type,
          source_value = excluded.source_value,
          name = excluded.name,
          role = excluded.role,
          description = excluded.description,
          featured_json = excluded.featured_json,
          updated_at = excluded.updated_at
      `,
    )
    .bind(
      id,
      job.sourceType,
      job.sourceValue,
      'ai',
      profile?.name ?? job.sourceValue,
      job.sourceType === 'x' ? 'X profile' : null,
      profile?.description ?? null,
      JSON.stringify(assets),
      now,
      now,
    )
    .run()
}

export async function runOneProfileEnrichmentJob(
  db: D1Database,
  options: ProfileEnrichmentRunOptions = {},
): Promise<{ jobId: string; status: string; assetCount: number; error?: string; providerStatus?: ProfileEnrichmentProviderStatus | null } | null> {
  const job = await claimQueuedEnrichmentJob(db)
  if (!job) return null
  const now = new Date().toISOString()

  try {
    const { assets, providerStatus } = await discoverProfileAssets(db, job, options)
    await upsertChannelProfile(db, job, assets)
    await db
      .prepare("UPDATE enrichment_jobs SET status = 'completed', output_json = ?, completed_at = ?, updated_at = ? WHERE id = ?")
      .bind(JSON.stringify({ assets, providerStatus }), now, now, job.id)
      .run()
    return { jobId: job.id, status: 'completed', assetCount: assets.length, providerStatus }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown enrichment error'
    const providerStatus = error instanceof ProfileEnrichmentConfigurationError ? error.providerStatus : null
    await db
      .prepare("UPDATE enrichment_jobs SET status = 'failed', error = ?, output_json = ?, completed_at = ?, updated_at = ? WHERE id = ?")
      .bind(message, JSON.stringify({ assets: [], providerStatus }), now, now, job.id)
      .run()
    return { jobId: job.id, status: 'failed', assetCount: 0, error: message, providerStatus }
  }
}

export async function runProfileEnrichmentQueue(
  db: D1Database,
  options: ProfileEnrichmentRunOptions & {
    maxJobs?: number
    runOne?: (db: D1Database) => Promise<ProfileEnrichmentRunResult | null>
  } = {},
): Promise<{ processedCount: number; results: ProfileEnrichmentRunResult[] }> {
  const maxJobs = Math.max(1, Math.min(25, options.maxJobs ?? 5))
  const results: ProfileEnrichmentRunResult[] = []
  const runOne = options.runOne ?? ((database: D1Database) => runOneProfileEnrichmentJob(database, options))

  for (let index = 0; index < maxJobs; index += 1) {
    const result = await runOne(db)
    if (!result) break
    results.push(result)
  }

  return {
    processedCount: results.length,
    results,
  }
}
