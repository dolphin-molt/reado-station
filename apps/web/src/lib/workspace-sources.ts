import 'server-only'

import { PLAN_LIMITS, normalizeBackfillHours, normalizeSourceType, normalizeVisibility, type SourceType, type SourceVisibility } from '@/lib/plans'
import { collectionWindowForHours, ensureSourceCollectionJob } from '@/lib/source-collections'
import { getWorkspaceCreditBalance, getWorkspaceSourceCount, type Workspace } from '@/lib/workspaces'
import { DEFAULT_X_COLLECTION_PREFERENCES, normalizeXCollectionPreferences } from '@/lib/x-content-preferences'
import { normalizeXUsername, resolveXAccount } from '@/lib/x-accounts'

export type SubscribeWorkspaceSourceErrorCode =
  | 'invalid-source'
  | 'limit-sources'
  | 'limit-backfill'
  | 'insufficient-credits'
  | 'unsupported'

export class SubscribeWorkspaceSourceError extends Error {
  constructor(
    public code: SubscribeWorkspaceSourceErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'SubscribeWorkspaceSourceError'
  }
}

interface SubscribeInput {
  type: string
  value: string
  visibility?: string
  backfillHours?: string | number | null
  collectionPreferences?: unknown
  userId: string
  workspace: Workspace
}

export interface SubscribeWorkspaceSourceResult {
  sourceId: string
  sourceType: SourceType
  displayName: string
  collectionJobId: string | null
  collectionStatus: string
}

function sourceIdForRss(url: string): string {
  const encoded = new TextEncoder().encode(url.toLowerCase())
  let hash = 2166136261
  for (const byte of encoded) {
    hash ^= byte
    hash = Math.imul(hash, 16777619)
  }
  return `rss-${(hash >>> 0).toString(36)}`
}

function normalizeRssUrl(input: string): URL {
  try {
    const url = new URL(input.trim())
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new Error('unsupported protocol')
    }
    url.hash = ''
    return url
  } catch {
    throw new SubscribeWorkspaceSourceError('invalid-source', 'Invalid RSS URL')
  }
}

async function ensureRssSource(db: D1Database, input: string, backfillHours: number): Promise<{ id: string; name: string }> {
  const url = normalizeRssUrl(input)
  const id = sourceIdForRss(url.toString())
  const now = new Date().toISOString()
  const name = url.hostname.replace(/^www\./, '')

  await db
    .prepare(
      `
        INSERT INTO sources (id, name, adapter, url, hours, enabled, category, topics, searchable, updated_at)
        VALUES (?, ?, 'rss', ?, ?, 1, 'rss', '[]', 1, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          adapter = excluded.adapter,
          url = excluded.url,
          hours = MAX(hours, excluded.hours),
          enabled = excluded.enabled,
          category = excluded.category,
          searchable = excluded.searchable,
          updated_at = excluded.updated_at
      `,
    )
    .bind(id, name, url.toString(), backfillHours, now)
    .run()

  return { id, name }
}

async function ensureXSource(db: D1Database, input: string, backfillHours: number): Promise<{ id: string; name: string; accountId: string; username: string }> {
  const account = await resolveXAccount(db, input)
  const now = new Date().toISOString()
  const id = `tw-${account.username.toLowerCase()}`

  await db
    .prepare(
      `
        INSERT INTO sources (id, name, adapter, url, hours, enabled, category, topics, searchable, updated_at)
        VALUES (?, ?, 'twitter', ?, ?, 1, 'twitter', '[]', 1, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          adapter = excluded.adapter,
          url = excluded.url,
          hours = MAX(hours, excluded.hours),
          enabled = excluded.enabled,
          category = excluded.category,
          searchable = excluded.searchable,
          updated_at = excluded.updated_at
      `,
    )
    .bind(id, `@${account.username} (X)`, `https://x.com/${account.username}`, backfillHours, now)
    .run()

  return { id, name: `@${account.username}`, accountId: account.id, username: account.username }
}

async function hasWorkspaceSubscription(db: D1Database, workspaceId: string, sourceId: string): Promise<boolean> {
  const row = await db
    .prepare(
      `
        SELECT 1 AS existing
        FROM workspace_source_subscriptions
        WHERE workspace_id = ? AND source_id = ?
        LIMIT 1
      `,
    )
    .bind(workspaceId, sourceId)
    .first<{ existing: number }>()

  return Number(row?.existing ?? 0) === 1
}

