import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import {
  AUTH_SESSION_COOKIE,
  cleanupExpiredAuthSessions,
  createAuthSession,
  createRegisteredUser,
  getAuthConfig,
  getAuthUserByUsername,
} from '@/lib/auth'
import { getD1Binding } from '@/lib/cloudflare'

export const dynamic = 'force-dynamic'

function formString(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value : ''
}

function safeNextPath(value: string): string {
  if (!value.startsWith('/') || value.startsWith('//')) return '/'
  if (value === '/admin' || value.startsWith('/admin/')) return '/'
  return value
}

function isSecureRequest(request: NextRequest): boolean {
  return new URL(request.url).protocol === 'https:'
}

function registerRedirect(request: NextRequest, error: string, nextPath: string): NextResponse {
  const url = new URL('/register', request.url)
  url.searchParams.set('error', error)
  if (nextPath !== '/') url.searchParams.set('next', nextPath)
  return NextResponse.redirect(url, { status: 303 })
}

function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]{2,31}$/.test(username)
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const form = await request.formData()
  const username = formString(form.get('username')).trim()
  const password = formString(form.get('password'))
  const confirmPassword = formString(form.get('confirmPassword'))
  const nextPath = safeNextPath(formString(form.get('next')) || '/')

  if (!isValidUsername(username)) return registerRedirect(request, 'username', nextPath)
  if (password.length < 8) return registerRedirect(request, 'password', nextPath)
  if (password !== confirmPassword) return registerRedirect(request, 'mismatch', nextPath)

  const [db, config] = await Promise.all([getD1Binding().catch(() => null), getAuthConfig()])
  if (!db || !config.authSecret) return registerRedirect(request, 'config', nextPath)

  const existing = await getAuthUserByUsername(db, username)
  if (existing) return registerRedirect(request, 'exists', nextPath)

  let user: Awaited<ReturnType<typeof createRegisteredUser>>
  try {
    user = await createRegisteredUser(db, { username, password })
  } catch (error) {
    console.error('Failed to create registered user', error)
    return registerRedirect(request, 'config', nextPath)
  }
  await cleanupExpiredAuthSessions(db)
  const session = await createAuthSession(db, config, user.id)
  const response = NextResponse.redirect(new URL(nextPath, request.url), { status: 303 })
  response.cookies.set(AUTH_SESSION_COOKIE, session.token, {
    expires: session.expiresAt,
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: isSecureRequest(request),
  })

  return response
}
