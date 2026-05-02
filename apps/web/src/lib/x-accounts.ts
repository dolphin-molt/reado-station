import 'server-only'

import type { SiteItem } from '../../../../packages/shared/src'

import { getCloudflareEnv } from '@/lib/cloudflare'
import { resolveXBearerToken } from '@/lib/provider-env'

export interface XAccount {
  id: string
  username: string
  name: string
  description: string
  profileImageUrl: string
  verified: boolean
  followersCount: number | null
  followingCount: number | null
  tweetCount: number | null
  listedCount: number | null
  fetchedAt: string
}

export interface XAccountSubscription {
  account: XAccount
  subscribedAt: string
  itemCount: number
  latestPublishedAt: string | null
}

export interface XReaderData {
  subscriptions: XAccountSubscription[]
  activeAccount: XAccountSubscription | null
  items: SiteItem[]
}

interface XAccountRow {
  id: string
  username: string
  name: string
  description: string | null
  profileImageUrl: string | null
  verified: number | null
  followersCount: number | null
  followingCount: number | null
  tweetCount: number | null
  listedCount: number | null
  fetchedAt: string
}

interface XSubscriptionRow extends XAccountRow {
  subscribedAt: string
  itemCount: number | null
  latestPublishedAt: string | null
}

interface XApiUser {
  id: string
  username: string
  name: string
  description?: string
  profile_image_url?: string
  verified?: boolean
  public_metrics?: {
    followers_count?: number
    following_count?: number
    tweet_count?: number
    listed_count?: number
  }
}

interface XApiUserResponse {
  data?: XApiUser
  errors?: Array<{ detail?: string; title?: string }>
}

interface D1ItemRow {
  id: string
  title: string
  titleZh: string | null
  url: string
  summary: string | null
  summaryZh: string | null
  publishedAt: string | null
  source: string
  sourceName: string
  category: string
  imageUrl: string | null
  date: string
  batch: string
}

export type XAccountErrorCode = 'invalid-handle' | 'missing-token' | 'not-found' | 'unauthorized' | 'api-error'

export class XAccountError extends Error {
  constructor(
    public code: XAccountErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'XAccountError'
  }
}

const X_ACCOUNT_PROFILE_TTL_MS = 7 * 24 * 60 * 60 * 1000

function readProcessEnv(name: string): string | undefined {
  return process.env[name]
}

function rowToXAccount(row: XAccountRow): XAccount {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    description: row.description ?? '',
    profileImageUrl: row.profileImageUrl ?? '',
    verified: Number(row.verified ?? 0) === 1,
    followersCount: row.followersCount == null ? null : Number(row.followersCount),
    followingCount: row.followingCount == null ? null : Number(row.followingCount),
    tweetCount: row.tweetCount == null ? null : Number(row.tweetCount),
    listedCount: row.listedCount == null ? null : Number(row.listedCount),
    fetchedAt: row.fetchedAt,
  }
}

function rowToSubscription(row: XSubscriptionRow): XAccountSubscription {
  return {
    account: rowToXAccount(row),
    subscribedAt: row.subscribedAt,
    itemCount: Number(row.itemCount ?? 0),
    latestPublishedAt: row.latestPublishedAt,
  }
}

function rowToSiteItem(row: D1ItemRow): SiteItem {
  const item: SiteItem = {
    id: row.id,
    title: row.title,
    url: row.url,
    summary: row.summary ?? '',
    publishedAt: row.publishedAt ?? '',
    source: row.source,
    sourceName: row.sourceName,
    date: row.date,
    batch: row.batch,
    category: row.category,
    imageUrl: row.imageUrl ?? `/placeholders/${row.category}.svg`,
  }

  if (row.titleZh) item.titleZh = row.titleZh
  if (row.summaryZh) item.summaryZh = row.summaryZh

  return item
}

function xSourceId(username: string): string {
  return `tw-${username.toLowerCase()}`
}

