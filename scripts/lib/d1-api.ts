import type { SiteItem } from '../../packages/shared/src/index.ts'
import type { CollectedData } from './utils.js'
import { rawItemToSiteItem } from './d1-sql.js'

type ApiKind = 'ingest' | 'digest' | 'ops-state'

export interface D1ApiResult {
  status: 'posted' | 'skipped'
  url?: string
  reason?: string
}

function env(name: string): string | undefined {
  return process.env[name]
}

function endpointFor(kind: ApiKind): string | null {
  const direct: Record<ApiKind, string | undefined> = {
    ingest: env('READO_D1_INGEST_URL'),
    digest: env('READO_D1_DIGEST_URL'),
    'ops-state': env('READO_D1_OPS_STATE_URL'),
  }

  if (direct[kind]) return direct[kind] ?? null

  const baseUrl = env('READO_D1_API_BASE_URL') ?? env('READO_D1_API_URL')
  if (!baseUrl) return null

  return new URL(`/api/${kind}`, baseUrl).toString()
}

function apiSecret(): string | null {
  return env('READO_D1_API_SECRET') ?? env('READO_API_SECRET') ?? null
}

export function isD1ApiWriteRequired(): boolean {
  return env('READO_D1_WRITE_REQUIRED') === 'true'
}

async function sendJson(kind: ApiKind, payload: unknown, method = 'POST'): Promise<D1ApiResult> {
  const url = endpointFor(kind)
  if (!url) return { status: 'skipped', reason: `READO_D1_${kind.toUpperCase().replace('-', '_')}_URL or READO_D1_API_BASE_URL is not configured` }

  const secret = apiSecret()
  if (!secret) return { status: 'skipped', reason: 'READO_D1_API_SECRET or READO_API_SECRET is not configured' }

  const response = await fetch(url, {
    method,
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`D1 API ${kind} write failed: ${response.status} ${text.slice(0, 500)}`)
  }

  return { status: 'posted', url }
}

async function postJson(kind: ApiKind, payload: unknown): Promise<D1ApiResult> {
  return sendJson(kind, payload)
}

export async function postCollectionToD1Api(data: CollectedData, options: {
  date: string
  batch: string
  mode: string
}): Promise<D1ApiResult> {
  const items: SiteItem[] = data.items
    .filter((item) => item.url)
    .map((item, index) => rawItemToSiteItem(item, options.date, options.batch, index))

  return postJson('ingest', {
    date: options.date,
    batch: options.batch,
    mode: options.mode,
    fetchedAt: data.fetchedAt,
    stats: data.stats,
    items,
  })
}

export async function postDigestToD1Api(options: {
  date: string
  batch: string
  markdown: string
  headline?: string
}): Promise<D1ApiResult> {
  return postJson('digest', {
    date: options.date,
    batch: options.batch,
    headline: options.headline,
    markdown: options.markdown,
  })
}

export async function putOpsStateToD1Api(state: Record<string, unknown>): Promise<D1ApiResult> {
  return sendJson('ops-state', { state }, 'PUT')
}
