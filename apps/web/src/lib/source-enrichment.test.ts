import { describe, expect, it } from 'vitest'

import { vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { enqueueProfileEnrichmentJob, runOneProfileEnrichmentJob } from './source-enrichment'

describe('profile enrichment jobs', () => {
  it('enqueues discover_profile_assets without duplicating active jobs', async () => {
    const statements: Array<{ sql: string; bindings: unknown[] }> = []
    const db = {
      prepare: (sql: string) => ({
        bind: (...bindings: unknown[]) => {
          statements.push({ sql, bindings })
          return {
            first: async () => null,
            run: async () => {},
          }
        },
      }),
    } as unknown as D1Database

    const result = await enqueueProfileEnrichmentJob(db, {
      jobType: 'discover_profile_assets',
      sourceType: 'x',
      sourceValue: 'AnthropicAI',
    })

    expect(result.status).toBe('queued')
    expect(statements.some((statement) => statement.sql.includes('INSERT INTO enrichment_jobs'))).toBe(true)
  })

  it('runs a queued profile enrichment job and writes featured_json', async () => {
    const writes: Array<{ sql: string; bindings: unknown[] }> = []
    const db = {
      prepare: (sql: string) => ({
        first: async () => {
          if (sql.includes('FROM enrichment_jobs')) {
            return {
              id: 'job-1',
              jobType: 'discover_profile_assets',
              sourceType: 'x',
              sourceValue: 'AnthropicAI',
            }
          }
          return null
        },
        bind: (...bindings: unknown[]) => {
          writes.push({ sql, bindings })
          return {
            all: async () => ({ results: [] }),
            first: async () => {
              if (sql.includes('FROM enrichment_jobs')) {
                return {
                  id: 'job-1',
                  jobType: 'discover_profile_assets',
                  sourceType: 'x',
                  sourceValue: 'AnthropicAI',
                }
              }
              if (sql.includes('FROM x_accounts')) {
                return {
                  description: 'Anthropic builds Claude.',
                  name: 'Anthropic',
                  profileImageUrl: '',
                  username: 'AnthropicAI',
                  verified: 1,
                }
              }
              return null
            },
            run: async () => {},
          }
        },
      }),
    } as unknown as D1Database

    const result = await runOneProfileEnrichmentJob(db)

    expect(result).toMatchObject({ assetCount: 3, jobId: 'job-1', status: 'completed' })
    expect(writes.some((statement) => statement.sql.includes('INSERT INTO channel_profiles'))).toBe(true)
    expect(writes.some((statement) => statement.sql.includes('featured_json'))).toBe(true)
  })
})
