import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  collectedDataStatements,
  digestMarkdownStatement,
  insertOrReplace,
  sqlString,
  stableJson,
} from './lib/d1-sql.js'
import { buildBackfillSql } from './export-d1-backfill.js'

describe('sqlString', () => {
  it('serializes nullish values as NULL', () => {
    expect(sqlString(null)).toBe('NULL')
    expect(sqlString(undefined)).toBe('NULL')
  })

  it('serializes booleans as SQLite integers', () => {
    expect(sqlString(true)).toBe('1')
    expect(sqlString(false)).toBe('0')
  })

  it('escapes single quotes in text', () => {
    expect(sqlString("OpenAI's roadmap")).toBe("'OpenAI''s roadmap'")
  })

  it('guards non-finite numbers', () => {
    expect(sqlString(Number.NaN)).toBe('NULL')
    expect(sqlString(Number.POSITIVE_INFINITY)).toBe('NULL')
  })
})

describe('stableJson', () => {
  it('serializes undefined as JSON null', () => {
    expect(stableJson(undefined)).toBe('null')
  })

  it('keeps arrays and objects as compact JSON', () => {
    expect(stableJson(['AI', 'Agent'])).toBe('["AI","Agent"]')
    expect(stableJson({ enabled: true })).toBe('{"enabled":true}')
  })
})

describe('insertOrReplace', () => {
  it('builds an idempotent insert statement', () => {
    expect(insertOrReplace('sources', ['id', 'enabled'], ['openai', true])).toBe(
      "INSERT OR REPLACE INTO sources (id, enabled) VALUES ('openai', 1);",
    )
  })

  it('throws for mismatched columns and values', () => {
    expect(() => insertOrReplace('items', ['id'], ['1', 'extra'])).toThrow(/Column\/value length mismatch/)
  })
})

describe('collectedDataStatements', () => {
  it('builds item and collection run statements for a batch', () => {
    const statements = collectedDataStatements({
      fetchedAt: '2026-04-21T00:00:00.000Z',
      stats: {
        totalSources: 1,
        successSources: 1,
        failedSources: 0,
        totalItems: 1,
        deduplicatedItems: 0,
        successSourceIds: ['openai'],
        failedSourceIds: [],
      },
      items: [
        {
          title: 'OpenAI &amp; friends',
          url: 'https://example.com/a',
          summary: 'Hello\nworld',
          publishedAt: '2026-04-21T00:00:00.000Z',
          source: 'openai',
          sourceName: 'OpenAI Blog',
        },
      ],
    }, {
      date: '2026-04-21',
      batch: 'morning',
      mode: 'cloud',
      updatedAt: '2026-04-21T00:00:00.000Z',
    })

    expect(statements).toHaveLength(2)
    expect(statements[0]).toContain("'2026-04-21-morning-0'")
    expect(statements[0]).toContain("'OpenAI & friends'")
    expect(statements[1]).toContain('INSERT OR REPLACE INTO collection_runs')
  })
})

describe('digestMarkdownStatement', () => {
  it('stores raw markdown safely', () => {
    const statement = digestMarkdownStatement({
      date: '2026-04-21',
      batch: 'morning',
      headline: "Today's AI",
      markdown: "# Today's AI\n\nBody",
      updatedAt: '2026-04-21T00:00:00.000Z',
    })

    expect(statement).toContain("'Today''s AI'")
    expect(statement).toContain("'# Today''s AI")
  })
})

describe('buildBackfillSql', () => {
  it('allows CI checkouts without ignored runtime data', () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'reado-empty-'))
    const configDir = join(projectRoot, 'config')
    mkdirSync(configDir, { recursive: true })
    writeFileSync(join(configDir, 'sources.json'), JSON.stringify({ sources: [{ id: 'openai', name: 'OpenAI', enabled: true }] }))

    const { sql, stats } = buildBackfillSql({ projectRoot })

    expect(sql).toContain('INSERT OR REPLACE INTO sources')
    expect(stats).toEqual({
      items: 0,
      digests: 0,
      sources: 1,
      collectionRuns: 0,
      opsStateKeys: 0,
    })
  })
})
