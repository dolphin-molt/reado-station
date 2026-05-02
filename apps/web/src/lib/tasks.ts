import 'server-only'

export type WorkspaceTaskKind = 'profile-enrichment' | 'radio' | 'source-backfill' | 'source-collection'
export type WorkspaceTaskStatus = 'queued' | 'running'

export interface WorkspaceTask {
  createdAt: string
  href: string
  id: string
  kind: WorkspaceTaskKind
  startedAt: string | null
  status: WorkspaceTaskStatus
  subject: string
  title: string
  updatedAt: string
}

interface SourceCollectionTaskRow {
  createdAt: string
  id: string
  sourceId: string
  sourceName: string | null
  sourceType: string
  startedAt: string | null
  status: string
  updatedAt: string
  windowEnd: string
  windowStart: string
}

interface ProfileEnrichmentTaskRow {
  createdAt: string
  id: string
  jobType: string
  sourceType: string
  sourceValue: string
  startedAt: string | null
  status: string
  updatedAt: string
}

interface RadioTaskRow {
  createdAt: string
  date: string
  id: string
  status: string
  title: string | null
  updatedAt: string
}

interface BackfillTaskRow {
  createdAt: string
  id: string
  sourceId: string
  sourceName: string | null
  sourceType: string
  startedAt: string | null
  status: string
  updatedAt: string
}

function activeStatus(value: string): WorkspaceTaskStatus {
  return value === 'running' ? 'running' : 'queued'
}

function sourceHref(sourceId: string): string {
  return `/sources/${encodeURIComponent(sourceId)}`
}

function taskUpdatedTime(task: WorkspaceTask): number {
  const time = new Date(task.updatedAt || task.createdAt).getTime()
  return Number.isNaN(time) ? 0 : time
}

function ignoreMissingTaskTable(error: unknown): boolean {
  return error instanceof Error && (
    error.message.includes('no such table') ||
    error.message.includes('source_collection_jobs') ||
    error.message.includes('enrichment_jobs') ||
    error.message.includes('radio_episodes') ||
    error.message.includes('source_backfill_jobs')
  )
}

async function safeAll<T>(query: Promise<{ results?: T[] }>): Promise<T[]> {
  try {
    const response = await query
    return response.results ?? []
  } catch (error) {
    if (ignoreMissingTaskTable(error)) return []
    throw error
  }
}

export async function loadWorkspaceTasks(db: D1Database, workspaceId: string): Promise<WorkspaceTask[]> {
  const [collectionRows, enrichmentRows, radioRows, backfillRows] = await Promise.all([
    safeAll<SourceCollectionTaskRow>(
      db
        .prepare(
          `
            SELECT
              j.id,
              j.source_id AS sourceId,
              j.source_type AS sourceType,
              j.status,
              j.window_start AS windowStart,
              j.window_end AS windowEnd,
              j.created_at AS createdAt,
              j.updated_at AS updatedAt,
              j.started_at AS startedAt,
              s.name AS sourceName
            FROM source_collection_jobs j
            INNER JOIN workspace_source_subscriptions wss
              ON wss.source_id = j.source_id
             AND wss.workspace_id = ?
            LEFT JOIN sources s ON s.id = j.source_id
            WHERE j.status IN ('queued', 'running')
            ORDER BY j.updated_at DESC, j.created_at DESC
            LIMIT 50
          `,
        )
        .bind(workspaceId)
        .all<SourceCollectionTaskRow>(),
    ),
    safeAll<ProfileEnrichmentTaskRow>(
      db
        .prepare(
          `
            SELECT
              e.id,
              e.source_type AS sourceType,
              e.source_value AS sourceValue,
              e.job_type AS jobType,
              e.status,
              e.created_at AS createdAt,
              e.updated_at AS updatedAt,
              e.started_at AS startedAt
            FROM enrichment_jobs e
            INNER JOIN workspace_source_subscriptions wss
              ON wss.workspace_id = ?
             AND wss.source_type = 'x'
             AND lower(wss.source_id) = 'tw-' || lower(e.source_value)
            WHERE e.status IN ('queued', 'running')
            ORDER BY e.updated_at DESC, e.created_at DESC
            LIMIT 50
          `,
        )
        .bind(workspaceId)
        .all<ProfileEnrichmentTaskRow>(),
    ),
    safeAll<RadioTaskRow>(
      db
        .prepare(
          `
            SELECT
              id,
              date,
              status,
              title,
              created_at AS createdAt,
              updated_at AS updatedAt
            FROM radio_episodes
            WHERE workspace_id = ?
              AND status IN ('queued', 'running')
            ORDER BY updated_at DESC, created_at DESC
            LIMIT 50
          `,
        )
        .bind(workspaceId)
        .all<RadioTaskRow>(),
    ),
    safeAll<BackfillTaskRow>(
      db
        .prepare(
          `
            SELECT
              j.id,
              j.source_id AS sourceId,
              j.source_type AS sourceType,
              j.status,
              j.created_at AS createdAt,
              j.updated_at AS updatedAt,
              j.started_at AS startedAt,
              s.name AS sourceName
            FROM source_backfill_jobs j
            LEFT JOIN sources s ON s.id = j.source_id
            WHERE j.workspace_id = ?
              AND j.status IN ('queued', 'running')
            ORDER BY j.updated_at DESC, j.created_at DESC
            LIMIT 50
          `,
        )
        .bind(workspaceId)
        .all<BackfillTaskRow>(),
    ),
  ])

  const tasks: WorkspaceTask[] = [
    ...collectionRows.map((row) => ({
      createdAt: row.createdAt,
      href: sourceHref(row.sourceId),
      id: row.id,
      kind: 'source-collection' as const,
      startedAt: row.startedAt,
      status: activeStatus(row.status),
      subject: row.sourceName || row.sourceId,
      title: '内容采集',
      updatedAt: row.updatedAt,
    })),
    ...enrichmentRows.map((row) => ({
      createdAt: row.createdAt,
      href: row.sourceType === 'x' ? sourceHref(`tw-${row.sourceValue.toLowerCase()}`) : '/sources',
      id: row.id,
      kind: 'profile-enrichment' as const,
      startedAt: row.startedAt,
      status: activeStatus(row.status),
      subject: row.sourceType === 'x' ? `@${row.sourceValue}` : row.sourceValue,
      title: '主页补全',
      updatedAt: row.updatedAt,
    })),
    ...radioRows.map((row) => ({
      createdAt: row.createdAt,
      href: '/today',
      id: row.id,
      kind: 'radio' as const,
      startedAt: null,
      status: activeStatus(row.status),
      subject: row.date,
      title: row.title || '电台生成',
      updatedAt: row.updatedAt,
    })),
    ...backfillRows.map((row) => ({
      createdAt: row.createdAt,
      href: sourceHref(row.sourceId),
      id: row.id,
      kind: 'source-backfill' as const,
      startedAt: row.startedAt,
      status: activeStatus(row.status),
      subject: row.sourceName || row.sourceId,
      title: '历史回溯',
      updatedAt: row.updatedAt,
    })),
  ]

  return tasks.sort((a, b) => taskUpdatedTime(b) - taskUpdatedTime(a))
}

export async function loadWorkspaceTaskSummary(db: D1Database, workspaceId: string): Promise<{ activeCount: number }> {
  const tasks = await loadWorkspaceTasks(db, workspaceId)
  return { activeCount: tasks.length }
}
