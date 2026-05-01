import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getApiSecret, getCloudflareEnv, getD1Binding } from '@/lib/cloudflare'
import { runQueuedRadioEpisode } from '@/lib/radio'

export const dynamic = 'force-dynamic'

function bearerToken(request: NextRequest): string | null {
  const header = request.headers.get('authorization')
  if (header?.startsWith('Bearer ')) return header.slice('Bearer '.length).trim()
  return request.headers.get('x-reado-api-secret')
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = await getApiSecret()
  if (!secret || bearerToken(request) !== secret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const [db, env] = await Promise.all([getD1Binding().catch(() => null), getCloudflareEnv()])
  if (!db || !env) return NextResponse.json({ error: 'D1 and Cloudflare env are required' }, { status: 503 })
  const episode = await runQueuedRadioEpisode(db, env)
  return NextResponse.json({ episode })
}
