import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getCurrentAuthSession } from '@/lib/auth'
import { getD1Binding } from '@/lib/cloudflare'
import { collectionWindowForHours, ensureSourceCollectionJob } from '@/lib/source-collections'
import { getDefaultWorkspaceForUser } from '@/lib/workspaces'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ sourceId: string }>
}

function redirectBack(request: NextRequest, sourceId: string, status: string): NextResponse {
  const formLang = new URL(request.url).searchParams.get('lang')
  const prefix = formLang === 'en' ? '/en/sources' : '/sources'
  return NextResponse.redirect(new URL(`${prefix}/${encodeURIComponent(sourceId)}?collect=${status}`, request.url), { status: 303 })
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { sourceId } = await context.params
  const session = await getCurrentAuthSession()
  if (!session) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(`/sources/${sourceId}`)}`, request.url), { status: 303 })

  const db = await getD1Binding().catch(() => null)
  if (!db) return redirectBack(request, sourceId, 'd1')

  const workspace = await getDefaultWorkspaceForUser(db, session.userId, session.username)
  const subscription = await db
    .prepare(
      `
        SELECT source_type AS sourceType, backfill_hours AS backfillHours
        FROM workspace_source_subscriptions
        WHERE workspace_id = ? AND source_id = ?
        LIMIT 1
      `,
    )
    .bind(workspace.id, sourceId)
    .first<{ sourceType: 'x' | 'rss'; backfillHours: number | null }>()

  if (!subscription) return redirectBack(request, sourceId, 'missing')

  const { windowStart, windowEnd } = collectionWindowForHours(Number(subscription.backfillHours ?? 24))
  await ensureSourceCollectionJob(db, {
    force: true,
    sourceId,
    sourceType: subscription.sourceType,
    windowStart,
    windowEnd,
    requestedByWorkspaceId: workspace.id,
  })

  return redirectBack(request, sourceId, 'queued')
}
