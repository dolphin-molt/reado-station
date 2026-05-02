import 'server-only'

import { getCloudflareEnv } from '@/lib/cloudflare'
import { upsertIngestPayload } from '@/lib/d1-write'
import { createExecutionRunId, logExecutionStep, withExecutionStep } from '@/lib/execution-logs'
import { resolveXBearerToken } from '@/lib/provider-env'
import { parseRssOrAtom } from '@/lib/source-collection-parser'
import { upsertSourceCollectionSnapshot } from '@/lib/source-collections'
import { estimateSourceCollectionCredits } from '@/lib/usage-metering'
import { classifyXTweetContentType, type XContentType } from '@/lib/x-content-preferences'

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
  metadata?: Record<string, unknown>
}

interface XApiTweetsResponse {
  data?: Array<{
    id: string
    text?: string
    created_at?: string
    author_id?: string
    conversation_id?: string
    referenced_tweets?: Array<{ type?: string; id?: string }>
    public_metrics?: Record<string, number>
    note_tweet?: { text?: string }
    attachments?: { media_keys?: string[] }
    entities?: {
      urls?: Array<{ expanded_url?: string; url?: string }>
      media?: unknown[]
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
  url.searchParams.set('tweet.fields', 'created_at,entities,referenced_tweets,conversation_id,author_id,public_metrics,note_tweet,attachments')
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
    const contentType: XContentType = classifyXTweetContentType(tweet, account.id)
    const referencedType = tweet.referenced_tweets?.[0]?.type ?? null
    return {
      title: (tweet.note_tweet?.text ?? tweet.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 220),
      url: expandedUrl ?? `https://x.com/${account.username}/status/${tweet.id}`,
      summary: tweet.note_tweet?.text ?? tweet.text ?? '',
      publishedAt,
      source: job.sourceId,
      sourceName: `@${account.username}`,
      category: 'twitter',
      metadata: {
        content_type: contentType,
        x_tweet_id: tweet.id,
        x_conversation_id: tweet.conversation_id ?? tweet.id,
        x_root_tweet_id: tweet.conversation_id ?? tweet.id,
        x_referenced_type: referencedType,
        thread_part_count: contentType === 'thread' ? 1 : 0,
        is_partial_thread: false,
        public_metrics: tweet.public_metrics ?? {},
      },
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
  const runId = createExecutionRunId(`collect-${job.id}`)
  const subject = {
    runId,
    scope: 'source-collection',
    subjectId: job.sourceId,
    subjectType: 'source',
  }
  await logExecutionStep(db, {
    ...subject,
    metadata: {
      adapter: job.adapter,
      jobId: job.id,
      sourceType: job.sourceType,
      windowEnd: job.windowEnd,
      windowStart: job.windowStart,
    },
    status: 'started',
    step: 'source_collection_job',
  })
  try {
    const items = await withExecutionStep(db, {
      ...subject,
      metadata: { jobId: job.id, sourceType: job.sourceType, sourceUrl: job.sourceUrl },
      step: job.sourceType === 'x' ? 'fetch_x_timeline' : 'fetch_rss_feed',
    }, () => job.sourceType === 'x' ? collectX(db, job) : collectRss(job))
    await withExecutionStep(db, {
      ...subject,
      metadata: { itemCount: items.length, jobId: job.id },
      step: 'persist_items',
    }, () => upsertIngestPayload(db, {
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
    }))
    await withExecutionStep(db, {
      ...subject,
      metadata: { itemCount: items.length, jobId: job.id },
      step: 'update_collection_snapshot',
    }, () => upsertSourceCollectionSnapshot(db, {
      sourceId: job.sourceId,
      sourceType: job.sourceType,
      windowStart: job.windowStart,
      windowEnd: job.windowEnd,
      status: 'fresh',
      itemCount: items.length,
    }))
    const creditsUsed = estimateSourceCollectionCredits(job.sourceType === 'x' ? 'x-api' : 'rss', items.length)
    await withExecutionStep(db, {
      ...subject,
      metadata: { creditsUsed, itemCount: items.length, jobId: job.id },
      step: 'complete_source_collection_job',
    }, () => db.batch([
      db.prepare("UPDATE source_collection_jobs SET status = 'completed', credits_used = ?, updated_at = ?, completed_at = ? WHERE id = ?")
        .bind(creditsUsed, now, now, job.id),
      db.prepare("UPDATE workspace_source_subscriptions SET status = 'ready', updated_at = ? WHERE source_id = ?")
        .bind(now, job.sourceId),
    ]))
    await logExecutionStep(db, {
      ...subject,
      metadata: { creditsUsed, itemCount: items.length, jobId: job.id },
      status: 'completed',
      step: 'source_collection_job',
    })
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
    await logExecutionStep(db, {
      ...subject,
      message,
      metadata: { jobId: job.id },
      status: 'failed',
      step: 'source_collection_job',
    })
    return { jobId: job.id, status: 'failed', itemCount: 0, error: message }
  }
}

type SourceCollectionRunResult = NonNullable<Awaited<ReturnType<typeof runOneSourceCollectionJob>>>

export async function runSourceCollectionQueue(
  db: D1Database,
  options: {
    maxJobs?: number
    runOne?: (db: D1Database) => Promise<SourceCollectionRunResult | null>
  } = {},
): Promise<{ processedCount: number; results: SourceCollectionRunResult[] }> {
  const maxJobs = Math.max(1, Math.min(25, Math.floor(options.maxJobs ?? 10)))
  const runOne = options.runOne ?? runOneSourceCollectionJob
  const results: SourceCollectionRunResult[] = []

  for (let index = 0; index < maxJobs; index += 1) {
    const result = await runOne(db)
    if (!result) break
    results.push(result)
  }

  return {
    processedCount: results.length,
    results,
  }
}
