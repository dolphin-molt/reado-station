export const dynamic = 'force-dynamic'

export function GET(): Response {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>reado smoke feed</title>
    <link>https://reado.local/smoke</link>
    <description>Deterministic RSS fixture for local input smoke tests.</description>
    <item>
      <title>Reado Smoke RSS Item</title>
      <link>https://reado.local/smoke/rss-item</link>
      <guid>https://reado.local/smoke/rss-item</guid>
      <pubDate>Thu, 30 Apr 2026 08:00:00 GMT</pubDate>
      <description>Smoke test item for the public source collection pool.</description>
    </item>
  </channel>
</rss>`,
    {
      headers: {
        'cache-control': 'no-store',
        'content-type': 'application/rss+xml; charset=utf-8',
      },
    },
  )
}
