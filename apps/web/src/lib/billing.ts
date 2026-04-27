import 'server-only'

import { getCloudflareEnv } from '@/lib/cloudflare'
import { PLAN_LIMITS, normalizePlanId, type PlanId } from '@/lib/plans'
import type { Workspace } from '@/lib/workspaces'

export interface BillingOverview {
  planId: PlanId
  subscriptionStatus: string
  creditsBalance: number
  sourceCount: number
}

export interface BillingEventInput {
  traceId: string
  stage: string
  status: 'started' | 'succeeded' | 'failed' | 'ignored'
  workspaceId?: string | null
  userId?: string | null
  planId?: PlanId | null
  stripeCustomerId?: string | null
  stripeSubscriptionId?: string | null
  stripeCheckoutSessionId?: string | null
  stripeInvoiceId?: string | null
  stripeEventId?: string | null
  amount?: number | null
  currency?: string | null
  message?: string | null
  metadata?: unknown
}

export interface CreatedCheckoutSession {
  url: string
  sessionId: string
  customerId: string
}

export interface CreatedPortalSession {
  url: string
  customerId: string
}

function readProcessEnv(name: string): string | undefined {
  return process.env[name]
}

export async function getStripeSecretKey(): Promise<string | null> {
  const env = await getCloudflareEnv()
  return env?.READO_STRIPE_SECRET_KEY ?? env?.STRIPE_SECRET_KEY ?? readProcessEnv('READO_STRIPE_SECRET_KEY') ?? readProcessEnv('STRIPE_SECRET_KEY') ?? null
}

export async function getStripeWebhookSecret(): Promise<string | null> {
  const env = await getCloudflareEnv()
  return env?.READO_STRIPE_WEBHOOK_SECRET ?? env?.STRIPE_WEBHOOK_SECRET ?? readProcessEnv('READO_STRIPE_WEBHOOK_SECRET') ?? readProcessEnv('STRIPE_WEBHOOK_SECRET') ?? null
}

export async function getStripePriceId(planId: PlanId): Promise<string | null> {
  const envName = PLAN_LIMITS[planId].stripePriceEnv
  if (!envName) return null
  const env = await getCloudflareEnv()
  const legacyEnvName = envName.replace(/^READO_/, '')
  const envMap = env as unknown as Record<string, string | undefined> | null
  return envMap?.[envName] ?? envMap?.[legacyEnvName] ?? readProcessEnv(envName) ?? readProcessEnv(legacyEnvName) ?? null
}

async function stripeRequest<T>(path: string, init: RequestInit & { secretKey: string }): Promise<T> {
  const { secretKey, ...requestInit } = init
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    ...requestInit,
    headers: {
      authorization: `Bearer ${secretKey}`,
      'content-type': 'application/x-www-form-urlencoded',
      ...(requestInit.headers ?? {}),
    },
  })
  const payload = (await response.json().catch(() => ({}))) as T & { error?: { message?: string } }
  if (!response.ok) throw new Error(payload.error?.message ?? `Stripe request failed with ${response.status}`)
  return payload
}

