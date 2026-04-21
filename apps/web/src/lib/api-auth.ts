import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getApiSecret } from '@/lib/cloudflare'

const encoder = new TextEncoder()

function bearerToken(request: NextRequest): string {
  const header = request.headers.get('authorization') ?? ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1] ?? ''
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = encoder.encode(left)
  const rightBytes = encoder.encode(right)
  const maxLength = Math.max(leftBytes.length, rightBytes.length, 1)
  let mismatch = leftBytes.length ^ rightBytes.length

  for (let index = 0; index < maxLength; index++) {
    const leftByte = leftBytes.length > 0 ? leftBytes[index % leftBytes.length] : 0
    const rightByte = rightBytes.length > 0 ? rightBytes[index % rightBytes.length] : 0
    mismatch |= leftByte ^ rightByte
  }

  return mismatch === 0
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
