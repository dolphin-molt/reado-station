import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { safeNextPath } from '@/lib/admin-forms'
import { expandChannelSelection } from '@/lib/channel-catalog'
import { subscribeMarketChannelBatch } from '@/lib/channel-subscription-batch'
import { getCurrentAuthSession } from '@/lib/auth'
import { getD1Binding } from '@/lib/cloudflare'
import { localizedPath, type Lang } from '@/lib/i18n'
import { getDefaultWorkspaceForUser } from '@/lib/workspaces'
import { sourceErrorCode, subscribeWorkspaceSource } from '@/lib/workspace-sources'

export const dynamic = 'force-dynamic'

function redirectTo(request: NextRequest, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, request.url), { status: 303 })
}

function formValues(form: FormData, key: string): string[] {
  return form.getAll(key).map(String).filter(Boolean)
}

function selectedChannelIds(form: FormData): string[] {
  const ids = formValues(form, 'channelId')
  const packIds = formValues(form, 'packId')
  return expandChannelSelection(ids, packIds)
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const form = await request.formData()
  const lang = (String(form.get('lang') ?? 'zh') === 'en' ? 'en' : 'zh') satisfies Lang
  const next = safeNextPath(String(form.get('next') ?? localizedPath(lang, 'sources')), localizedPath(lang, 'sources'))
  const ids = selectedChannelIds(form)

  const session = await getCurrentAuthSession()
  if (!session) {
    return redirectTo(request, `${localizedPath(lang, 'login')}?next=${encodeURIComponent(localizedPath(lang, 'channels'))}`)
  }

  const db = await getD1Binding().catch(() => null)
  if (!db) return redirectTo(request, `${localizedPath(lang, 'channels')}?error=d1`)

  const workspace = await getDefaultWorkspaceForUser(db, session.userId, session.username)
  const result = await subscribeMarketChannelBatch(ids, async (channel) => {
    await subscribeWorkspaceSource(db, {
        type: channel.type,
        value: channel.value,
        visibility: 'private',
        backfillHours: '24',
        userId: session.userId,
        workspace,
      })
  }, sourceErrorCode)

  const separator = next.includes('?') ? '&' : '?'
  return redirectTo(
    request,
    `${next}${separator}added=${result.added}${result.failed ? `&failed=${result.failed}` : ''}${result.firstError ? `&error=${encodeURIComponent(result.firstError)}` : ''}`,
  )
}
