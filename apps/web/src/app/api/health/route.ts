import { NextResponse } from 'next/server'

import { D1UnavailableError, getD1Database } from '@/lib/cloudflare'

export const dynamic = 'force-dynamic'

interface HealthCounts {
  itemCount: number
  digestCount: number
  latestDate: string | null
}

async function readCounts(db: D1Database): Promise<HealthCounts> {
  const row = await db
    .prepare(
      `
        SELECT
          (SELECT COUNT(1) FROM items) AS itemCount,
          (SELECT COUNT(1) FROM digests) AS digestCount,
          (SELECT MAX(date) FROM items) AS latestDate
      `,
    )
    .first<HealthCounts>()

  return {
    itemCount: Number(row?.itemCount ?? 0),
    digestCount: Number(row?.digestCount ?? 0),
    latestDate: row?.latestDate ?? null,
  }
}

export async function GET() {
  try {
    const db = await getD1Database()
    if (!db) {
      return NextResponse.json({
        status: 'degraded',
        contentSource: 'json',
        d1: 'unavailable',
      })
    }

    return NextResponse.json({
      status: 'ok',
      contentSource: 'd1',
      d1: 'ok',
      counts: await readCounts(db),
    })
  } catch (error) {
    const status = error instanceof D1UnavailableError ? 503 : 500
    const message = error instanceof Error ? error.message : 'Unknown health check error'
    return NextResponse.json({ status: 'error', d1: 'error', error: message }, { status })
  }
}