export async function recordBillingEvent(db: D1Database, input: BillingEventInput): Promise<void> {
  await db
    .prepare(
      `
        INSERT INTO billing_event_logs (
          id, trace_id, stage, status, workspace_id, user_id, plan_id,
          stripe_customer_id, stripe_subscription_id, stripe_checkout_session_id,
          stripe_invoice_id, stripe_event_id, amount, currency, message,
          metadata_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .bind(
      crypto.randomUUID(),
      input.traceId,
      input.stage,
      input.status,
      input.workspaceId ?? null,
      input.userId ?? null,
      input.planId ?? null,
      input.stripeCustomerId ?? null,
      input.stripeSubscriptionId ?? null,
      input.stripeCheckoutSessionId ?? null,
      input.stripeInvoiceId ?? null,
      input.stripeEventId ?? null,
      input.amount ?? null,
      input.currency ?? null,
      input.message ?? null,
      JSON.stringify(input.metadata ?? {}),
      new Date().toISOString(),
    )
    .run()
}

export async function ensureStripeCustomer(db: D1Database, workspace: Workspace, userId: string, email?: string | null): Promise<string> {
  const existing = await db
    .prepare('SELECT stripe_customer_id AS stripeCustomerId FROM stripe_customers WHERE workspace_id = ? LIMIT 1')
    .bind(workspace.id)
    .first<{ stripeCustomerId: string }>()
  if (existing?.stripeCustomerId) return existing.stripeCustomerId

  const secretKey = await getStripeSecretKey()
  if (!secretKey) throw new Error('READO_STRIPE_SECRET_KEY is not configured')

  const body = new URLSearchParams({
    name: workspace.name,
    'metadata[workspace_id]': workspace.id,
    'metadata[user_id]': userId,
  })
  if (email) body.set('email', email)

  const customer = await stripeRequest<{ id: string }>('/customers', {
    method: 'POST',
    body,
    secretKey,
  })

  const now = new Date().toISOString()
  await db
    .prepare(
      `
        INSERT INTO stripe_customers (workspace_id, user_id, stripe_customer_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(workspace_id) DO UPDATE SET
          stripe_customer_id = excluded.stripe_customer_id,
          updated_at = excluded.updated_at
      `,
    )
    .bind(workspace.id, userId, customer.id, now, now)
    .run()

  return customer.id
}

export async function createCheckoutSession(input: {
  db: D1Database
  workspace: Workspace
  userId: string
  email?: string | null
  planId: PlanId
  origin: string
  traceId: string
}): Promise<CreatedCheckoutSession> {
  const secretKey = await getStripeSecretKey()
  const priceId = await getStripePriceId(input.planId)
  if (!secretKey || !priceId) throw new Error('Stripe checkout is not configured')

  const customerId = await ensureStripeCustomer(input.db, input.workspace, input.userId, input.email)
  const body = new URLSearchParams({
    mode: 'subscription',
    customer: customerId,
    success_url: `${input.origin}/subscription?checkout=success&trace=${encodeURIComponent(input.traceId)}`,
    cancel_url: `${input.origin}/subscription?checkout=cancelled&trace=${encodeURIComponent(input.traceId)}`,
    client_reference_id: input.traceId,
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    'metadata[workspace_id]': input.workspace.id,
    'metadata[plan_id]': input.planId,
    'metadata[trace_id]': input.traceId,
    'subscription_data[metadata][workspace_id]': input.workspace.id,
    'subscription_data[metadata][plan_id]': input.planId,
    'subscription_data[metadata][trace_id]': input.traceId,
  })

  const session = await stripeRequest<{ id?: string; url?: string }>('/checkout/sessions', { method: 'POST', body, secretKey })
  if (!session.url || !session.id) throw new Error('Stripe did not return a checkout URL')
  return { url: session.url, sessionId: session.id, customerId }
}

export async function createPortalSession(input: { db: D1Database; workspace: Workspace; userId: string; origin: string; traceId: string }): Promise<CreatedPortalSession> {
  const secretKey = await getStripeSecretKey()
  if (!secretKey) throw new Error('Stripe portal is not configured')
  const customerId = await ensureStripeCustomer(input.db, input.workspace, input.userId)
  const body = new URLSearchParams({
    customer: customerId,
    return_url: `${input.origin}/subscription?portal=return&trace=${encodeURIComponent(input.traceId)}`,
  })
  const session = await stripeRequest<{ url?: string }>('/billing_portal/sessions', { method: 'POST', body, secretKey })
  if (!session.url) throw new Error('Stripe did not return a portal URL')
  return { url: session.url, customerId }
}

export function planFromStripePriceId(priceId: string | null | undefined, env: Record<string, string | undefined>): PlanId {
  if (priceId && priceId === (env.READO_STRIPE_PRICE_TEST ?? env.STRIPE_PRICE_TEST)) return 'test'
  if (priceId && priceId === (env.READO_STRIPE_PRICE_TEAM ?? env.STRIPE_PRICE_TEAM)) return 'team'
  if (priceId && priceId === (env.READO_STRIPE_PRICE_POWER ?? env.STRIPE_PRICE_POWER)) return 'power'
  if (priceId && priceId === (env.READO_STRIPE_PRICE_PRO ?? env.STRIPE_PRICE_PRO)) return 'pro'
  return 'free'
}

export async function grantMonthlyCredits(db: D1Database, workspaceId: string, userId: string | null, planId: PlanId, metadata: unknown): Promise<void> {
  const now = new Date().toISOString()
  await db
    .prepare(
      `
        INSERT INTO credit_ledger (id, workspace_id, user_id, action, credits_delta, metadata_json, created_at)
        VALUES (?, ?, ?, 'monthly_grant', ?, ?, ?)
      `,
    )
    .bind(crypto.randomUUID(), workspaceId, userId, PLAN_LIMITS[planId].monthlyCredits, JSON.stringify(metadata), now)
    .run()
}

export async function upsertBillingSubscription(
  db: D1Database,
  input: {
    workspaceId: string
    customerId: string | null
    subscriptionId: string | null
    planId: PlanId
    status: string
    currentPeriodStart?: number | null
    currentPeriodEnd?: number | null
    cancelAtPeriodEnd?: boolean
  },
): Promise<void> {
  const now = new Date().toISOString()
  const periodStart = input.currentPeriodStart ? new Date(input.currentPeriodStart * 1000).toISOString() : null
  const periodEnd = input.currentPeriodEnd ? new Date(input.currentPeriodEnd * 1000).toISOString() : null
  await db.batch([
    db
      .prepare(
        `
          INSERT INTO workspace_billing_subscriptions (
            workspace_id, stripe_subscription_id, stripe_customer_id, plan_id, status,
            current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(workspace_id) DO UPDATE SET
            stripe_subscription_id = excluded.stripe_subscription_id,
            stripe_customer_id = excluded.stripe_customer_id,
            plan_id = excluded.plan_id,
            status = excluded.status,
            current_period_start = excluded.current_period_start,
            current_period_end = excluded.current_period_end,
            cancel_at_period_end = excluded.cancel_at_period_end,
            updated_at = excluded.updated_at
        `,
      )
      .bind(
        input.workspaceId,
        input.subscriptionId,
        input.customerId,
        input.planId,
        input.status,
        periodStart,
        periodEnd,
        input.cancelAtPeriodEnd ? 1 : 0,
        now,
        now,
      ),
    db.prepare('UPDATE workspaces SET plan_id = ?, updated_at = ? WHERE id = ?').bind(input.planId, now, input.workspaceId),
  ])
}
