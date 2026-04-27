import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import {
  AUTH_SESSION_COOKIE,
  cleanupExpiredAuthSessions,
  createAuthSession,
  clearLoginAttempts,
  getActiveLoginLock,
  getAuthConfig,
  loginAttemptKey,
  recordFailedLoginAttempt,
  safeNextPathForRole,
  updateUserLastLogin,
  verifyLoginCredentials,
} from '@/lib/auth'
import { getD1Binding } from '@/lib/cloudflare'

export const dynamic = 'force-dynamic'

function formString(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value : ''
}

function safeNextPath(value: string): string {
  if (!value.startsWith('/') || value.startsWith('//')) return '/admin'
  return value
}

function clientId(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return request.headers.get('cf-connecting-ip') ?? forwarded ?? 'unknown'
}

function isSecureRequest(request: NextRequest): boolean {
  return new URL(request.url).protocol === 'https:'
}

function loginRedirect(request: NextRequest, error: string, nextPath: string): NextResponse {
  const url = new URL('/login', request.url)
  url.searchParams.set('error', error)
  if (nextPath !== '/admin') url.searchParams.set('next', nextPath)
  return NextResponse.redirect(url, { status: 303 })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const form = await request.formData()
  const username = formString(form.get('username')).trim()
  const password = formString(form.get('password'))
  const nextPath = safeNextPath(formString(form.get('next')) || '/admin')

  const [db, config] = await Promise.all([getD1Binding().catch(() => null), getAuthConfig()])
  if (!db || !config.authSecret) {
    return loginRedirect(request, 'config', nextPath)
  }

  const attemptKey = await loginAttemptKey(config, username, clientId(request))
  const lockedUntil = await getActiveLoginLock(db, attemptKey)
  if (lockedUntil) {
    return loginRedirect(request, 'locked', nextPath)
  }

  const user = await verifyLoginCredentials(db, config, username, password)
  if (!user) {
    await recordFailedLoginAttempt(db, attemptKey)
    return loginRedirect(request, 'invalid', nextPath)
  }

  await clearLoginAttempts(db, attemptKey)
  await cleanupExpiredAuthSessions(db)
  await updateUserLastLogin(db, user.id)
  const session = await createAuthSession(db, config, user.id)
  const redirectPath = safeNextPathForRole(nextPath, user.role)
  const response = NextResponse.redirect(new URL(redirectPath, request.url), { status: 303 })
  response.cookies.set(AUTH_SESSION_COOKIE, session.token, {
    expires: session.expiresAt,
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: isSecureRequest(request),
  })

  return response
}
