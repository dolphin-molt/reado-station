import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { safeNextPath } from '@/lib/admin-forms'
import { getCurrentAuthSession } from '@/lib/auth'
import { getD1Binding } from '@/lib/cloudflare'
import { getDefaultWorkspaceForUser } from '@/lib/workspaces'
import { unsubscribeWorkspaceSource } from '@/lib/workspace-sources'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ sourceId: string }>
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { sourceId } = await context.params
  const form = await request.formData().catch(() => new FormData())
  const lang = String(form.get('lang') ?? 'zh')
  const next = safeNextPath(String(form.get('next') ?? (lang === 'en' ? '/en/sources' : '/sources')), lang === 'en' ? '/en/sources' : '/sources')

  const session = await getCurrentAuthSession()
  if (!session) {
    return NextResponse.redirect(new URL(`${lang === 'en' ? '/en/login' : '/login'}?next=${encodeURIComponent(next)}`, request.url), { status: 303 })
  }

  const db = await getD1Binding().catch(() => null)
  if (!db) {
    return NextResponse.redirect(new URL(`${next}?unsubscribed=d1`, request.url), { status: 303 })
  }

  const workspace = await getDefaultWorkspaceForUser(db, session.userId, session.username)
  await unsubscribeWorkspaceSource(db, {
    workspaceId: workspace.id,
    userId: session.userId,
    sourceId,
  })

  return NextResponse.redirect(new URL(`${next}?unsubscribed=1`, request.url), { status: 303 })
}
