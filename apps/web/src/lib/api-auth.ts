import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getApiSecret } from '@/lib/cloudflare'
import { constantTimeEqual } from '@/lib/security'

function bearerToken(request: NextRequest): string {
  const header = request.headers.get('authorization') ?? ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1] ?? ''
}

export async function requireApiAuth(request: NextRequest): Promise<NextResponse | null> {
  const expected = await getApiSecret()
  if (!expected) {
    return NextResponse.json({ error: 'READO_API_SECRET is not configured' }, { status: 503 })
  }

  if (!constantTimeEqual(bearerToken(request), expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}
