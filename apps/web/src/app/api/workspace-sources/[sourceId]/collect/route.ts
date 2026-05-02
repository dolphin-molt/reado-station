import type { NextRequest } from 'next/server'
import { after } from 'next/server'
import { NextResponse } from 'next/server'

import { getCurrentAuthSession } from '@/lib/auth'
import { getD1Binding } from '@/lib/cloudflare'
import { runSourceCollectionQueue } from '@/lib/source-collection-runner'
import { enqueueProfileEnrichmentJob, runProfileEnrichmentQueue } from '@/lib/source-enrichment'
import { collectionWindowForHours, ensureSourceCollectionJob, findActiveSourceCollectionJobForSource } from '@/lib/source-collections'
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

async function enqueueProfileEnrichmentForSource(db: D1Database, sourceId: string, sourceType: string): Promise<string | null> {
  if (sourceType !== 'x' || !sourceId.toLowerCase().startsWith('tw-')) return null
  const username = sourceId.slice(3)
  const result = await enqueueProfileEnrichmentJob(db, {
    jobType: 'discover_profile_assets',
    sourceType: 'x',
    sourceValue: username,
  }).catch((error) => {
    if (error instanceof Error && error.message.includes('enrichment_jobs')) return null
    throw error
  })
  return result?.id ?? null
}

function kickQueues(db: D1Database, options: { runCollection: boolean; runProfileEnrichment: boolean }): void {
  after(async () => {
    await Promise.all([
      options.runCollection
        ? runSourceCollectionQueue(db, { maxJobs: 3 }).catch((error) => {
            console.error('Source collection queue kick failed after manual collect', error)
          })
        : Promise.resolve(null),
      options.runProfileEnrichment
        ? runProfileEnrichmentQueue(db, { maxJobs: 3 }).catch((error) => {
            console.error('Profile enrichment queue kick failed after manual collect', error)
          })
        : Promise.resolve(null),
    ])
  })
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

  const profileEnrichmentJobId = await enqueueProfileEnrichmentForSource(db, sourceId, subscription.sourceType)
  const activeJob = await findActiveSourceCollectionJobForSource(db, sourceId)
  if (activeJob) {
    kickQueues(db, { runCollection: true, runProfileEnrichment: Boolean(profileEnrichmentJobId) })
    return redirectBack(request, sourceId, activeJob.status)
  }

  const { windowStart, windowEnd } = collectionWindowForHours(Number(subscription.backfillHours ?? 24))
  const collection = await ensureSourceCollectionJob(db, {
    force: true,
    sourceId,
    sourceType: subscription.sourceType,
    windowStart,
    windowEnd,
    requestedByWorkspaceId: workspace.id,
  })
  kickQueues(db, { runCollection: true, runProfileEnrichment: Boolean(profileEnrichmentJobId) })

  return redirectBack(request, sourceId, collection.job?.status ?? 'queued')
}
