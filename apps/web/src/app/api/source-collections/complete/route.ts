import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getApiSecret, getD1Binding } from '@/lib/cloudflare'
import { upsertIngestPayload } from '@/lib/d1-write'
import { upsertSourceCollectionSnapshot } from '@/lib/source-collections'

export const dynamic = 'force-dynamic'

function bearerToken(request: NextRequest): string | null {
  const header = request.headers.get('authorization')
  if (header?.startsWith('Bearer ')) return header.slice('Bearer '.length).trim()
  return request.headers.get('x-reado-api-secret')
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function currentRunTime(): { date: string; batch: 'morning' | 'evening' } {
  const now = new Date()
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Shanghai', hour: '2-digit', hour12: false }).format(now))
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  return { date, batch: hour < 14 ? 'morning' : 'evening' }
}

async function recordSpend(db: D1Database, jobId: string, creditsUsed: number, now: string): Promise<void> {
  if (creditsUsed <= 0) return
  const job = await db
    .prepare('SELECT requester_workspace_id AS workspaceId, source_id AS sourceId, credits_used AS previousCreditsUsed FROM source_collection_jobs WHERE id = ? LIMIT 1')
    .bind(jobId)
    .first<{ workspaceId: string | null; sourceId: string; previousCreditsUsed: number | null }>()
  if (!job?.workspaceId) return
  const delta = creditsUsed - Number(job.previousCreditsUsed ?? 0)
  if (delta <= 0) return
  await db
    .prepare(
      `
        INSERT INTO credit_ledger (id, workspace_id, action, credits_delta, source_id, item_count, metadata_json, created_at)
        VALUES (?, ?, 'source_collection_spend', ?, ?, ?, ?, ?)
      `,
    )
    .bind(crypto.randomUUID(), job.workspaceId, -delta, job.sourceId, delta, JSON.stringify({ job_id: jobId }), now)
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
  const jobId = stringValue(payload.jobId)
  if (!jobId) return NextResponse.json({ error: 'jobId is required' }, { status: 400 })

  const job = await db
    .prepare('SELECT id, source_id AS sourceId, source_type AS sourceType, window_start AS windowStart, window_end AS windowEnd FROM source_collection_jobs WHERE id = ? LIMIT 1')
    .bind(jobId)
    .first<{ id: string; sourceId: string; sourceType: 'x' | 'rss'; windowStart: string; windowEnd: string }>()
  if (!job) return NextResponse.json({ error: 'job not found' }, { status: 404 })

  const now = new Date().toISOString()
  const action = stringValue(payload.action) ?? 'complete'
  const status = action === 'fail' ? 'failed' : action === 'partial_quota_exhausted' ? 'partial_quota_exhausted' : 'completed'
  const creditsUsed = numberValue(payload.creditsUsed) ?? 0
  const run = currentRunTime()
  const items = Array.isArray(payload.items) ? payload.items : []

  if (status === 'completed' || status === 'partial_quota_exhausted') {
    await upsertIngestPayload(db, {
      date: stringValue(payload.date) ?? run.date,
      batch: stringValue(payload.batch) ?? run.batch,
      mode: 'source-collection',
      fetchedAt: now,
      updatedAt: now,
      stats: {
        totalSources: 1,
        successSources: 1,
        failedSources: 0,
        totalItems: items.length,
        successSourceIds: [job.sourceId],
        failedSourceIds: [],
      },
      items,
    })
    await upsertSourceCollectionSnapshot(db, {
      sourceId: job.sourceId,
      sourceType: job.sourceType,
      windowStart: job.windowStart,
      windowEnd: job.windowEnd,
      status: 'fresh',
      itemCount: items.length,
    })
  } else {
    await upsertSourceCollectionSnapshot(db, {
      sourceId: job.sourceId,
      sourceType: job.sourceType,
      windowStart: job.windowStart,
      windowEnd: job.windowEnd,
      status: 'failed',
      itemCount: 0,
    })
  }

  await recordSpend(db, jobId, creditsUsed, now)
  await db.batch([
    db.prepare('UPDATE source_collection_jobs SET status = ?, credits_used = ?, error = ?, updated_at = ?, completed_at = ? WHERE id = ?')
      .bind(status, creditsUsed, stringValue(payload.error), now, now, jobId),
    db.prepare('UPDATE workspace_source_subscriptions SET status = ?, updated_at = ? WHERE source_id = ?')
      .bind(status === 'completed' ? 'ready' : status, now, job.sourceId),
  ])

  return NextResponse.json({ ok: true, jobId, status })
}
