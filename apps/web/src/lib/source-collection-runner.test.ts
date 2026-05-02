import { afterEach, describe, expect, it } from 'vitest'

import { vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { runOneSourceCollectionJob, runSourceCollectionQueue } from './source-collection-runner'
import { parseRssOrAtom } from './source-collection-parser'

const job = {
  sourceId: 'rss-test',
  sourceName: 'RSS Test',
  sourceUrl: 'https://example.com/feed.xml',
  windowStart: '2026-04-29T00:00:00.000Z',
  windowEnd: '2026-04-30T00:00:00.000Z',
}

describe('source collection runner RSS parsing', () => {
  it('parses RSS items inside the requested window', () => {
    const xml = `
      <rss><channel>
        <item>
          <title>Inside window</title>
          <link>/inside</link>
          <pubDate>Wed, 29 Apr 2026 12:00:00 GMT</pubDate>
          <description>Useful signal</description>
        </item>
        <item>
          <title>Outside window</title>
          <link>https://example.com/outside</link>
          <pubDate>Tue, 28 Apr 2026 12:00:00 GMT</pubDate>
        </item>
      </channel></rss>
    `

    const items = parseRssOrAtom(xml, job)

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      title: 'Inside window',
      url: 'https://example.com/inside',
      source: 'rss-test',
      sourceName: 'RSS Test',
    })
  })

  it('parses Atom entries and resolves href links', () => {
    const xml = `
      <feed>
        <entry>
          <title>Atom entry</title>
          <link href="https://example.com/atom" />
          <updated>2026-04-29T08:00:00.000Z</updated>
          <summary>Atom summary</summary>
        </entry>
      </feed>
    `

    expect(parseRssOrAtom(xml, job)[0]).toMatchObject({
      title: 'Atom entry',
      url: 'https://example.com/atom',
      summary: 'Atom summary',
    })
  })
})

describe('source collection queue runner', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('processes queued jobs until the batch limit or empty queue', async () => {
    const results = [
      { jobId: 'job-1', status: 'completed', itemCount: 1 },
      { jobId: 'job-2', status: 'completed', itemCount: 2 },
      null,
    ]
    let calls = 0

    const summary = await runSourceCollectionQueue({} as D1Database, {
      maxJobs: 5,
      runOne: async () => results[calls++] ?? null,
    })

    expect(summary.processedCount).toBe(2)
    expect(summary.results.map((result) => result.jobId)).toEqual(['job-1', 'job-2'])
    expect(calls).toBe(3)
  })

  it('records execution logs while processing a queued RSS job', async () => {
    const writes: Array<{ sql: string; bindings: unknown[] }> = []
    const db = {
      batch: async () => {},
      prepare: (sql: string) => ({
        first: async () => {
          if (sql.includes('FROM source_collection_jobs j')) {
            return {
              adapter: 'rss',
              id: 'job-1',
              sourceId: 'rss-test',
              sourceName: 'RSS Test',
              sourceType: 'rss',
              sourceUrl: 'https://example.com/feed.xml',
              windowEnd: '2026-05-02T00:00:00.000Z',
              windowStart: '2026-05-01T00:00:00.000Z',
            }
          }
          return null
        },
        bind: (...bindings: unknown[]) => {
          writes.push({ sql, bindings })
          return {
            all: async () => ({ results: [] }),
            first: async () => null,
            run: async () => {},
          }
        },
      }),
    } as unknown as D1Database

    vi.stubGlobal('fetch', async () => new Response(`
      <rss><channel>
        <item>
          <title>Collected item</title>
          <link>https://example.com/item</link>
          <pubDate>Fri, 01 May 2026 12:00:00 GMT</pubDate>
          <description>Collected summary</description>
        </item>
      </channel></rss>
    `, { status: 200 }))

    const result = await runOneSourceCollectionJob(db)

    expect(result).toMatchObject({ itemCount: 1, jobId: 'job-1', status: 'completed' })
    expect(writes.some((statement) => statement.sql.includes('INSERT INTO execution_logs') && statement.bindings.includes('source-collection'))).toBe(true)
  })
})
