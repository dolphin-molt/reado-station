import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getStripeWebhookSecret, grantMonthlyCredits, planFromStripePriceId, recordBillingEvent, upsertBillingSubscription } from '@/lib/billing'
import { getCloudflareEnv, getD1Binding } from '@/lib/cloudflare'

export const dynamic = 'force-dynamic'

interface StripeEvent {
  id: string
  type: string
  data: { object: Record<string, unknown> }
}

function stripeSignatureParts(header: string | null): { timestamp: string; signature: string } | null {
  if (!header) return null
  const parts = Object.fromEntries(header.split(',').map((part) => {
    const [key, value] = part.split('=')
    return [key, value]
  }))
  return parts.t && parts.v1 ? { timestamp: parts.t, signature: parts.v1 } : null
}

function hex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function hmacSha256(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return hex(await crypto.subtle.sign('HMAC', key, encoder.encode(payload)))
}

async function verifyStripeSignature(request: NextRequest, rawBody: string): Promise<boolean> {
  const secret = await getStripeWebhookSecret()
  if (!secret) return false
  const parts = stripeSignatureParts(request.headers.get('stripe-signature'))
  if (!parts) return false
  const expected = await hmacSha256(secret, `${parts.timestamp}.${rawBody}`)
  return expected === parts.signature
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' ? value : null
}

function boolValue(value: unknown): boolean {
  return value === true
}

function metadataValue(object: Record<string, unknown>, key: string): string | null {
  const metadata = object.metadata
  return metadata && typeof metadata === 'object' ? stringValue((metadata as Record<string, unknown>)[key]) : null
}

function amountValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function subscriptionIdFromInvoice(object: Record<string, unknown>): string | null {
  if (typeof object.subscription === 'string') return object.subscription
  if (object.subscription && typeof object.subscription === 'object') {
    return stringValue((object.subscription as Record<string, unknown>).id)
  }
  return null
}

async function hasProcessedInvoicePaidEvent(db: D1Database, eventId: string, invoiceId: string | null): Promise<boolean> {
  const row = await db
    .prepare(
      `
        SELECT id
        FROM credit_ledger
        WHERE action = 'monthly_grant'
          AND (
            json_extract(metadata_json, '$.stripe_event_id') = ?
            OR (? IS NOT NULL AND json_extract(metadata_json, '$.invoice_id') = ?)
          )
        LIMIT 1
      `,
    )
    .bind(eventId, invoiceId, invoiceId)
    .first<{ id: string }>()

  return Boolean(row?.id)
}

async function handleSubscriptionEvent(db: D1Database, object: Record<string, unknown>, env: Record<string, string | undefined>): Promise<void> {
  const workspaceId = metadataValue(object, 'workspace_id')
  if (!workspaceId) return
  const items = object.items && typeof object.items === 'object' ? (object.items as { data?: Array<Record<string, unknown>> }).data ?? [] : []
  const price = items[0]?.price && typeof items[0].price === 'object' ? (items[0].price as Record<string, unknown>) : {}
  const planId = planFromStripePriceId(stringValue(price.id), env)

  await upsertBillingSubscription(db, {
    workspaceId,
    customerId: stringValue(object.customer),
    subscriptionId: stringValue(object.id),
    planId,
    status: stringValue(object.status) ?? 'unknown',
    currentPeriodStart: numberValue(object.current_period_start),
    currentPeriodEnd: numberValue(object.current_period_end),
    cancelAtPeriodEnd: boolValue(object.cancel_at_period_end),
  })
}

