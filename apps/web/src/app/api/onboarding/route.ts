import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { safeNextPath } from '@/lib/admin-forms'
import { getCurrentAuthSession } from '@/lib/auth'
import { getD1Binding } from '@/lib/cloudflare'
import { localizedPath, type Lang } from '@/lib/i18n'
import { getDefaultWorkspaceForUser } from '@/lib/workspaces'

export const dynamic = 'force-dynamic'

function redirectTo(request: NextRequest, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, request.url), { status: 303 })
}

function values(form: FormData, key: string): string[] {
  return form.getAll(key).map(String).filter(Boolean)
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const form = await request.formData()
  const lang = (String(form.get('lang') ?? 'zh') === 'en' ? 'en' : 'zh') satisfies Lang
  const next = safeNextPath(String(form.get('next') ?? localizedPath(lang, 'channels')), localizedPath(lang, 'channels'))
  const session = await getCurrentAuthSession()
  if (!session) return redirectTo(request, `${localizedPath(lang, 'login')}?next=${encodeURIComponent(localizedPath(lang, 'today'))}`)

  const db = await getD1Binding().catch(() => null)
  if (!db) return redirectTo(request, `${next}?onboarding=d1`)

  const workspace = await getDefaultWorkspaceForUser(db, session.userId, session.username)
  const now = new Date().toISOString()
  const skipped = String(form.get('skip') ?? '') === '1'
  await db
    .prepare(
      `
        INSERT INTO user_interest_profiles (
          user_id, workspace_id, industry, goals_json, topics_json, language, reading_use,
          skipped_at, completed_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          workspace_id = excluded.workspace_id,
          industry = excluded.industry,
          goals_json = excluded.goals_json,
          topics_json = excluded.topics_json,
          language = excluded.language,
          reading_use = excluded.reading_use,
          skipped_at = excluded.skipped_at,
          completed_at = excluded.completed_at,
          updated_at = excluded.updated_at
      `,
    )
    .bind(
      session.userId,
      workspace.id,
      String(form.get('industry') ?? ''),
      JSON.stringify(values(form, 'goal')),
      JSON.stringify(values(form, 'topic')),
      String(form.get('language') ?? 'mixed'),
      String(form.get('readingUse') ?? ''),
      skipped ? now : null,
      skipped ? null : now,
      now,
      now,
    )
    .run()

  return redirectTo(request, next)
}