export function normalizeXUsername(input: string): string {
  let value = input.trim()
  if (!value) {
    throw new XAccountError('invalid-handle', 'X username is required')
  }

  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value)
      value = url.pathname.split('/').filter(Boolean)[0] ?? ''
    } catch {
      throw new XAccountError('invalid-handle', 'Invalid X URL')
    }
  }

  value = value.replace(/^@+/, '').trim()
  if (!/^[A-Za-z0-9_]{1,15}$/.test(value)) {
    throw new XAccountError('invalid-handle', 'Invalid X username')
  }

  return value
}

export function parseXAccountParam(value: string | string[] | undefined, fallbackValue?: string | string[] | undefined): string | null {
  const rawValue = Array.isArray(value) ? value[0] : value
  const rawFallback = Array.isArray(fallbackValue) ? fallbackValue[0] : fallbackValue
  const raw = rawValue || rawFallback
  if (!raw) return null

  const sourceMatch = raw.match(/^tw-([A-Za-z0-9_]{1,15})$/i)
  if (sourceMatch) return sourceMatch[1]

  try {
    return normalizeXUsername(raw)
  } catch {
    return null
  }
}

export function isXAccountProfileFresh(fetchedAt: string | null | undefined, now = new Date()): boolean {
  if (!fetchedAt) return false
  const fetchedTime = new Date(fetchedAt).getTime()
  if (Number.isNaN(fetchedTime)) return false
  return now.getTime() - fetchedTime <= X_ACCOUNT_PROFILE_TTL_MS
}

async function getXApiConfig(): Promise<{ baseUrl: string; bearerToken: string | null }> {
  const env = await getCloudflareEnv()

  return {
    baseUrl: env?.READO_X_API_BASE_URL ?? readProcessEnv('READO_X_API_BASE_URL') ?? 'https://api.x.com',
    bearerToken: resolveXBearerToken(env),
  }
}

async function findXAccountByUsername(db: D1Database, username: string): Promise<XAccount | null> {
  const row = await db
    .prepare(
      `
        SELECT
          id,
          username,
          name,
          description,
          profile_image_url AS profileImageUrl,
          verified,
          followers_count AS followersCount,
          following_count AS followingCount,
          tweet_count AS tweetCount,
          listed_count AS listedCount,
          fetched_at AS fetchedAt
        FROM x_accounts
        WHERE lower(username) = lower(?)
        LIMIT 1
      `,
    )
    .bind(username)
    .first<XAccountRow>()

  return row ? rowToXAccount(row) : null
}

