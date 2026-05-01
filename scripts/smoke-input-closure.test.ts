import { describe, expect, it } from 'vitest'

import {
  assertNoRuntimeError,
  requiredSmokeTables,
  schemaPreflightSql,
  smokeCleanupSql,
  seedRssSuccessJobSql,
  smokeConfigFromEnv,
  sqlString,
} from './smoke-input-closure.js'

describe('input closure smoke helpers', () => {
  it('reads base URL and API secret from env with local defaults', () => {
    expect(smokeConfigFromEnv({}).baseUrl).toBe('http://localhost:3000')
    expect(smokeConfigFromEnv({}).apiSecret).toBe('local-smoke-secret')
    expect(smokeConfigFromEnv({ READO_SMOKE_BASE_URL: 'http://127.0.0.1:3001', READO_API_SECRET: 'secret' })).toMatchObject({
      apiSecret: 'secret',
      baseUrl: 'http://127.0.0.1:3001',
    })
  })

  it('escapes SQL strings for local smoke seed data', () => {
    expect(sqlString("OpenAI's feed")).toBe("'OpenAI''s feed'")
  })

  it('throws when a page contains a Next runtime error', () => {
    expect(() => assertNoRuntimeError('/today', '<h1>Runtime Error</h1>')).toThrow('/today rendered a runtime error')
    expect(() => assertNoRuntimeError('/today', '<h1>今日</h1>')).not.toThrow()
  })

  it('builds RSS seed SQL for the public pool smoke run', () => {
    const sql = seedRssSuccessJobSql('smoke-rss-1', 'http://localhost:3000/api/smoke/rss')

    expect(sql).toContain("'smoke-rss-1'")
    expect(sql).toContain("'rss-smoke-feed'")
    expect(sql).toContain('http://localhost:3000/api/smoke/rss')
    expect(sql).toContain("'queued'")
  })

  it('builds cleanup SQL for smoke-only rows without touching real sources', () => {
    const sql = smokeCleanupSql()

    expect(sql).toContain("id LIKE 'smoke-%'")
    expect(sql).toContain("'rss-smoke-feed'")
    expect(sql).not.toContain("'rss-fed-news'")
  })

  it('builds schema preflight SQL for every table used by the smoke run', () => {
    const sql = schemaPreflightSql()

    expect(requiredSmokeTables).toContain('source_collection_jobs')
    expect(requiredSmokeTables).toContain('radio_episodes')
    for (const table of requiredSmokeTables) {
      expect(sql).toContain(sqlString(table))
    }
  })
})
