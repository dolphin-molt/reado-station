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

async function discoverProfileAssets(db: D1Database, job: EnrichmentJobRow, options: ProfileEnrichmentRunOptions): Promise<SourceProfileAsset[]> {
  if (job.jobType !== 'discover_profile_assets') return []
  if (job.sourceType === 'x') {
    const profile = await loadXAccountProfile(db, job.sourceValue)
    if (!profile) return presetXProfileAssets(job.sourceValue)
    const env = options.env ?? await getCloudflareEnv().catch(() => null)
    const searchProvider = options.searchProvider ?? createBraveSearchProvider({
      apiKey: braveSearchApiKey(env),
      fetcher: options.fetcher,
    })
    const assetSelector = options.assetSelector ?? createOpenAICompatibleProfileAssetSelector({
      apiKey: profileModelToken(env),
      endpoint: profileModelEndpoint(env),
      fetcher: options.fetcher,
      model: profileModelName(env),
    })
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
    return discovered.length > 0 ? discovered : presetXProfileAssets(job.sourceValue)
  }
  return []
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
): Promise<{ jobId: string; status: string; assetCount: number; error?: string } | null> {
  const job = await claimQueuedEnrichmentJob(db)
  if (!job) return null
  const now = new Date().toISOString()

  try {
    const assets = await discoverProfileAssets(db, job, options)
    await upsertChannelProfile(db, job, assets)
    await db
      .prepare("UPDATE enrichment_jobs SET status = 'completed', output_json = ?, completed_at = ?, updated_at = ? WHERE id = ?")
      .bind(JSON.stringify({ assets }), now, now, job.id)
      .run()
    return { jobId: job.id, status: 'completed', assetCount: assets.length }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown enrichment error'
    await db
      .prepare("UPDATE enrichment_jobs SET status = 'failed', error = ?, completed_at = ?, updated_at = ? WHERE id = ?")
      .bind(message, now, now, job.id)
      .run()
    return { jobId: job.id, status: 'failed', assetCount: 0, error: message }
  }
}
