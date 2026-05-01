import { describe, expect, it } from 'vitest'

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
