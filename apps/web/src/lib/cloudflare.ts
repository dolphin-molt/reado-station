import { getCloudflareContext } from '@opennextjs/cloudflare'

export interface ReadoCloudflareEnv extends CloudflareEnv {
  DB?: D1Database
  READO_API_SECRET?: string
  READO_AUTH_SECRET?: string
  READO_ADMIN_USERNAME?: string
  READO_ADMIN_PASSWORD?: string
  READO_CONTENT_SOURCE?: 'd1' | 'json'
  READO_REQUIRE_D1?: string
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
  return (env?.READO_CONTENT_SOURCE ?? readProcessEnv('READO_CONTENT_SOURCE')) === 'json'
}

export function shouldRequireD1(env?: ReadoCloudflareEnv | null): boolean {
  const source = env?.READO_CONTENT_SOURCE ?? readProcessEnv('READO_CONTENT_SOURCE')
  const required = env?.READO_REQUIRE_D1 ?? readProcessEnv('READO_REQUIRE_D1')
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

export async function getApiSecret(): Promise<string | null> {
  const env = await getCloudflareEnv()
  return env?.READO_API_SECRET ?? readProcessEnv('READO_API_SECRET') ?? null
}
