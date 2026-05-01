import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getCurrentAuthSession } from '@/lib/auth'
import { getD1Binding } from '@/lib/cloudflare'
import { getHomePageData } from '@/lib/content'
import { createRadioEpisode, radioScriptFromDigest } from '@/lib/radio'
import { getDefaultWorkspaceForUser } from '@/lib/workspaces'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getCurrentAuthSession()
  if (!session) return NextResponse.redirect(new URL('/login?next=/today', request.url), { status: 303 })
  const db = await getD1Binding().catch(() => null)
  if (!db) return NextResponse.redirect(new URL('/today?radio=d1', request.url), { status: 303 })

  const workspace = await getDefaultWorkspaceForUser(db, session.userId, session.username)
  const data = await getHomePageData('zh')
  if (!data.date) return NextResponse.redirect(new URL('/today?radio=no-digest', request.url), { status: 303 })
  const script = radioScriptFromDigest({
    headline: '今日简报',
    observationText: data.observationText,
    stories: data.keyStories,
  })
  try {
    await createRadioEpisode(db, {
      workspaceId: workspace.id,
      userId: session.userId,
      date: data.date,
      title: `reado 每日电台 · ${data.date}`,
      script,
    })
    return NextResponse.redirect(new URL('/today?radio=queued', request.url), { status: 303 })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'failed'
    return NextResponse.redirect(new URL(`/today?radio=${encodeURIComponent(code)}`, request.url), { status: 303 })
  }
}
