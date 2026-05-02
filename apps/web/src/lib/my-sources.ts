import 'server-only'

import { channelSubtitle } from '@/lib/channel-catalog'
import { normalizeSourceType, type SourceType } from '@/lib/plans'
import { loadSourceProfileAssets, type SourceProfileAsset } from '@/lib/source-profile-assets'
import { DEFAULT_X_COLLECTION_PREFERENCES, normalizeXCollectionPreferences, type XCollectionPreferences } from '@/lib/x-content-preferences'

export interface WorkspaceSourceListItem {
  sourceId: string
  sourceType: SourceType
  name: string
  url: string
  status: string
  visibility: string
  backfillHours: number
  createdAt: string
  latestCollectedAt: string | null
  itemCount: number
}

export interface WorkspaceSourceRecentItem {
  id: string
  title: string
  url: string
  summary: string
  publishedAt: string
  contentType: string
}

export interface WorkspaceSourceXAccount {
  username: string
  name: string
  description: string
  profileImageUrl: string
  verified: boolean
  followersCount: number | null
  followingCount: number | null
  tweetCount: number | null
  listedCount: number | null
}

export interface WorkspaceSourceDetail extends WorkspaceSourceListItem {
  collectionPreferences: XCollectionPreferences | null
  preferenceLabels: string[]
  latestWindowStart: string | null
  latestWindowEnd: string | null
  latestCollectionStatus: string | null
  latestFailureReason: string | null
  profileAssets: SourceProfileAsset[]
  xAccount: WorkspaceSourceXAccount | null
  recentItems: WorkspaceSourceRecentItem[]
}

interface WorkspaceSourceRow {
  sourceId: string
  sourceType: string
  name: string
  url: string | null
  status: string
  visibility: string
  backfillHours: number | null
  createdAt: string
  latestCollectedAt: string | null
  itemCount: number | null
  collectionPreferencesJson?: string | null
  latestWindowStart?: string | null
  latestWindowEnd?: string | null
  latestCollectionStatus?: string | null
  latestFailureReason?: string | null
  xUsername?: string | null
  xName?: string | null
  xDescription?: string | null
  xProfileImageUrl?: string | null
  xVerified?: number | null
  xFollowersCount?: number | null
  xFollowingCount?: number | null
  xTweetCount?: number | null
  xListedCount?: number | null
}

interface WorkspaceSourceRecentItemRow {
  id: string
  title: string
  url: string
  summary: string | null
  publishedAt: string | null
  contentType: string | null
}

function rowToWorkspaceSource(row: WorkspaceSourceRow): WorkspaceSourceListItem {
  const sourceType = normalizeSourceType(row.sourceType)
  return {
    sourceId: row.sourceId,
    sourceType,
    name: row.name,
    url: row.url ?? '',
    status: row.status,
    visibility: row.visibility,
    backfillHours: Number(row.backfillHours ?? 24),
    createdAt: row.createdAt,
    latestCollectedAt: row.latestCollectedAt,
    itemCount: Number(row.itemCount ?? 0),
  }
}

function parseJson(value: string | null | undefined): unknown {
  if (!value) return null
  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

export function describeCollectionPreferences(preferences: XCollectionPreferences, lang: 'zh' | 'en'): string[] {
  const labels: string[] = []
  if (preferences.includeOriginalPosts) labels.push(lang === 'zh' ? '原创' : 'Original')
  if (preferences.includeThreads) labels.push('Thread')
  if (preferences.includeLongformPosts) labels.push(lang === 'zh' ? '长文' : 'Longform')
  if (preferences.includeReplies) labels.push(lang === 'zh' ? '回复' : 'Replies')
  if (preferences.includeReposts) labels.push(lang === 'zh' ? '转发' : 'Reposts')
  if (preferences.includeQuotes) labels.push(lang === 'zh' ? '引用' : 'Quotes')
  if (preferences.includeMediaPosts) labels.push(lang === 'zh' ? '媒体帖' : 'Media')
  return labels
}

export async function loadWorkspaceSources(db: D1Database, workspaceId: string): Promise<WorkspaceSourceListItem[]> {
  let results: WorkspaceSourceRow[] = []
  try {
    const response = await db
      .prepare(
        `
          SELECT
            s.source_id AS sourceId,
            s.source_type AS sourceType,
            src.name,
            src.url,
            s.status,
            s.visibility,
            s.backfill_hours AS backfillHours,
            s.created_at AS createdAt,
            snap.collected_at AS latestCollectedAt,
            (SELECT COUNT(1) FROM items i WHERE i.hidden_at IS NULL AND lower(i.source) = lower(s.source_id)) AS itemCount
          FROM workspace_source_subscriptions s
          INNER JOIN sources src ON src.id = s.source_id
          LEFT JOIN source_collection_snapshots snap ON snap.source_id = s.source_id
          WHERE s.workspace_id = ?
          ORDER BY s.created_at DESC
        `,
      )
      .bind(workspaceId)
      .all<WorkspaceSourceRow>()
    results = response.results ?? []
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('source_collection_snapshots')) throw error
    const response = await db
      .prepare(
        `
          SELECT
            s.source_id AS sourceId,
            s.source_type AS sourceType,
            src.name,
            src.url,
            s.status,
            s.visibility,
            s.backfill_hours AS backfillHours,
            s.created_at AS createdAt,
            NULL AS latestCollectedAt,
            (SELECT COUNT(1) FROM items i WHERE i.hidden_at IS NULL AND lower(i.source) = lower(s.source_id)) AS itemCount
          FROM workspace_source_subscriptions s
          INNER JOIN sources src ON src.id = s.source_id
          WHERE s.workspace_id = ?
          ORDER BY s.created_at DESC
        `,
      )
      .bind(workspaceId)
      .all<WorkspaceSourceRow>()
    results = response.results ?? []
  }
  return results.map(rowToWorkspaceSource)
}

