import 'server-only'

import { getCloudflareEnv } from '@/lib/cloudflare'
import { upsertIngestPayload } from '@/lib/d1-write'
import { resolveXBearerToken } from '@/lib/provider-env'
import { parseRssOrAtom } from '@/lib/source-collection-parser'
import { upsertSourceCollectionSnapshot } from '@/lib/source-collections'
import { estimateSourceCollectionCredits } from '@/lib/usage-metering'

interface ClaimedSourceJob {
  id: string
  sourceId: string
  sourceType: 'x' | 'rss'
  windowStart: string
  windowEnd: string
  sourceName: string
  sourceUrl: string
  adapter: string
}

interface CollectedSourceItem {
  title: string
  url: string
  summary: string
  publishedAt: string
  source: string
  sourceName: string
  category: string
}

interface XApiTweetsResponse {
  data?: Array<{
    id: string
    text?: string
    created_at?: string
    entities?: {
      urls?: Array<{ expanded_url?: string; url?: string }>
    }
  }>
  errors?: Array<{ detail?: string; title?: string }>
}

function safeDate(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toISOString()
}

function inWindow(publishedAt: string, windowStart: string, windowEnd: string): boolean {
  if (!publishedAt) return true
  const time = new Date(publishedAt).getTime()
  if (Number.isNaN(time)) return true
  return time >= new Date(windowStart).getTime() && time <= new Date(windowEnd).getTime()
}

async function collectRss(job: ClaimedSourceJob): Promise<CollectedSourceItem[]> {
  const response = await fetch(job.sourceUrl, {
    headers: {
      accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      'user-agent': 'reado-station/1.0 (+https://reado.theopcapp.com)',
    },
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`RSS fetch failed with HTTP ${response.status}`)
  return parseRssOrAtom(text, job)
}

async function collectX(db: D1Database, job: ClaimedSourceJob): Promise<CollectedSourceItem[]> {
  const env = await getCloudflareEnv()
  const bearerToken = resolveXBearerToken(env)
  if (!bearerToken) throw new Error('READO_X_BEARER_TOKEN is not configured')

  const username = job.sourceId.replace(/^tw-/i, '')
  const account = await db
    .prepare('SELECT id, username, name FROM x_accounts WHERE lower(username) = lower(?) LIMIT 1')
    .bind(username)
    .first<{ id: string; username: string; name: string }>()
  if (!account) throw new Error(`X account ${username} is not cached`)

  const baseUrl = env?.READO_X_API_BASE_URL ?? 'https://api.x.com'
  const url = new URL(`/2/users/${encodeURIComponent(account.id)}/tweets`, baseUrl)
  url.searchParams.set('max_results', '20')
  url.searchParams.set('tweet.fields', 'created_at,entities')
  url.searchParams.set('exclude', 'replies,retweets')
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${bearerToken}`,
    },
  })
  const payload = await response.json().catch(() => ({})) as XApiTweetsResponse
  if (!response.ok) throw new Error(payload.errors?.[0]?.detail ?? `X timeline fetch failed with HTTP ${response.status}`)

  return (payload.data ?? []).map((tweet) => {
    const publishedAt = safeDate(tweet.created_at ?? '')
    const expandedUrl = tweet.entities?.urls?.find((entry) => entry.expanded_url)?.expanded_url
    return {
      title: (tweet.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 220),
      url: expandedUrl ?? `https://x.com/${account.username}/status/${tweet.id}`,
      summary: tweet.text ?? '',
      publishedAt,
      source: job.sourceId,
      sourceName: `@${account.username}`,
      category: 'twitter',
    }
  }).filter((item) => item.title && item.url && inWindow(item.publishedAt, job.windowStart, job.windowEnd))
}

function currentRunTime(): { date: string; batch: 'morning' | 'evening' } {
  const now = new Date()
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Shanghai', hour: '2-digit', hour12: false }).format(now))
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  return { date, batch: hour < 14 ? 'morning' : 'evening' }
}

export async function claimSourceCollectionJob(db: D1Database): Promise<ClaimedSourceJob | null> {
  const now = new Date().toISOString()
  const job = await db
    .prepare(
      `
        SELECT
          j.id,
          j.source_id AS sourceId,
          j.source_type AS sourceType,
          j.window_start AS windowStart,
          j.window_end AS windowEnd,
          s.name AS sourceName,
          s.url AS sourceUrl,
          s.adapter
        FROM source_collection_jobs j
        INNER JOIN sources s ON s.id = j.source_id
        WHERE j.status = 'queued'
        ORDER BY j.created_at ASC
        LIMIT 1
      `,
    )
    .first<ClaimedSourceJob>()
  if (!job) return null
  await db.prepare("UPDATE source_collection_jobs SET status = 'running', started_at = ?, updated_at = ? WHERE id = ? AND status = 'queued'").bind(now, now, job.id).run()
  return job
}

export async function runOneSourceCollectionJob(db: D1Database): Promise<{ jobId: string; status: string; itemCount: number; error?: string } | null> {
  const job = await claimSourceCollectionJob(db)
  if (!job) return null

  const now = new Date().toISOString()
  const run = currentRunTime()
  try {
    const items = job.sourceType === 'x' ? await collectX(db, job) : await collectRss(job)
    await upsertIngestPayload(db, {
      date: run.date,
      batch: run.batch,
      mode: 'source-collection-runner',
      fetchedAt: now,
      updatedAt: now,
      stats: {
        totalSources: 1,
        successSources: 1,
        failedSources: 0,
        totalItems: items.length,
        successSourceIds: [job.sourceId],
        failedSourceIds: [],
      },
      items,
    })
    await upsertSourceCollectionSnapshot(db, {
      sourceId: job.sourceId,
      sourceType: job.sourceType,
      windowStart: job.windowStart,
      windowEnd: job.windowEnd,
      status: 'fresh',
      itemCount: items.length,
    })
    const creditsUsed = estimateSourceCollectionCredits(job.sourceType === 'x' ? 'x-api' : 'rss', items.length)
    await db.batch([
      db.prepare("UPDATE source_collection_jobs SET status = 'completed', credits_used = ?, updated_at = ?, completed_at = ? WHERE id = ?")
        .bind(creditsUsed, now, now, job.id),
      db.prepare("UPDATE workspace_source_subscriptions SET status = 'ready', updated_at = ? WHERE source_id = ?")
        .bind(now, job.sourceId),
    ])
    return { jobId: job.id, status: 'completed', itemCount: items.length }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    await db.batch([
      db.prepare("UPDATE source_collection_jobs SET status = 'failed', error = ?, updated_at = ?, completed_at = ? WHERE id = ?")
        .bind(message, now, now, job.id),
      db.prepare("UPDATE workspace_source_subscriptions SET status = 'failed', updated_at = ? WHERE source_id = ?")
        .bind(now, job.sourceId),
    ])
    await upsertSourceCollectionSnapshot(db, {
      sourceId: job.sourceId,
      sourceType: job.sourceType,
      windowStart: job.windowStart,
      windowEnd: job.windowEnd,
      status: 'failed',
      itemCount: 0,
    })
    return { jobId: job.id, status: 'failed', itemCount: 0, error: message }
  }
}
