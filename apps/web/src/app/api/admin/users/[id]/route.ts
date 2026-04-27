import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { formString, safeNextPath } from '@/lib/admin-forms'
import { countAdminUsers, setAdminUserPassword, setAdminUserRole } from '@/lib/admin-data'
import { getCurrentAuthSession, isAdminSession } from '@/lib/auth'
import { getD1Database } from '@/lib/cloudflare'

export const dynamic = 'force-dynamic'

function redirectTo(request: NextRequest, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, request.url), { status: 303 })
}

async function requireAdmin(request: NextRequest, userId: string): Promise<NextResponse | null> {
  const session = await getCurrentAuthSession()
  if (isAdminSession(session)) return null
  if (session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return redirectTo(request, `/login?next=/admin/users`)
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params
  const auth = await requireAdmin(request, id)
  if (auth) return auth

  const session = await getCurrentAuthSession()
  const form = await request.formData()
  const action = formString(form, 'action') || 'set-role'
  const next = safeNextPath(formString(form, 'next') || '/admin/users', '/admin/users')
  const role = formString(form, 'role')
  const password = formString(form, 'password')

  const db = await getD1Database()
  if (!db) return NextResponse.json({ error: 'D1 database is required' }, { status: 503 })

  if (action === 'set-password') {
    if (password.length < 8) {
      return redirectTo(request, `${next}${next.includes('?') ? '&' : '?'}error=password`)
    }
    await setAdminUserPassword(db, id, password)
    return redirectTo(request, `${next}${next.includes('?') ? '&' : '?'}success=password`)
  }

  if (action !== 'set-role') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  if (role !== 'admin' && role !== 'member') {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  if (role === 'member') {
    const adminCount = await countAdminUsers(db)
    if (adminCount <= 1) {
      return redirectTo(request, `${next}${next.includes('?') ? '&' : '?'}error=last-admin`)
    }
    if (session?.userId === id) {
      return redirectTo(request, `${next}${next.includes('?') ? '&' : '?'}error=self-demote`)
    }
  }

  await setAdminUserRole(db, id, role)
  return redirectTo(request, `${next}${next.includes('?') ? '&' : '?'}success=role`)
}