async function fetchXAccount(username: string): Promise<{ account: XAccount; raw: unknown }> {
  const config = await getXApiConfig()
  if (!config.bearerToken) {
    throw new XAccountError('missing-token', 'READO_X_BEARER_TOKEN is not configured')
  }

  const url = new URL(`/2/users/by/username/${encodeURIComponent(username)}`, config.baseUrl)
  url.searchParams.set('user.fields', 'description,profile_image_url,public_metrics,verified')

  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${config.bearerToken}`,
    },
  })

  const payload = (await response.json().catch(() => ({}))) as XApiUserResponse

  if (response.status === 401) {
    throw new XAccountError('unauthorized', payload.errors?.[0]?.detail ?? 'X API token is invalid or unauthorized')
  }

  if (response.status === 404) {
    throw new XAccountError('not-found', payload.errors?.[0]?.detail ?? 'X account not found')
  }

  if (!response.ok) {
    throw new XAccountError('api-error', payload.errors?.[0]?.detail ?? `X API request failed with ${response.status}`)
  }

  if (!payload.data) {
    throw new XAccountError('not-found', payload.errors?.[0]?.detail ?? 'X account not found')
  }

  const user = payload.data
  const now = new Date().toISOString()

  return {
    account: {
      id: user.id,
      username: user.username,
      name: user.name,
      description: user.description ?? '',
      profileImageUrl: user.profile_image_url ?? '',
      verified: Boolean(user.verified),
      followersCount: user.public_metrics?.followers_count ?? null,
      followingCount: user.public_metrics?.following_count ?? null,
      tweetCount: user.public_metrics?.tweet_count ?? null,
      listedCount: user.public_metrics?.listed_count ?? null,
      fetchedAt: now,
    },
    raw: payload,
  }
}

async function saveXAccount(db: D1Database, account: XAccount, raw: unknown): Promise<void> {
  await db
    .prepare(
      `
        INSERT INTO x_accounts (
          id, username, name, description, profile_image_url, verified,
          followers_count, following_count, tweet_count, listed_count,
          raw_json, fetched_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          username = excluded.username,
          name = excluded.name,
          description = excluded.description,
          profile_image_url = excluded.profile_image_url,
          verified = excluded.verified,
          followers_count = excluded.followers_count,
          following_count = excluded.following_count,
          tweet_count = excluded.tweet_count,
          listed_count = excluded.listed_count,
          raw_json = excluded.raw_json,
          fetched_at = excluded.fetched_at,
          updated_at = excluded.updated_at
      `,
    )
    .bind(
      account.id,
      account.username,
      account.name,
      account.description || null,
      account.profileImageUrl || null,
      account.verified ? 1 : 0,
      account.followersCount,
      account.followingCount,
      account.tweetCount,
      account.listedCount,
      JSON.stringify(raw),
      account.fetchedAt,
      new Date().toISOString(),
    )
    .run()
}

async function ensureXSource(db: D1Database, account: XAccount): Promise<void> {
  const now = new Date().toISOString()
  await db
    .prepare(
      `
        INSERT INTO sources (
          id, name, adapter, url, hours, enabled, category, topics, searchable, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          adapter = excluded.adapter,
          url = excluded.url,
          hours = excluded.hours,
          enabled = excluded.enabled,
          category = excluded.category,
          topics = excluded.topics,
          searchable = excluded.searchable,
          updated_at = excluded.updated_at
      `,
    )
    .bind(
      xSourceId(account.username),
      `@${account.username} (X)`,
      'twitter',
      `https://x.com/${account.username}`,
      24,
      1,
      'twitter',
      '[]',
      0,
      now,
    )
    .run()
}

export async function resolveXAccount(db: D1Database, input: string): Promise<XAccount> {
  const username = normalizeXUsername(input)
  const existing = await findXAccountByUsername(db, username)
  if (existing && isXAccountProfileFresh(existing.fetchedAt)) return existing

  const { account, raw } = await fetchXAccount(username)
  await saveXAccount(db, account, raw)
  return account
}

export async function subscribeUserToXAccount(db: D1Database, userId: string, input: string): Promise<XAccount> {
  const account = await resolveXAccount(db, input)
  const now = new Date().toISOString()

  await db
    .prepare(
      `
        INSERT INTO user_x_account_subscriptions (user_id, x_account_id, subscribed_at)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, x_account_id) DO NOTHING
      `,
    )
    .bind(userId, account.id, now)
    .run()

  await ensureXSource(db, account)
  return account
}

export async function loadWorkspaceXReaderData(db: D1Database, workspaceId: string, selectedUsername?: string | null): Promise<XReaderData> {
  const { results = [] } = await db
    .prepare(
      `
        SELECT
          a.id,
          a.username,
          a.name,
          a.description,
          a.profile_image_url AS profileImageUrl,
          a.verified,
          a.followers_count AS followersCount,
          a.following_count AS followingCount,
          a.tweet_count AS tweetCount,
          a.listed_count AS listedCount,
          a.fetched_at AS fetchedAt,
          s.created_at AS subscribedAt,
          (
            SELECT COUNT(1)
            FROM items i
            WHERE i.hidden_at IS NULL AND lower(i.source) = lower('tw-' || a.username)
          ) AS itemCount,
          (
            SELECT MAX(i.published_at)
            FROM items i
            WHERE i.hidden_at IS NULL AND lower(i.source) = lower('tw-' || a.username)
          ) AS latestPublishedAt
        FROM workspace_source_subscriptions s
        INNER JOIN x_accounts a ON lower(s.source_id) = lower('tw-' || a.username)
        WHERE s.workspace_id = ? AND s.source_type = 'x'
        ORDER BY lower(a.username) ASC
      `,
    )
    .bind(workspaceId)
    .all<XSubscriptionRow>()

  const subscriptions = results.map(rowToSubscription)
  const activeAccount =
    (selectedUsername ? subscriptions.find((entry) => entry.account.username.toLowerCase() === selectedUsername.toLowerCase()) : null) ??
    subscriptions[0] ??
    null

  if (!activeAccount) {
    return { subscriptions, activeAccount: null, items: [] }
  }

  const { results: itemRows = [] } = await db
    .prepare(
      `
        SELECT
          id,
          title,
          title_zh AS titleZh,
          url,
          summary,
          summary_zh AS summaryZh,
          published_at AS publishedAt,
          source,
          source_name AS sourceName,
          category,
          image_url AS imageUrl,
          date,
          batch
        FROM items
        WHERE hidden_at IS NULL AND lower(source) = lower(?)
        ORDER BY published_at DESC, id ASC
        LIMIT 60
      `,
    )
    .bind(xSourceId(activeAccount.account.username))
    .all<D1ItemRow>()

  return {
    subscriptions,
    activeAccount,
    items: itemRows.map(rowToSiteItem),
  }
}

export async function loadUserXReaderData(db: D1Database, userId: string, selectedUsername?: string | null): Promise<XReaderData> {
  const { results = [] } = await db
    .prepare(
      `
        SELECT
          a.id,
          a.username,
          a.name,
          a.description,
          a.profile_image_url AS profileImageUrl,
          a.verified,
          a.followers_count AS followersCount,
          a.following_count AS followingCount,
          a.tweet_count AS tweetCount,
          a.listed_count AS listedCount,
          a.fetched_at AS fetchedAt,
          s.subscribed_at AS subscribedAt,
          (
            SELECT COUNT(1)
            FROM items i
            WHERE i.hidden_at IS NULL AND lower(i.source) = lower('tw-' || a.username)
          ) AS itemCount,
          (
            SELECT MAX(i.published_at)
            FROM items i
            WHERE i.hidden_at IS NULL AND lower(i.source) = lower('tw-' || a.username)
          ) AS latestPublishedAt
        FROM user_x_account_subscriptions s
        INNER JOIN x_accounts a ON a.id = s.x_account_id
        WHERE s.user_id = ?
        ORDER BY lower(a.username) ASC
      `,
    )
    .bind(userId)
    .all<XSubscriptionRow>()

  const subscriptions = results.map(rowToSubscription)
  const activeAccount =
    (selectedUsername ? subscriptions.find((entry) => entry.account.username.toLowerCase() === selectedUsername.toLowerCase()) : null) ??
    subscriptions[0] ??
    null

  if (!activeAccount) {
    return { subscriptions, activeAccount: null, items: [] }
  }

  const { results: itemRows = [] } = await db
    .prepare(
      `
        SELECT
          id,
          title,
          title_zh AS titleZh,
          url,
          summary,
          summary_zh AS summaryZh,
          published_at AS publishedAt,
          source,
          source_name AS sourceName,
          category,
          image_url AS imageUrl,
          date,
          batch
        FROM items
        WHERE hidden_at IS NULL AND lower(source) = lower(?)
        ORDER BY published_at DESC, id ASC
        LIMIT 60
      `,
    )
    .bind(xSourceId(activeAccount.account.username))
    .all<D1ItemRow>()

  return {
    subscriptions,
    activeAccount,
    items: itemRows.map(rowToSiteItem),
  }
}

export async function loadUserXSubscriptionCount(db: D1Database, userId: string): Promise<number> {
  const row = await db
    .prepare(
      `
        SELECT COUNT(1) AS total
        FROM user_x_account_subscriptions
        WHERE user_id = ?
      `,
    )
    .bind(userId)
    .first<{ total: number | null }>()

  return Number(row?.total ?? 0)
}