function rowToRecentItem(row: WorkspaceSourceRecentItemRow): WorkspaceSourceRecentItem {
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    summary: row.summary ?? '',
    publishedAt: row.publishedAt ?? '',
    contentType: row.contentType ?? 'original_post',
  }
}

function rowToXAccount(row: WorkspaceSourceRow): WorkspaceSourceXAccount | null {
  if (!row.xUsername) return null
  return {
    username: row.xUsername,
    name: row.xName ?? row.xUsername,
    description: row.xDescription ?? '',
    profileImageUrl: row.xProfileImageUrl ?? '',
    verified: Number(row.xVerified ?? 0) === 1,
    followersCount: row.xFollowersCount ?? null,
    followingCount: row.xFollowingCount ?? null,
    tweetCount: row.xTweetCount ?? null,
    listedCount: row.xListedCount ?? null,
  }
}

export async function loadWorkspaceSourceDetail(db: D1Database, workspaceId: string, sourceId: string, lang: 'zh' | 'en'): Promise<WorkspaceSourceDetail | null> {
  const row = await db
    .prepare(
      `
        SELECT
          s.source_id AS sourceId,
          s.source_type AS sourceType,
          src.name,
          src.url,
          s.status,
          s.visibility,
          s.backfill_hours AS backfillHours,
          s.created_at AS createdAt,
          s.collection_preferences_json AS collectionPreferencesJson,
          snap.collected_at AS latestCollectedAt,
          snap.window_start AS latestWindowStart,
          snap.window_end AS latestWindowEnd,
          snap.status AS latestCollectionStatus,
          job.error AS latestFailureReason,
          xa.username AS xUsername,
          xa.name AS xName,
          xa.description AS xDescription,
          xa.profile_image_url AS xProfileImageUrl,
          xa.verified AS xVerified,
          xa.followers_count AS xFollowersCount,
          xa.following_count AS xFollowingCount,
          xa.tweet_count AS xTweetCount,
          xa.listed_count AS xListedCount,
          (SELECT COUNT(1) FROM items i WHERE i.hidden_at IS NULL AND lower(i.source) = lower(s.source_id)) AS itemCount
        FROM workspace_source_subscriptions s
        INNER JOIN sources src ON src.id = s.source_id
        LEFT JOIN x_accounts xa ON lower(s.source_id) = lower('tw-' || xa.username)
        LEFT JOIN source_collection_snapshots snap ON snap.source_id = s.source_id
        LEFT JOIN source_collection_jobs job ON job.source_id = s.source_id AND job.status = 'failed'
        WHERE s.workspace_id = ? AND s.source_id = ?
        ORDER BY job.updated_at DESC
        LIMIT 1
      `,
    )
    .bind(workspaceId, sourceId)
    .first<WorkspaceSourceRow>()

  if (!row) return null

  const source = rowToWorkspaceSource(row)
  const collectionPreferences = source.sourceType === 'x'
    ? normalizeXCollectionPreferences(parseJson(row.collectionPreferencesJson) ?? DEFAULT_X_COLLECTION_PREFERENCES)
    : null
  const xAccount = rowToXAccount(row)

  const recentFilters = ['hidden_at IS NULL', 'lower(source) = lower(?)']
  if (source.sourceType === 'x') {
    recentFilters.push("COALESCE(json_extract(metadata_json, '$.content_type'), 'original_post') IN ('original_post', 'thread', 'longform_post', 'media_post')")
  }

  const { results = [] } = await db
    .prepare(
      `
        SELECT
          id,
          title,
          url,
          summary,
          published_at AS publishedAt,
          COALESCE(json_extract(metadata_json, '$.content_type'), 'original_post') AS contentType
        FROM items
        WHERE ${recentFilters.join(' AND ')}
        ORDER BY published_at DESC, id ASC
        LIMIT 20
      `,
    )
    .bind(sourceId)
    .all<WorkspaceSourceRecentItemRow>()

  return {
    ...source,
    collectionPreferences,
    preferenceLabels: collectionPreferences ? describeCollectionPreferences(collectionPreferences, lang) : [],
    latestWindowStart: row.latestWindowStart ?? null,
    latestWindowEnd: row.latestWindowEnd ?? null,
    latestCollectionStatus: row.latestCollectionStatus ?? null,
    latestFailureReason: row.latestFailureReason ?? null,
    profileAssets: source.sourceType === 'x'
      ? await loadSourceProfileAssets(db, { sourceType: 'x', sourceValue: xAccount?.username ?? source.sourceId.replace(/^tw-/i, '') })
      : [],
    xAccount,
    recentItems: results.map(rowToRecentItem),
  }
}

export function sourceDisplayUrl(source: Pick<WorkspaceSourceListItem, 'sourceType' | 'url' | 'sourceId'>): string {
  if (source.url) return source.url
  const value = source.sourceId.replace(/^tw-/i, '')
  return channelSubtitle({ type: source.sourceType, value })
}
