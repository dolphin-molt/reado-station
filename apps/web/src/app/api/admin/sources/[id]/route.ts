import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { formString, safeNextPath, sourceInputFromForm } from '@/lib/admin-forms'
import { setAdminSourceEnabled, upsertAdminSource } from '@/lib/admin-data'
import { getCurrentAuthSession, isAdminSession } from '@/lib/auth'
import { getD1Database } from '@/lib/cloudflare'

export const dynamic = 'force-dynamic'

interface SourceRouteContext {
  params: Promise<{ id: string }>
}

function redirectTo(request: NextRequest, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, request.url), { status: 303 })
}

async function requireAdmin(request: NextRequest, id: string): Promise<NextResponse | null> {
  const session = await getCurrentAuthSession()
  if (isAdminSession(session)) return null
  if (session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return redirectTo(request, `/login?next=/admin/sources/${encodeURIComponent(id)}`)
}

export async function POST(request: NextRequest, context: SourceRouteContext): Promise<NextResponse> {
  const { id } = await context.params
  const auth = await requireAdmin(request, id)
  if (auth) return auth

  const form = await request.formData()
  const action = formString(form, 'action')
  const next = safeNextPath(formString(form, 'next') || `/admin/sources/${encodeURIComponent(id)}`, '/admin/sources')
  const db = await getD1Database()
  if (!db) return NextResponse.json({ error: 'D1 database is required' }, { status: 503 })

  if (action === 'enable' || action === 'disable') {
    await setAdminSourceEnabled(db, id, action === 'enable')
    return redirectTo(request, next)
  }

  await upsertAdminSource(db, sourceInputFromForm(form, id))
  return redirectTo(request, next)
}
