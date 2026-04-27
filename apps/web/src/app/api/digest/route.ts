import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/api-auth'
import { D1UnavailableError, getD1Database } from '@/lib/cloudflare'
import { loadDigestForDate } from '@/lib/content-d1'
import { upsertDigestPayload } from '@/lib/d1-write'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const db = await getD1Database()
    if (!db) return NextResponse.json({ error: 'D1 database is unavailable' }, { status: 503 })

    const date = request.nextUrl.searchParams.get('date')
    if (!date) return NextResponse.json({ error: 'date is required' }, { status: 400 })

    const digest = await loadDigestForDate(db, date)
    return NextResponse.json({
      status: digest ? 'ok' : 'missing',
      date,
      digest,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load digest'
    const status = error instanceof D1UnavailableError ? 503 : 400
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireApiAuth(request)
  if (authError) return authError

  try {
    const db = await getD1Database()
    if (!db) return NextResponse.json({ error: 'D1 database is unavailable' }, { status: 503 })

    const result = await upsertDigestPayload(db, await request.json())
    return NextResponse.json({ status: 'ok', ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid digest payload'
    const status = error instanceof D1UnavailableError ? 503 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
