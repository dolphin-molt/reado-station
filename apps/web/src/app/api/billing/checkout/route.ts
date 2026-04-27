import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { createCheckoutSession, recordBillingEvent } from '@/lib/billing'
import { getCurrentAuthSession } from '@/lib/auth'
import { getD1Binding } from '@/lib/cloudflare'
import { normalizePlanId } from '@/lib/plans'
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

  const form = await request.formData()
  const planId = normalizePlanId(String(form.get('plan') ?? 'free'))
  if (planId === 'free') return subscriptionRedirect(request)
  const traceId = crypto.randomUUID()

  const db = await getD1Binding().catch(() => null)
  if (!db) return subscriptionRedirect(request, 'd1')

  try {
    const workspace = await getDefaultWorkspaceForUser(db, session.userId, session.username)
    const user = await db.prepare('SELECT email FROM auth_users WHERE id = ? LIMIT 1').bind(session.userId).first<{ email: string | null }>()
    await recordBillingEvent(db, {
      traceId,
      stage: 'checkout.create',
      status: 'started',
      workspaceId: workspace.id,
      userId: session.userId,
      planId,
      metadata: { origin: new URL(request.url).origin },
    })
    const created = await createCheckoutSession({
      db,
      workspace,
      userId: session.userId,
      email: user?.email,
      planId,
      origin: new URL(request.url).origin,
      traceId,
    })
    await recordBillingEvent(db, {
      traceId,
      stage: 'checkout.create',
      status: 'succeeded',
      workspaceId: workspace.id,
      userId: session.userId,
      planId,
      stripeCustomerId: created.customerId,
      stripeCheckoutSessionId: created.sessionId,
      message: 'Stripe checkout session created',
    })
    return NextResponse.redirect(created.url, { status: 303 })
  } catch (error) {
    console.error('Stripe checkout creation failed', error)
    await recordBillingEvent(db, {
      traceId,
      stage: 'checkout.create',
      status: 'failed',
      userId: session.userId,
      planId,
      message: error instanceof Error ? error.message : 'Unknown checkout error',
    }).catch(() => null)
    return subscriptionRedirect(request, 'stripe-config')
  }
}
