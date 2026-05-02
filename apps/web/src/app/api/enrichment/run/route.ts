import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getApiSecret, getD1Binding } from '@/lib/cloudflare'
import { runOneProfileEnrichmentJob } from '@/lib/source-enrichment'

export const dynamic = 'force-dynamic'

function bearerToken(request: NextRequest): string | null {
  const header = request.headers.get('authorization')
  if (header?.startsWith('Bearer ')) return header.slice('Bearer '.length).trim()
  return request.headers.get('x-reado-api-secret')
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = await getApiSecret()
  if (!secret || bearerToken(request) !== secret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = await getD1Binding().catch(() => null)
  if (!db) return NextResponse.json({ error: 'D1 database is required' }, { status: 503 })
  const result = await runOneProfileEnrichmentJob(db)
  return NextResponse.json({ result })
}
