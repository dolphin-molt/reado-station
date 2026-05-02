import { normalizeSourceType, type SourceType } from '@/lib/plans'

export type CollectionStatus = 'fresh' | 'queued' | 'running' | 'stale' | 'missing' | 'failed'

export interface SourceCollectionSnapshot {
  sourceId: string
  sourceType: SourceType
  windowStart: string
  windowEnd: string
  status: CollectionStatus
  itemCount: number
  collectedAt: string
}

export interface SourceCollectionDecision {
  shouldCollect: boolean
  status: CollectionStatus
  reason: 'fresh-snapshot' | 'active-job' | 'no-snapshot' | 'stale-snapshot' | 'failed-snapshot' | 'force-refresh'
}

export interface SourceCollectionJob {
  id: string
  sourceId: string
  sourceType: SourceType
  windowStart: string
  windowEnd: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'partial_quota_exhausted'
}

interface SourceCollectionJobRow {
  id: string
  sourceId: string
  sourceType: string
  windowStart: string
  windowEnd: string
  status: string
}

interface SourceCollectionSnapshotRow {
  sourceId: string
  sourceType: string
  windowStart: string
  windowEnd: string
  status: string
  itemCount: number | null
  collectedAt: string
}

const ACTIVE_JOB_STATUSES = new Set(['queued', 'running'])

