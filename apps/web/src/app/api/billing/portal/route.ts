import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { createPortalSession, recordBillingEvent } from '@/lib/billing'
import { getCurrentAuthSession } from '@/lib/auth'
import { getD1Binding } from '@/lib/cloudflare'
import { getDefaultWorkspaceForUser } from '@/lib/workspaces'

export const dynamic = 'force-dynamic'

function subscriptionRedirect(request: NextRequest, error?: string): NextResponse {
  const url = new URL('/subscription', request.url)
  if (error) url.searchParams.set('billingError', error)
  return NextResponse.redirect(url, { status: 303 })
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return subscriptionRedirect(request)
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getCurrentAuthSession()
  if (!session) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent('/subscription')}`, request.url), { status: 303 })
  const traceId = crypto.randomUUID()

  const db = await getD1Binding().catch(() => null)
  if (!db) return subscriptionRedirect(request, 'd1')

  try {
    const workspace = await getDefaultWorkspaceForUser(db, session.userId, session.username)
    await recordBillingEvent(db, {
      traceId,
      stage: 'portal.create',
      status: 'started',
      workspaceId: workspace.id,
      userId: session.userId,
    })
    const created = await createPortalSession({
      db,
      workspace,
      userId: session.userId,
      origin: new URL(request.url).origin,
      traceId,
    })
    await recordBillingEvent(db, {
      traceId,
      stage: 'portal.create',
      status: 'succeeded',
      workspaceId: workspace.id,
      userId: session.userId,
      stripeCustomerId: created.customerId,
      message: 'Stripe billing portal session created',
    })
    return NextResponse.redirect(created.url, { status: 303 })
  } catch (error) {
    console.error('Stripe portal creation failed', error)
    await recordBillingEvent(db, {
      traceId,
      stage: 'portal.create',
      status: 'failed',
      userId: session.userId,
      message: error instanceof Error ? error.message : 'Unknown portal error',
    }).catch(() => null)
    return subscriptionRedirect(request, 'stripe-config')
  }
}
