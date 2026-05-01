import { getCloudflareContext } from '@opennextjs/cloudflare'

export interface ReadoCloudflareEnv extends CloudflareEnv {
  DB?: D1Database
  WORKER_SELF_REFERENCE?: Fetcher
  READO_API_SECRET?: string
  READO_AUTH_SECRET?: string
  READO_ADMIN_USERNAME?: string
  READO_ADMIN_PASSWORD?: string
  READO_CONTENT_SOURCE?: 'd1' | 'json'
  READO_REQUIRE_D1?: string
  READO_X_API_BASE_URL?: string
  READO_X_BEARER_TOKEN?: string
  X_READO_BEAR_TOKEN?: string
  READO_INTERNAL_API_BASE_URL?: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  GITHUB_CLIENT_ID?: string
  GITHUB_CLIENT_SECRET?: string
  READO_STRIPE_SECRET_KEY?: string
  READO_STRIPE_WEBHOOK_SECRET?: string
  READO_STRIPE_PRICE_TEST?: string
  READO_STRIPE_PRICE_PRO?: string
  READO_STRIPE_PRICE_POWER?: string
  READO_STRIPE_PRICE_TEAM?: string
  STRIPE_PRICE_TEST?: string
  STRIPE_SECRET_KEY?: string
  STRIPE_WEBHOOK_SECRET?: string
  STRIPE_PRICE_PRO?: string
  STRIPE_PRICE_POWER?: string
  STRIPE_PRICE_TEAM?: string
  X_BEARER_TOKEN?: string
  MINIMAX_READO_KEY?: string
  MINIMAX_API_KEY?: string
  ANTHROPIC_API_KEY?: string
  SILICONFLOW_API_KEY?: string
  SILICONFLOW_API_BASE_URL?: string
  LLM_PROVIDER?: string
  LLM_MODEL?: string
  READO_COLLECT_MAX_SOURCES?: string
  READO_COLLECT_CONCURRENCY?: string
}

export class D1UnavailableError extends Error {
  constructor(message = 'Cloudflare D1 binding DB is unavailable') {
    super(message)
    this.name = 'D1UnavailableError'
  }
}

function readProcessEnv(name: string): string | undefined {
  return process.env[name]
}

export function shouldUseJsonContent(env?: ReadoCloudflareEnv | null): boolean {
  return (readProcessEnv('READO_CONTENT_SOURCE') ?? env?.READO_CONTENT_SOURCE) === 'json'
}

export function shouldRequireD1(env?: ReadoCloudflareEnv | null): boolean {
  const source = readProcessEnv('READO_CONTENT_SOURCE') ?? env?.READO_CONTENT_SOURCE
  const required = readProcessEnv('READO_REQUIRE_D1') ?? env?.READO_REQUIRE_D1
  return source === 'd1' || required === 'true'
}

export async function getCloudflareEnv(): Promise<ReadoCloudflareEnv | null> {
  try {
    const context = await getCloudflareContext({ async: true })
    return context.env as ReadoCloudflareEnv
  } catch {
    return null
  }
}

export async function getD1Database(): Promise<D1Database | null> {
  const env = await getCloudflareEnv()

  if (shouldUseJsonContent(env)) return null
  if (env?.DB) return env.DB
  if (shouldRequireD1(env)) throw new D1UnavailableError()

  return null
}

export async function getD1Binding(): Promise<D1Database | null> {
  const env = await getCloudflareEnv()

  if (env?.DB) return env.DB
  if (shouldRequireD1(env)) throw new D1UnavailableError()

  return null
}

export async function getApiSecret(): Promise<string | null> {
  const env = await getCloudflareEnv()
  return env?.READO_API_SECRET ?? readProcessEnv('READO_API_SECRET') ?? null
}