async function handleInvoicePaid(
  db: D1Database,
  object: Record<string, unknown>,
  env: Record<string, string | undefined>,
  eventId: string,
): Promise<void> {
  const subscription =
    object.subscription && typeof object.subscription === 'object'
      ? (object.subscription as Record<string, unknown>)
      : null
  const subscriptionId = subscriptionIdFromInvoice(object)
  const invoiceId = stringValue(object.id)
  let workspaceId = metadataValue(object, 'workspace_id') ?? (subscription ? metadataValue(subscription, 'workspace_id') : null)

  if (!workspaceId && subscriptionId) {
    const row = await db
      .prepare(
        `
          SELECT workspace_id AS workspaceId
          FROM workspace_billing_subscriptions
          WHERE stripe_subscription_id = ?
          LIMIT 1
        `,
      )
      .bind(subscriptionId)
      .first<{ workspaceId: string | null }>()
    workspaceId = row?.workspaceId ?? null
  }

  if (!workspaceId) return
  if (await hasProcessedInvoicePaidEvent(db, eventId, invoiceId)) return

  const lines = object.lines && typeof object.lines === 'object' ? (object.lines as { data?: Array<Record<string, unknown>> }).data ?? [] : []
  const price = lines[0]?.price && typeof lines[0].price === 'object' ? (lines[0].price as Record<string, unknown>) : {}
  const planId = planFromStripePriceId(stringValue(price.id) ?? metadataValue(object, 'price_id'), env)
  await grantMonthlyCredits(db, workspaceId, null, planId, {
    stripe_event: 'invoice.paid',
    stripe_event_id: eventId,
    invoice_id: invoiceId,
    subscription_id: subscriptionId,
  })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text()
  const stripeEventHeader = request.headers.get('stripe-signature')
  if (!(await verifyStripeSignature(request, rawBody))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const db = await getD1Binding().catch(() => null)
  if (!db) return NextResponse.json({ error: 'D1 database is required' }, { status: 503 })

  const event = JSON.parse(rawBody) as StripeEvent
  const cloudflareEnv = await getCloudflareEnv()
  const env = {
    READO_STRIPE_PRICE_TEST: cloudflareEnv?.READO_STRIPE_PRICE_TEST ?? process.env.READO_STRIPE_PRICE_TEST,
    READO_STRIPE_PRICE_PRO: cloudflareEnv?.READO_STRIPE_PRICE_PRO ?? process.env.READO_STRIPE_PRICE_PRO,
    READO_STRIPE_PRICE_POWER: cloudflareEnv?.READO_STRIPE_PRICE_POWER ?? process.env.READO_STRIPE_PRICE_POWER,
    READO_STRIPE_PRICE_TEAM: cloudflareEnv?.READO_STRIPE_PRICE_TEAM ?? process.env.READO_STRIPE_PRICE_TEAM,
    STRIPE_PRICE_TEST: cloudflareEnv?.STRIPE_PRICE_TEST ?? process.env.STRIPE_PRICE_TEST,
    STRIPE_PRICE_PRO: cloudflareEnv?.STRIPE_PRICE_PRO ?? process.env.STRIPE_PRICE_PRO,
    STRIPE_PRICE_POWER: cloudflareEnv?.STRIPE_PRICE_POWER ?? process.env.STRIPE_PRICE_POWER,
    STRIPE_PRICE_TEAM: cloudflareEnv?.STRIPE_PRICE_TEAM ?? process.env.STRIPE_PRICE_TEAM,
  }

  const object = event.data.object
  const traceId = metadataValue(object, 'trace_id') ?? subscriptionIdFromInvoice(object) ?? event.id

  await recordBillingEvent(db, {
    traceId,
    stage: `webhook.${event.type}`,
    status: 'started',
    workspaceId: metadataValue(object, 'workspace_id'),
    planId: planFromStripePriceId(
      stringValue(
        object.price && typeof object.price === 'object'
          ? (object.price as Record<string, unknown>).id
          : null,
      ),
      env,
    ),
    stripeCustomerId: stringValue(object.customer),
    stripeSubscriptionId: stringValue(object.id)?.startsWith('sub_') ? stringValue(object.id) : subscriptionIdFromInvoice(object),
    stripeCheckoutSessionId: stringValue(object.id)?.startsWith('cs_') ? stringValue(object.id) : null,
    stripeInvoiceId: stringValue(object.id)?.startsWith('in_') ? stringValue(object.id) : null,
    stripeEventId: event.id,
    amount: amountValue(object.amount_paid) ?? amountValue(object.amount_due) ?? amountValue(object.amount_total),
    currency: stringValue(object.currency),
    metadata: { signaturePresent: Boolean(stripeEventHeader) },
  }).catch(() => null)

  try {
    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      await handleSubscriptionEvent(db, object, env)
    } else if (event.type === 'invoice.paid') {
      await handleInvoicePaid(db, object, env, event.id)
    } else {
      await recordBillingEvent(db, {
        traceId,
        stage: `webhook.${event.type}`,
        status: 'ignored',
        workspaceId: metadataValue(object, 'workspace_id'),
        stripeEventId: event.id,
        message: 'Stripe event type is not handled by reado',
      }).catch(() => null)
      return NextResponse.json({ received: true, ignored: true })
    }
  } catch (error) {
    console.error('Stripe webhook processing failed', error)
    await recordBillingEvent(db, {
      traceId,
      stage: `webhook.${event.type}`,
      status: 'failed',
      workspaceId: metadataValue(object, 'workspace_id'),
      stripeEventId: event.id,
      stripeSubscriptionId: subscriptionIdFromInvoice(object),
      stripeInvoiceId: stringValue(object.id)?.startsWith('in_') ? stringValue(object.id) : null,
      message: error instanceof Error ? error.message : 'Unknown webhook error',
    }).catch(() => null)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }

  await recordBillingEvent(db, {
    traceId,
    stage: `webhook.${event.type}`,
    status: 'succeeded',
    workspaceId: metadataValue(object, 'workspace_id'),
    stripeEventId: event.id,
    stripeSubscriptionId: subscriptionIdFromInvoice(object),
    stripeInvoiceId: stringValue(object.id)?.startsWith('in_') ? stringValue(object.id) : null,
    message: 'Stripe webhook processed',
  }).catch(() => null)

  return NextResponse.json({ received: true })
}
