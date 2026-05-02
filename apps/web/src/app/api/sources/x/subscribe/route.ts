import type { NextRequest } from 'next/server'
import { after } from 'next/server'
import { NextResponse } from 'next/server'

import { safeNextPath } from '@/lib/admin-forms'
import { getCurrentAuthSession } from '@/lib/auth'
import { getD1Binding } from '@/lib/cloudflare'
import { runSourceCollectionQueue } from '@/lib/source-collection-runner'
import { runProfileEnrichmentQueue } from '@/lib/source-enrichment'
import { getDefaultWorkspaceForUser } from '@/lib/workspaces'
import { shouldRunSourceCollectionAfterSubscribe, sourceErrorCode, subscribeWorkspaceSource } from '@/lib/workspace-sources'

export const dynamic = 'force-dynamic'

function redirectTo(request: NextRequest, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, request.url), { status: 303 })
}

function sourcePagePath(lang: string, params: Record<string, string>): string {
  const prefix = lang === 'en' ? '/en/sources/new' : '/sources/new'
  const query = new URLSearchParams({ type: 'x', ...params })
  return `${prefix}?${query.toString()}`
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const form = await request.formData()
  const lang = String(form.get('lang') ?? 'zh')
  const handle = String(form.get('handle') ?? '').trim()
  const next = safeNextPath(String(form.get('next') ?? (lang === 'en' ? '/en/?category=twitter' : '/?category=twitter')), lang === 'en' ? '/en/?category=twitter' : '/?category=twitter')

  const session = await getCurrentAuthSession()
  if (!session) {
    return redirectTo(request, `${lang === 'en' ? '/en/login' : '/login'}?next=${encodeURIComponent(sourcePagePath(lang, { q: handle }))}`)
  }

  const db = await getD1Binding().catch(() => null)
  if (!db) {
    return redirectTo(request, sourcePagePath(lang, { q: handle, error: 'd1' }))
  }

  try {
    const workspace = await getDefaultWorkspaceForUser(db, session.userId, session.username)
    const result = await subscribeWorkspaceSource(db, {
      type: 'x',
      value: handle,
      visibility: String(form.get('visibility') ?? 'private'),
      backfillHours: String(form.get('backfillHours') ?? '24'),
      userId: session.userId,
      workspace,
    })
    if (shouldRunSourceCollectionAfterSubscribe(result.collectionStatus) || result.profileEnrichmentJobId) {
      after(async () => {
        await Promise.all([
          shouldRunSourceCollectionAfterSubscribe(result.collectionStatus)
            ? runSourceCollectionQueue(db, { maxJobs: 3 }).catch((error) => {
                console.error('Source collection queue kick failed after X subscribe', error)
              })
            : Promise.resolve(null),
          result.profileEnrichmentJobId
            ? runProfileEnrichmentQueue(db, { maxJobs: 3 }).catch((error) => {
                console.error('Profile enrichment queue kick failed after X subscribe', error)
              })
            : Promise.resolve(null),
        ])
      })
    }
    const separator = next.includes('?') ? '&' : '?'
    return redirectTo(request, `${next}${separator}source=${encodeURIComponent(result.sourceId)}&subscribed=1`)
  } catch (error) {
    return redirectTo(request, sourcePagePath(lang, { q: handle, error: sourceErrorCode(error) }))
  }
}
