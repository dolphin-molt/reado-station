import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/api-auth'
import { D1UnavailableError, getCloudflareEnv, getD1Database } from '@/lib/cloudflare'
import { generateLatestDigest } from '@/lib/digest-generator'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const authError = await requireApiAuth(request)
  if (authError) return authError

  try {
    const [db, env] = await Promise.all([getD1Database(), getCloudflareEnv()])
    if (!db) return NextResponse.json({ error: 'D1 database is unavailable' }, { status: 503 })
    if (!env) return NextResponse.json({ error: 'Cloudflare environment is unavailable' }, { status: 503 })

    const input = request.headers.get('content-type')?.includes('application/json')
      ? await request.json().catch(() => ({}))
      : {}
    return NextResponse.json(await generateLatestDigest(db, env, input))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate digest'
    const status = error instanceof D1UnavailableError ? 503 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
