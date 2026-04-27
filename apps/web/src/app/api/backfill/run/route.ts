import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getApiSecret, getD1Binding } from '@/lib/cloudflare'

export const dynamic = 'force-dynamic'

function bearerToken(request: NextRequest): string | null {
  const header = request.headers.get('authorization')
  if (header?.startsWith('Bearer ')) return header.slice('Bearer '.length).trim()
  return request.headers.get('x-reado-api-secret')
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' ? value : null
}

async function recordCreditSpend(db: D1Database, jobId: string, creditsUsed: number, now: string): Promise<void> {
  if (creditsUsed <= 0) return

  const job = await db
    .prepare(
      `
        SELECT workspace_id AS workspaceId, source_id AS sourceId, credits_used AS previousCreditsUsed, status
        FROM source_backfill_jobs
        WHERE id = ?
        LIMIT 1
      `,
    )
    .bind(jobId)
    .first<{ workspaceId: string; sourceId: string; previousCreditsUsed: number | null; status: string }>()

  if (!job) return
  const previousCreditsUsed = Number(job.previousCreditsUsed ?? 0)
  const delta = creditsUsed - previousCreditsUsed
  if (delta <= 0) return

  await db
    .prepare(
      `
        INSERT INTO credit_ledger (id, workspace_id, action, credits_delta, source_id, item_count, metadata_json, created_at)
        VALUES (?, ?, 'backfill_spend', ?, ?, ?, ?, ?)
      `,
    )
    .bind(
      crypto.randomUUID(),
      job.workspaceId,
      -delta,
      job.sourceId,
      delta,
      JSON.stringify({ job_id: jobId, previous_credits_used: previousCreditsUsed }),
      now,
    )
    .run()
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = await getApiSecret()
  if (!secret || bearerToken(request) !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = await getD1Binding().catch(() => null)
  if (!db) return NextResponse.json({ error: 'D1 database is required' }, { status: 503 })

  const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const action = stringValue(payload.action) ?? 'claim'
  const now = new Date().toISOString()

  if (action === 'complete' || action === 'fail' || action === 'partial_quota_exhausted') {
    const jobId = stringValue(payload.jobId)
    if (!jobId) return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
    const status = action === 'complete' ? 'completed' : action
    const creditsUsed = numberValue(payload.creditsUsed)
    if (creditsUsed != null) {
      await recordCreditSpend(db, jobId, creditsUsed, now)
    }
    await db
      .prepare(
        `
          UPDATE source_backfill_jobs
          SET status = ?, credits_used = COALESCE(?, credits_used), error = ?, updated_at = ?, completed_at = ?
          WHERE id = ?
        `,
      )
      .bind(status, creditsUsed, stringValue(payload.error), now, now, jobId)
      .run()

    await db
      .prepare(
        `
          UPDATE workspace_source_subscriptions
          SET status = ?, updated_at = ?
          WHERE workspace_id = (SELECT workspace_id FROM source_backfill_jobs WHERE id = ?)
            AND source_id = (SELECT source_id FROM source_backfill_jobs WHERE id = ?)
        `,
      )
      .bind(status, now, jobId, jobId)
      .run()

    return NextResponse.json({ ok: true, jobId, status })
  }

  const limit = Math.min(Math.max(numberValue(payload.limit) ?? 5, 1), 20)
  const { results = [] } = await db
    .prepare(
      `
        SELECT
          j.id,
          j.workspace_id AS workspaceId,
          j.source_id AS sourceId,
          j.source_type AS sourceType,
          j.backfill_hours AS backfillHours,
          s.name AS sourceName,
          s.url AS sourceUrl,
          s.adapter AS adapter
        FROM source_backfill_jobs j
        INNER JOIN sources s ON s.id = j.source_id
        WHERE j.status = 'queued'
        ORDER BY j.created_at ASC
        LIMIT ?
      `,
    )
    .bind(limit)
    .all()

  if (results.length > 0) {
    const statements = results.map((job) =>
      db.prepare("UPDATE source_backfill_jobs SET status = 'running', started_at = ?, updated_at = ? WHERE id = ? AND status = 'queued'").bind(now, now, (job as { id: string }).id),
    )
    await db.batch(statements)
  }

  return NextResponse.json({ jobs: results })
}
