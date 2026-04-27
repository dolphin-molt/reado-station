import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { formString, safeNextPath } from '@/lib/admin-forms'
import { setAdminItemHidden } from '@/lib/admin-data'
import { getCurrentAuthSession, isAdminSession } from '@/lib/auth'
import { getD1Database } from '@/lib/cloudflare'

export const dynamic = 'force-dynamic'

interface ItemRouteContext {
  params: Promise<{ id: string }>
}

function redirectTo(request: NextRequest, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, request.url), { status: 303 })
}

async function requireAdmin(request: NextRequest): Promise<NextResponse | null> {
  const session = await getCurrentAuthSession()
  if (isAdminSession(session)) return null
  if (session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return redirectTo(request, '/login?next=/admin/items')
}

export async function POST(request: NextRequest, context: ItemRouteContext): Promise<NextResponse> {
  const { id } = await context.params
  const auth = await requireAdmin(request)
  if (auth) return auth

  const form = await request.formData()
  const action = formString(form, 'action')
  const next = safeNextPath(formString(form, 'next') || '/admin/items', '/admin/items')
  const db = await getD1Database()
  if (!db) return NextResponse.json({ error: 'D1 database is required' }, { status: 503 })

  if (action === 'hide') {
    await setAdminItemHidden(db, id, true, formString(form, 'reason'))
  } else if (action === 'unhide') {
    await setAdminItemHidden(db, id, false, '')
  }

  return redirectTo(request, next)
}
