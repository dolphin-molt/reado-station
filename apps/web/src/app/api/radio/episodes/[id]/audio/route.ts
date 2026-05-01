import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getD1Binding, getCloudflareEnv } from '@/lib/cloudflare'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params
  const [db, env] = await Promise.all([getD1Binding().catch(() => null), getCloudflareEnv()])
  if (!db || !env?.AUDIO_BUCKET) return NextResponse.json({ error: 'audio storage unavailable' }, { status: 503 })
  const row = await db.prepare('SELECT r2_key AS r2Key FROM radio_episodes WHERE id = ? LIMIT 1').bind(id).first<{ r2Key: string | null }>()
  if (!row?.r2Key) return NextResponse.json({ error: 'audio not found' }, { status: 404 })
  const object = await env.AUDIO_BUCKET.get(row.r2Key)
  if (!object) return NextResponse.json({ error: 'audio not found' }, { status: 404 })
  return new NextResponse(object.body, {
    headers: {
      'content-type': object.httpMetadata?.contentType ?? 'audio/mpeg',
      'cache-control': 'private, max-age=300',
    },
  })
}
