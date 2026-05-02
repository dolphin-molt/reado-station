import 'server-only'

export type ExecutionLogStatus = 'started' | 'completed' | 'failed' | 'info'

export interface ExecutionLogInput {
  durationMs?: number | null
  message?: string | null
  metadata?: Record<string, unknown> | null
  runId: string
  scope: string
  status: ExecutionLogStatus
  step: string
  subjectId?: string | null
  subjectType?: string | null
}

export interface ExecutionStepInput {
  metadata?: Record<string, unknown> | null
  runId: string
  scope: string
  step: string
  subjectId?: string | null
  subjectType?: string | null
}

export interface ExecutionLogEntry {
  createdAt: string
  durationMs: number | null
  id: string
  message: string | null
  metadata: Record<string, unknown>
  runId: string
  scope: string
  status: ExecutionLogStatus
  step: string
  subjectId: string | null
  subjectType: string | null
}

interface ExecutionLogRow {
  createdAt: string
  durationMs: number | null
  id: string
  message: string | null
  metadataJson: string | null
  runId: string
  scope: string
  status: string
  step: string
  subjectId: string | null
  subjectType: string | null
}

export function createExecutionRunId(prefix: string): string {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}-${id}`
}

function safeMetadataJson(metadata: Record<string, unknown> | null | undefined): string {
  try {
    return JSON.stringify(metadata ?? {})
  } catch {
    return '{}'
  }
}

function parseMetadataJson(value: string | null): Record<string, unknown> {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function ignoreExecutionLogError(error: unknown): boolean {
  return error instanceof Error && (
    error.message.includes('execution_logs') ||
    error.message.includes('no such table')
  )
}

export async function logExecutionStep(db: D1Database, input: ExecutionLogInput): Promise<void> {
  const now = new Date().toISOString()
  try {
    await db
      .prepare(
        `
          INSERT INTO execution_logs (
            id, run_id, scope, subject_type, subject_id, step, status, message, metadata_json, duration_ms, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .bind(
        createExecutionRunId('log'),
        input.runId,
        input.scope,
        input.subjectType ?? null,
        input.subjectId ?? null,
        input.step,
        input.status,
        input.message ?? null,
        safeMetadataJson(input.metadata),
        input.durationMs ?? null,
        now,
      )
      .run()
  } catch (error) {
    if (ignoreExecutionLogError(error)) return
    throw error
  }
}

export async function withExecutionStep<T>(
  db: D1Database,
  input: ExecutionStepInput,
  task: () => Promise<T>,
): Promise<T> {
  const startedAt = Date.now()
  await logExecutionStep(db, {
    ...input,
    status: 'started',
  })
  try {
    const result = await task()
    await logExecutionStep(db, {
      ...input,
      durationMs: Date.now() - startedAt,
      status: 'completed',
    })
    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    await logExecutionStep(db, {
      ...input,
      durationMs: Date.now() - startedAt,
      message,
      status: 'failed',
    })
    throw error
  }
}

export async function listExecutionLogs(
  db: D1Database,
  options: {
    limit?: number
    runId?: string
    scope?: string
    status?: string
    subjectId?: string
  } = {},
): Promise<ExecutionLogEntry[]> {
  const filters: string[] = []
  const bindings: Array<number | string> = []
  if (options.runId) {
    filters.push('run_id = ?')
    bindings.push(options.runId)
  }
  if (options.scope) {
    filters.push('scope = ?')
    bindings.push(options.scope)
  }
  if (options.status) {
    filters.push('status = ?')
    bindings.push(options.status)
  }
  if (options.subjectId) {
    filters.push('subject_id = ?')
    bindings.push(options.subjectId)
  }
  const where = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : ''
  const limit = Math.max(1, Math.min(500, Math.floor(options.limit ?? 100)))
  let results: ExecutionLogRow[] = []
  try {
    const response = await db
      .prepare(
        `
          SELECT
            id,
            run_id AS runId,
            scope,
            subject_type AS subjectType,
            subject_id AS subjectId,
            step,
            status,
            message,
            metadata_json AS metadataJson,
            duration_ms AS durationMs,
            created_at AS createdAt
          FROM execution_logs
          ${where}
          ORDER BY created_at DESC, id DESC
          LIMIT ?
        `,
      )
      .bind(...bindings, limit)
      .all<ExecutionLogRow>()
    results = response.results ?? []
  } catch (error) {
    if (ignoreExecutionLogError(error)) return []
    throw error
  }

  return results.map((row) => ({
    createdAt: row.createdAt,
    durationMs: row.durationMs == null ? null : Number(row.durationMs),
    id: row.id,
    message: row.message,
    metadata: parseMetadataJson(row.metadataJson),
    runId: row.runId,
    scope: row.scope,
    status: (row.status === 'started' || row.status === 'completed' || row.status === 'failed' || row.status === 'info') ? row.status : 'info',
    step: row.step,
    subjectId: row.subjectId,
    subjectType: row.subjectType,
  }))
}
