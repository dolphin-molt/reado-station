import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { safeNextPath, sourceInputFromForm } from '@/lib/admin-forms'
import { upsertAdminSource } from '@/lib/admin-data'
import { getCurrentAuthSession } from '@/lib/auth'
import { getD1Database } from '@/lib/cloudflare'

export const dynamic = 'force-dynamic'

function redirectTo(request: NextRequest, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, request.url), { status: 303 })
}

async function requireAdmin(request: NextRequest): Promise<NextResponse | null> {
  const session = await getCurrentAuthSession()
  if (session) return null
  return redirectTo(request, '/login?next=/admin/sources')
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin(request)
  if (auth) return auth

  const form = await request.formData()
  const input = sourceInputFromForm(form)
  const db = await getD1Database()
  if (!db) return NextResponse.json({ error: 'D1 database is required' }, { status: 503 })

  await upsertAdminSource(db, input)
  return redirectTo(request, safeNextPath(`/admin/sources/${encodeURIComponent(input.id)}`))
}
