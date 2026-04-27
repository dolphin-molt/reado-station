export type PlanId = 'free' | 'test' | 'pro' | 'power' | 'team'
export type SourceType = 'x' | 'rss'
export type SourceVisibility = 'private' | 'public'

export interface PlanLimits {
  id: PlanId
  name: string
  monthlyCredits: number
  sourceLimit: number
  maxBackfillHours: number
  stripePriceEnv?: string
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    id: 'free',
    name: 'Free',
    monthlyCredits: 50,
    sourceLimit: 3,
    maxBackfillHours: 24,
  },
  test: {
    id: 'test',
    name: 'Test',
    monthlyCredits: 50,
    sourceLimit: 3,
    maxBackfillHours: 24,
    stripePriceEnv: 'READO_STRIPE_PRICE_TEST',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    monthlyCredits: 500,
    sourceLimit: 20,
    maxBackfillHours: 24 * 7,
    stripePriceEnv: 'READO_STRIPE_PRICE_PRO',
  },
  power: {
    id: 'power',
    name: 'Power',
    monthlyCredits: 2000,
    sourceLimit: 100,
    maxBackfillHours: 24 * 30,
    stripePriceEnv: 'READO_STRIPE_PRICE_POWER',
  },
  team: {
    id: 'team',
    name: 'Team',
    monthlyCredits: 8000,
    sourceLimit: 100,
    maxBackfillHours: 24 * 30,
    stripePriceEnv: 'READO_STRIPE_PRICE_TEAM',
  },
}

export const BACKFILL_WINDOWS = [24, 24 * 7, 24 * 30] as const

export function normalizePlanId(value: string | null | undefined): PlanId {
  return value === 'test' || value === 'pro' || value === 'power' || value === 'team' ? value : 'free'
}

export function normalizeBackfillHours(value: string | number | null | undefined): number {
  const numeric = typeof value === 'number' ? value : Number(value)
  return BACKFILL_WINDOWS.includes(numeric as (typeof BACKFILL_WINDOWS)[number]) ? numeric : 24
}

export function normalizeSourceType(value: string | null | undefined): SourceType {
  return value === 'rss' ? 'rss' : 'x'
}

export function normalizeVisibility(value: string | null | undefined): SourceVisibility {
  return value === 'public' ? 'public' : 'private'
}
