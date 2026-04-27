import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { AUTH_SESSION_COOKIE, deleteAuthSessionByToken, getAuthConfig } from '@/lib/auth'
import { getD1Binding } from '@/lib/cloudflare'

export const dynamic = 'force-dynamic'

function isSecureRequest(request: NextRequest): boolean {
  return new URL(request.url).protocol === 'https:'
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get(AUTH_SESSION_COOKIE)?.value
  const [db, config] = await Promise.all([getD1Binding().catch(() => null), getAuthConfig()])

  if (db && token) {
    await deleteAuthSessionByToken(db, config, token)
  }

  const response = NextResponse.redirect(new URL('/login', request.url), { status: 303 })
  response.cookies.set(AUTH_SESSION_COOKIE, '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
    sameSite: 'lax',
    secure: isSecureRequest(request),
  })

  return response
}
