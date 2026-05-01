import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getApiSecret, getD1Binding } from '@/lib/cloudflare'

export const dynamic = 'force-dynamic'

function bearerToken(request: NextRequest): string | null {
  const header = request.headers.get('authorization')
  if (header?.startsWith('Bearer ')) return header.slice('Bearer '.length).trim()
  return request.headers.get('x-reado-api-secret')
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = await getApiSecret()
  if (!secret || bearerToken(request) !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = await getD1Binding().catch(() => null)
  if (!db) return NextResponse.json({ error: 'D1 database is required' }, { status: 503 })

  const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const limit = Math.min(Math.max(numberValue(payload.limit, 5), 1), 20)
  const now = new Date().toISOString()
  const { results = [] } = await db
    .prepare(
      `
        SELECT
          j.id,
          j.source_id AS sourceId,
          j.source_type AS sourceType,
          j.window_start AS windowStart,
          j.window_end AS windowEnd,
          s.name AS sourceName,
          s.url AS sourceUrl,
          s.adapter
        FROM source_collection_jobs j
        INNER JOIN sources s ON s.id = j.source_id
        WHERE j.status = 'queued'
        ORDER BY j.created_at ASC
        LIMIT ?
      `,
    )
    .bind(limit)
    .all()

  if (results.length > 0) {
    await db.batch(results.map((job) =>
      db.prepare("UPDATE source_collection_jobs SET status = 'running', started_at = ?, updated_at = ? WHERE id = ? AND status = 'queued'")
        .bind(now, now, (job as { id: string }).id),
    ))
  }

  return NextResponse.json({ jobs: results })
}
