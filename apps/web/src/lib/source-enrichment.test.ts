import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { enqueueProfileEnrichmentJob, runOneProfileEnrichmentJob, runProfileEnrichmentQueue } from './source-enrichment'

describe('profile enrichment jobs', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

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

    const fetcher: typeof fetch = async (input) => {
      const url = input.toString()
      if (url === 'https://www.anthropic.com/') {
        return new Response('<title>Anthropic</title>', { status: 200, headers: { 'content-type': 'text/html' } })
      }
      if (url.startsWith('https://api.github.com/search/users')) {
        return new Response(JSON.stringify({ items: [{ html_url: 'https://github.com/anthropics', login: 'anthropics', type: 'Organization' }] }), { status: 200 })
      }
      if (url === 'https://api.github.com/orgs/anthropics') {
        return new Response(JSON.stringify({ description: 'Official Anthropic GitHub organization.', html_url: 'https://github.com/anthropics', login: 'anthropics' }), { status: 200 })
      }
      if (url === 'https://www.youtube.com/@anthropic-ai') {
        return new Response('<title>Anthropic - YouTube</title><script>{"videoId":"ysPbXH0LpIE","title":{"runs":[{"text":"Prompting 101 | Code w/ Claude"}]}}</script>', { status: 200 })
      }
      return new Response('', { status: 404 })
    }

    const result = await runOneProfileEnrichmentJob(db, {
      assetSelector: {
        select: async ({ candidates }) => candidates,
      },
      fetcher,
      searchProvider: {
        search: async () => [],
      },
    })

    expect(result).toMatchObject({ assetCount: 4, jobId: 'job-1', status: 'completed' })
    expect(writes.some((statement) => statement.sql.includes('INSERT INTO channel_profiles'))).toBe(true)
    expect(writes.some((statement) => statement.sql.includes('featured_json'))).toBe(true)
    expect(writes.some((statement) => statement.sql.includes('INSERT INTO execution_logs') && statement.bindings.includes('profile-enrichment'))).toBe(true)
  })

  it('fails a profile enrichment job when search or model providers are missing', async () => {
    const writes: Array<{ sql: string; bindings: unknown[] }> = []
    const db = {
      prepare: (sql: string) => ({
        first: async () => {
          if (sql.includes('FROM enrichment_jobs')) {
            return {
              id: 'job-1',
              jobType: 'discover_profile_assets',
              sourceType: 'x',
              sourceValue: 'ElonMusk',
            }
          }
          return null
        },
        bind: (...bindings: unknown[]) => {
          writes.push({ sql, bindings })
          return {
            first: async () => {
              if (sql.includes('FROM enrichment_jobs')) {
                return {
                  id: 'job-1',
                  jobType: 'discover_profile_assets',
                  sourceType: 'x',
                  sourceValue: 'ElonMusk',
                }
              }
              if (sql.includes('FROM x_accounts')) {
                return {
                  description: 'https://t.co/dDtDyVssfm',
                  name: 'Elon Musk',
                  profileImageUrl: '',
                  username: 'elonmusk',
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

    const result = await runOneProfileEnrichmentJob(db, {
      assetSelector: null,
      env: {},
      searchProvider: null,
    })
    const providerStatus = (result as { providerStatus?: { ready?: boolean; missing?: string[] } } | null)?.providerStatus

    expect(result).toMatchObject({ assetCount: 0, jobId: 'job-1', status: 'failed' })
    expect(result?.error).toContain('Missing profile enrichment providers')
    expect(providerStatus?.ready).toBe(false)
    expect(providerStatus?.missing).toEqual(expect.arrayContaining([
      'READO_BRAVE_SEARCH_API_KEY, BRAVE_SEARCH_API_KEY, or BIGMODEL_OKIT_KEY',
      'READO_PROFILE_ENRICHMENT_MODEL_ENDPOINT or CLOUDFLARE_AI_GATEWAY_URL',
      'READO_PROFILE_ENRICHMENT_MODEL_TOKEN, CLOUDFLARE_AI_GATEWAY_TOKEN, or BIGMODEL_OKIT_KEY',
      'READO_PROFILE_ENRICHMENT_MODEL, LLM_MODEL, or BIGMODEL_OKIT_KEY',
    ]))
    const failedWrite = writes.find((statement) => statement.sql.includes("UPDATE enrichment_jobs SET status = 'failed'"))
    const failedOutput = JSON.parse(String(failedWrite?.bindings[1] ?? '{}')) as { providerStatus?: { ready?: boolean } }
    expect(failedOutput.providerStatus?.ready).toBe(false)
    expect(writes.some((statement) => statement.sql.includes('INSERT INTO channel_profiles'))).toBe(false)
    expect(failedWrite).toBeTruthy()
  })

  it('does not replace a model rejection with seeded profile assets', async () => {
    const writes: Array<{ sql: string; bindings: unknown[] }> = []
    const db = {
      prepare: (sql: string) => ({
        first: async () => {
          if (sql.includes('FROM enrichment_jobs')) {
            return {
              id: 'job-1',
              jobType: 'discover_profile_assets',
              sourceType: 'x',
              sourceValue: 'OpenAI',
            }
          }
          return null
        },
        bind: (...bindings: unknown[]) => {
          writes.push({ sql, bindings })
          return {
            first: async () => {
              if (sql.includes('FROM enrichment_jobs')) {
                return {
                  id: 'job-1',
                  jobType: 'discover_profile_assets',
                  sourceType: 'x',
                  sourceValue: 'OpenAI',
                }
              }
              if (sql.includes('FROM x_accounts')) {
                return {
                  description: 'OpenAI mission text.',
                  name: 'OpenAI',
                  profileImageUrl: '',
                  username: 'OpenAI',
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

    const result = await runOneProfileEnrichmentJob(db, {
      assetSelector: {
        select: async () => [],
      },
      fetcher: async (input) => {
        const url = input.toString()
        if (url === 'https://openai.com/') return new Response('<title>OpenAI</title>', { status: 200 })
        if (url.startsWith('https://api.github.com/search/users')) return new Response(JSON.stringify({ items: [] }), { status: 200 })
        if (url === 'https://www.youtube.com/@openai') return new Response('', { status: 404 })
        if (url === 'https://www.youtube.com/@openai-ai') return new Response('', { status: 404 })
        return new Response('', { status: 404 })
      },
      searchProvider: {
        search: async () => [{ title: 'OpenAI', url: 'https://openai.com/' }],
      },
    })
    const profileWrite = writes.find((statement) => statement.sql.includes('INSERT INTO channel_profiles'))
    const featuredJson = profileWrite?.bindings[7]

    expect(result).toMatchObject({ assetCount: 0, jobId: 'job-1', status: 'completed' })
    expect(featuredJson).toBe('[]')
  })

  it('uses BIGMODEL_OKIT_KEY for profile search and model selection when explicit providers are not configured', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const writes: Array<{ sql: string; bindings: unknown[] }> = []
    const requestedUrls: string[] = []
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

    const result = await runOneProfileEnrichmentJob(db, {
      env: { BIGMODEL_OKIT_KEY: 'bigmodel-key' },
      fetcher: async (input, init) => {
        const url = input.toString()
        requestedUrls.push(url)
        if (url === 'https://open.bigmodel.cn/api/paas/v4/web_search') {
          expect((init?.headers as Record<string, string>).authorization).toBe('Bearer bigmodel-key')
          return new Response(JSON.stringify({
            search_result: [
              { title: 'Anthropic', link: 'https://www.anthropic.com/', content: 'Official site.' },
            ],
          }), { status: 200 })
        }
        if (url === 'https://www.anthropic.com/') return new Response('<title>Anthropic</title>', { status: 200 })
        if (url.startsWith('https://api.github.com/search/users')) return new Response(JSON.stringify({ items: [] }), { status: 200 })
        if (url === 'https://www.youtube.com/@anthropic') return new Response('', { status: 404 })
        if (url === 'https://www.youtube.com/@anthropic-ai') return new Response('', { status: 404 })
        if (url === 'https://www.youtube.com/@anthropicai') return new Response('', { status: 404 })
        if (url === 'https://open.bigmodel.cn/api/paas/v4/chat/completions') {
          const body = JSON.parse(init?.body as string) as { model?: string }
          expect((init?.headers as Record<string, string>).authorization).toBe('Bearer bigmodel-key')
          expect(body.model).toBe('glm-4.7-flash')
          return new Response(JSON.stringify({
            choices: [{
              message: {
                content: JSON.stringify({
                  assets: [
                    {
                      kind: 'website',
                      title: 'Anthropic',
                      url: 'https://www.anthropic.com',
                      summary: 'Official website selected by the model.',
                    },
                  ],
                }),
              },
            }],
          }), { status: 200 })
        }
        return new Response('', { status: 404 })
      },
    })

    expect(requestedUrls).toContain('https://open.bigmodel.cn/api/paas/v4/web_search')
    expect(requestedUrls).toContain('https://open.bigmodel.cn/api/paas/v4/chat/completions')
    expect(result).toMatchObject({
      assetCount: 1,
      jobId: 'job-1',
      providerStatus: {
        model: { model: 'glm-4.7-flash', provider: 'bigmodel' },
        ready: true,
        search: { provider: 'bigmodel' },
      },
      status: 'completed',
    })
    expect(infoSpy).not.toHaveBeenCalled()
    expect(warnSpy).not.toHaveBeenCalled()
    const profileWrite = writes.find((statement) => statement.sql.includes('INSERT INTO channel_profiles'))
    expect(profileWrite?.bindings[7]).toContain('Official website selected by the model.')
  })

  it('processes queued enrichment jobs until the batch limit or empty queue', async () => {
    const results = [
      { assetCount: 1, jobId: 'job-1', status: 'completed' },
      { assetCount: 2, jobId: 'job-2', status: 'completed' },
      null,
    ]
    let calls = 0

    const summary = await runProfileEnrichmentQueue({} as D1Database, {
      maxJobs: 5,
      runOne: async () => results[calls++] ?? null,
    })

    expect(summary.processedCount).toBe(2)
    expect(summary.results.map((result) => result.jobId)).toEqual(['job-1', 'job-2'])
    expect(calls).toBe(3)
  })
})