function parseTime(value: string): number {
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

export function collectionWindowForHours(hours: number, now = new Date()): { windowStart: string; windowEnd: string } {
  const boundedHours = Math.max(1, Math.min(24 * 30, Math.floor(hours)))
  return {
    windowStart: new Date(now.getTime() - boundedHours * 60 * 60 * 1000).toISOString(),
    windowEnd: now.toISOString(),
  }
}

export function snapshotCoversWindow(snapshot: SourceCollectionSnapshot | null, windowStart: string, windowEnd: string): boolean {
  if (!snapshot || snapshot.status !== 'fresh' || snapshot.itemCount < 0) return false
  return parseTime(snapshot.windowStart) <= parseTime(windowStart) && parseTime(snapshot.windowEnd) >= parseTime(windowEnd)
}

export function decideSourceCollection(input: {
  activeJob?: SourceCollectionJob | null
  force?: boolean
  snapshot?: SourceCollectionSnapshot | null
  windowStart: string
  windowEnd: string
}): SourceCollectionDecision {
  if (input.activeJob && ACTIVE_JOB_STATUSES.has(input.activeJob.status)) {
    return { shouldCollect: false, status: input.activeJob.status === 'running' ? 'running' : 'queued', reason: 'active-job' }
  }

  if (input.force) return { shouldCollect: true, status: 'stale', reason: 'force-refresh' }

  if (snapshotCoversWindow(input.snapshot ?? null, input.windowStart, input.windowEnd)) {
    return { shouldCollect: false, status: 'fresh', reason: 'fresh-snapshot' }
  }

  if (!input.snapshot) return { shouldCollect: true, status: 'missing', reason: 'no-snapshot' }
  if (input.snapshot.status === 'failed') return { shouldCollect: true, status: 'failed', reason: 'failed-snapshot' }
  return { shouldCollect: true, status: 'stale', reason: 'stale-snapshot' }
}

function rowToJob(row: SourceCollectionJobRow): SourceCollectionJob {
  return {
    id: row.id,
    sourceId: row.sourceId,
    sourceType: normalizeSourceType(row.sourceType),
    windowStart: row.windowStart,
    windowEnd: row.windowEnd,
    status: row.status === 'running' || row.status === 'completed' || row.status === 'failed' || row.status === 'partial_quota_exhausted' ? row.status : 'queued',
  }
}

function rowToSnapshot(row: SourceCollectionSnapshotRow): SourceCollectionSnapshot {
  return {
    sourceId: row.sourceId,
    sourceType: normalizeSourceType(row.sourceType),
    windowStart: row.windowStart,
    windowEnd: row.windowEnd,
    status: row.status === 'fresh' || row.status === 'queued' || row.status === 'running' || row.status === 'failed' || row.status === 'stale' ? row.status : 'missing',
    itemCount: Number(row.itemCount ?? 0),
    collectedAt: row.collectedAt,
  }
}

export async function findActiveSourceCollectionJob(db: D1Database, sourceId: string, windowStart: string, windowEnd: string): Promise<SourceCollectionJob | null> {
  const row = await db
    .prepare(
      `
        SELECT id, source_id AS sourceId, source_type AS sourceType, window_start AS windowStart, window_end AS windowEnd, status
        FROM source_collection_jobs
        WHERE source_id = ?
          AND status IN ('queued', 'running')
          AND datetime(window_start) <= datetime(?)
          AND datetime(window_end) >= datetime(?)
        ORDER BY created_at ASC
        LIMIT 1
      `,
    )
    .bind(sourceId, windowStart, windowEnd)
    .first<SourceCollectionJobRow>()
  return row ? rowToJob(row) : null
}

export async function getSourceCollectionSnapshot(db: D1Database, sourceId: string): Promise<SourceCollectionSnapshot | null> {
  const row = await db
    .prepare(
      `
        SELECT source_id AS sourceId, source_type AS sourceType, window_start AS windowStart, window_end AS windowEnd,
               status, item_count AS itemCount, collected_at AS collectedAt
        FROM source_collection_snapshots
        WHERE source_id = ?
        LIMIT 1
      `,
    )
    .bind(sourceId)
    .first<SourceCollectionSnapshotRow>()
  return row ? rowToSnapshot(row) : null
}

export async function ensureSourceCollectionJob(db: D1Database, input: {
  force?: boolean
  sourceId: string
  sourceType: SourceType
  windowStart: string
  windowEnd: string
  requestedByWorkspaceId?: string | null
}): Promise<{ job: SourceCollectionJob | null; decision: SourceCollectionDecision }> {
  const [snapshot, activeJob] = await Promise.all([
    getSourceCollectionSnapshot(db, input.sourceId),
    findActiveSourceCollectionJob(db, input.sourceId, input.windowStart, input.windowEnd),
  ])
  const decision = decideSourceCollection({ activeJob, force: input.force, snapshot, windowStart: input.windowStart, windowEnd: input.windowEnd })
  if (!decision.shouldCollect) return { job: activeJob, decision }

  const now = new Date().toISOString()
  const jobId = crypto.randomUUID()
  await db
    .prepare(
      `
        INSERT INTO source_collection_jobs (
          id, source_id, source_type, window_start, window_end, status, requested_by_workspace_count,
          requester_workspace_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'queued', 1, ?, ?, ?)
        ON CONFLICT(source_id, window_start, window_end) DO UPDATE SET
          requested_by_workspace_count = requested_by_workspace_count + 1,
          updated_at = excluded.updated_at
      `,
    )
    .bind(jobId, input.sourceId, input.sourceType, input.windowStart, input.windowEnd, input.requestedByWorkspaceId ?? null, now, now)
    .run()

  const job = await findActiveSourceCollectionJob(db, input.sourceId, input.windowStart, input.windowEnd)
  return { job, decision }
}

export async function upsertSourceCollectionSnapshot(db: D1Database, input: {
  sourceId: string
  sourceType: SourceType
  windowStart: string
  windowEnd: string
  status: 'fresh' | 'failed'
  itemCount: number
  accountFetchedAt?: string | null
}): Promise<void> {
  const now = new Date().toISOString()
  await db
    .prepare(
      `
        INSERT INTO source_collection_snapshots (
          source_id, source_type, window_start, window_end, status, item_count, account_fetched_at, collected_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(source_id) DO UPDATE SET
          source_type = excluded.source_type,
          window_start = excluded.window_start,
          window_end = excluded.window_end,
          status = excluded.status,
          item_count = excluded.item_count,
          account_fetched_at = COALESCE(excluded.account_fetched_at, source_collection_snapshots.account_fetched_at),
          collected_at = excluded.collected_at,
          updated_at = excluded.updated_at
      `,
    )
    .bind(input.sourceId, input.sourceType, input.windowStart, input.windowEnd, input.status, input.itemCount, input.accountFetchedAt ?? null, now, now)
    .run()
}