async function assertPlanLimits(
  db: D1Database,
  workspace: Workspace,
  backfillHours: number,
  sourceType: SourceType,
  isExistingSubscription: boolean,
): Promise<void> {
  const limits = PLAN_LIMITS[workspace.planId]
  if (backfillHours > limits.maxBackfillHours) {
    throw new SubscribeWorkspaceSourceError('limit-backfill', 'Backfill window exceeds the current plan')
  }

  if (!isExistingSubscription) {
    const sourceCount = await getWorkspaceSourceCount(db, workspace.id)
    if (sourceCount >= limits.sourceLimit) {
      throw new SubscribeWorkspaceSourceError('limit-sources', 'Source limit reached')
    }
  }

  if (sourceType === 'x') {
    const balance = await getWorkspaceCreditBalance(db, workspace.id)
    if (balance <= 0) {
      throw new SubscribeWorkspaceSourceError('insufficient-credits', 'X backfill requires available credits')
    }
  }
}

export async function subscribeWorkspaceSource(db: D1Database, input: SubscribeInput): Promise<SubscribeWorkspaceSourceResult> {
  const sourceType = normalizeSourceType(input.type)
  const visibility = normalizeVisibility(input.visibility)
  const backfillHours = normalizeBackfillHours(input.backfillHours)
  const collectionPreferences = sourceType === 'x'
    ? normalizeXCollectionPreferences(input.collectionPreferences ?? DEFAULT_X_COLLECTION_PREFERENCES)
    : {}
  const sourceId =
    sourceType === 'rss'
      ? sourceIdForRss(normalizeRssUrl(input.value).toString())
      : `tw-${normalizeXUsername(input.value).toLowerCase()}`
  const existingSubscription = await hasWorkspaceSubscription(db, input.workspace.id, sourceId)

  await assertPlanLimits(db, input.workspace, backfillHours, sourceType, existingSubscription)

  const source =
    sourceType === 'rss'
      ? await ensureRssSource(db, input.value, backfillHours)
      : await ensureXSource(db, normalizeXUsername(input.value), backfillHours)

  const now = new Date().toISOString()
  const { windowStart, windowEnd } = collectionWindowForHours(backfillHours)
  const collection = await ensureSourceCollectionJob(db, {
    sourceId: source.id,
    sourceType,
    windowStart,
    windowEnd,
    requestedByWorkspaceId: input.workspace.id,
  }).catch((error) => {
    if (error instanceof Error && (error.message.includes('source_collection_jobs') || error.message.includes('source_collection_snapshots'))) {
      return null
    }
    throw error
  })
  const subscriptionStatus = collection ? (collection.decision.status === 'fresh' ? 'ready' : collection.decision.status) : 'pending_backfill'
  const batch: D1PreparedStatement[] = [
    db
      .prepare(
        `
          INSERT INTO workspace_source_subscriptions (
            workspace_id, source_id, source_type, visibility, backfill_hours, status, collection_preferences_json, created_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(workspace_id, source_id) DO UPDATE SET
            visibility = excluded.visibility,
            backfill_hours = excluded.backfill_hours,
            status = excluded.status,
            collection_preferences_json = excluded.collection_preferences_json,
            updated_at = excluded.updated_at
        `,
      )
      .bind(input.workspace.id, source.id, sourceType, visibility, backfillHours, subscriptionStatus, JSON.stringify(collectionPreferences), input.userId, now, now),
  ]

  if ('accountId' in source) {
    batch.push(
      db
        .prepare(
          `
            INSERT INTO user_x_account_subscriptions (user_id, x_account_id, subscribed_at)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id, x_account_id) DO NOTHING
          `,
        )
        .bind(input.userId, source.accountId, now),
    )
  }

  await db.batch(batch)

  return {
    sourceId: source.id,
    sourceType,
    displayName: source.name,
    collectionJobId: collection?.job?.id ?? null,
    collectionStatus: subscriptionStatus,
  }
}

export function sourceErrorCode(error: unknown): string {
  if (error instanceof SubscribeWorkspaceSourceError) return error.code
  if (error instanceof Error && error.name === 'XAccountError') {
    const maybeCode = (error as Error & { code?: string }).code
    return maybeCode ?? 'unknown'
  }
  return 'unknown'
}
