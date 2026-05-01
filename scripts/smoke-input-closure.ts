import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

export interface SmokeConfig {
  apiSecret: string
  baseUrl: string
  projectRoot: string
}

interface HttpResult {
  body: string
  status: number
  url: string
}

interface JsonHttpResult<T> extends HttpResult {
  json: T
}

interface SourceCollectionRunResponse {
  result: null | {
    error?: string
    itemCount: number
    jobId: string
    status: string
  }
}

interface RadioRunResponse {
  episode: null | {
    id: string
    status: string
  }
}

export const requiredSmokeTables = [
  'auth_users',
  'items',
  'radio_episodes',
  'source_collection_jobs',
  'source_collection_snapshots',
  'sources',
  'workspaces',
  'x_accounts',
] as const

const scriptDir = dirname(fileURLToPath(import.meta.url))
const defaultProjectRoot = resolve(scriptDir, '..')

export function smokeConfigFromEnv(env: NodeJS.ProcessEnv = process.env): SmokeConfig {
  return {
    apiSecret: env.READO_API_SECRET ?? 'local-smoke-secret',
    baseUrl: env.READO_SMOKE_BASE_URL ?? 'http://localhost:3000',
    projectRoot: env.READO_PROJECT_ROOT ?? defaultProjectRoot,
  }
}

export function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

export function assertNoRuntimeError(name: string, html: string): void {
  if (/Runtime Error|Unhandled Runtime Error|Application error/i.test(html)) {
    throw new Error(`${name} rendered a runtime error`)
  }
}

async function httpGet(path: string, config: SmokeConfig): Promise<HttpResult> {
  const url = new URL(path, config.baseUrl).toString()
  const response = await fetch(url)
  const body = await response.text()
  if (!response.ok) throw new Error(`GET ${url} failed with HTTP ${response.status}: ${body.slice(0, 200)}`)
  return { body, status: response.status, url }
}

async function httpPostJson<T>(path: string, config: SmokeConfig): Promise<JsonHttpResult<T>> {
  const url = new URL(path, config.baseUrl).toString()
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-reado-api-secret': config.apiSecret,
    },
    body: '{}',
  })
  const body = await response.text()
  if (!response.ok) throw new Error(`POST ${url} failed with HTTP ${response.status}: ${body.slice(0, 200)}`)
  return { body, json: JSON.parse(body) as T, status: response.status, url }
}

export function runLocalD1(config: SmokeConfig, sql: string): void {
  execFileSync(
    'npx',
    ['wrangler', 'd1', 'execute', 'reado-station', '--local', '--command', sql],
    {
      cwd: join(config.projectRoot, 'apps/web'),
      stdio: 'pipe',
    },
  )
}

function queryLocalD1(config: SmokeConfig, sql: string): string {
  return execFileSync(
    'npx',
    ['wrangler', 'd1', 'execute', 'reado-station', '--local', '--json', '--command', sql],
    {
      cwd: join(config.projectRoot, 'apps/web'),
      encoding: 'utf8',
      stdio: 'pipe',
    },
  )
}

export function schemaPreflightSql(): string {
  return `
    SELECT name
    FROM sqlite_master
    WHERE type = 'table' AND name IN (${requiredSmokeTables.map(sqlString).join(', ')})
    ORDER BY name;
  `
}

function parseD1JsonResults(raw: string): Array<Record<string, unknown>> {
  const payload = JSON.parse(raw) as Array<{ results?: Array<Record<string, unknown>> }>
  return payload.flatMap((entry) => entry.results ?? [])
}

function smokeSchemaPreflight(config: SmokeConfig): void {
  const rows = parseD1JsonResults(queryLocalD1(config, schemaPreflightSql()))
  const existing = new Set(rows.map((row) => String(row.name)))
  const missing = requiredSmokeTables.filter((table) => !existing.has(table))
  if (missing.length > 0) {
    throw new Error(`D1 schema is missing required input smoke tables: ${missing.join(', ')}. Run: npm run d1:migrate:local`)
  }
}

export function seedRssSuccessJobSql(id: string, feedUrl = 'http://localhost:3000/api/smoke/rss'): string {
  return [
    `INSERT OR REPLACE INTO sources (id, name, adapter, url, hours, enabled, category, topics, searchable, updated_at) VALUES ('rss-smoke-feed', 'reado smoke feed', 'rss', ${sqlString(feedUrl)}, 24, 1, 'rss', '[]', 1, '2026-04-30T00:00:00.000Z');`,
    `INSERT OR REPLACE INTO source_collection_jobs (id, source_id, source_type, window_start, window_end, status, requested_by_workspace_count, credits_used, created_at, updated_at) VALUES (${sqlString(id)}, 'rss-smoke-feed', 'rss', '2026-04-29T00:00:00.000Z', '2026-04-30T23:59:59.999Z', 'queued', 1, 0, '2026-04-30T00:00:00.000Z', '2026-04-30T00:00:00.000Z');`,
  ].join(' ')
}

export function smokeCleanupSql(): string {
  return [
    "DELETE FROM radio_episodes WHERE id LIKE 'smoke-radio-%' OR workspace_id = 'smoke-workspace';",
    "DELETE FROM source_collection_jobs WHERE id LIKE 'smoke-%' OR source_id IN ('rss-smoke-feed', 'tw-smokex');",
    "DELETE FROM source_collection_snapshots WHERE source_id IN ('rss-smoke-feed', 'tw-smokex');",
    "DELETE FROM items WHERE source IN ('rss-smoke-feed', 'tw-smokex');",
    "DELETE FROM sources WHERE id IN ('rss-smoke-feed', 'tw-smokex');",
    "DELETE FROM x_accounts WHERE id = 'x-smoke-user' OR username = 'smokex';",
    "DELETE FROM workspaces WHERE id = 'smoke-workspace';",
    "DELETE FROM auth_users WHERE id = 'smoke-user';",
  ].join(' ')
}

function seedXFailureJobSql(id: string): string {
  return [
    "INSERT OR REPLACE INTO x_accounts (id, username, name, description, verified, followers_count, following_count, tweet_count, listed_count, raw_json, fetched_at, updated_at) VALUES ('x-smoke-user', 'smokex', 'Smoke X', '', 0, 0, 0, 0, 0, '{}', '2026-04-30T00:00:00.000Z', '2026-04-30T00:00:00.000Z');",
    "INSERT OR REPLACE INTO sources (id, name, adapter, url, hours, enabled, category, topics, searchable, updated_at) VALUES ('tw-smokex', '@smokex (X)', 'twitter', 'https://x.com/smokex', 24, 1, 'twitter', '[]', 1, '2026-04-30T00:00:00.000Z');",
    `INSERT OR REPLACE INTO source_collection_jobs (id, source_id, source_type, window_start, window_end, status, requested_by_workspace_count, credits_used, created_at, updated_at) VALUES (${sqlString(id)}, 'tw-smokex', 'x', '2026-04-29T00:00:00.000Z', '2026-04-30T00:00:00.000Z', 'queued', 1, 0, '2026-04-30T00:00:00.000Z', '2026-04-30T00:00:00.000Z');`,
  ].join(' ')
}

function seedRadioFailureJobSql(id: string): string {
  return [
    "INSERT OR IGNORE INTO auth_users (id, username, password_hash, display_name, created_at, updated_at) VALUES ('smoke-user', 'smokeuser', 'disabled', 'Smoke User', '2026-04-30T00:00:00.000Z', '2026-04-30T00:00:00.000Z');",
    "INSERT OR IGNORE INTO workspaces (id, name, slug, type, owner_user_id, plan_id, created_at, updated_at) VALUES ('smoke-workspace', 'Smoke Workspace', 'smoke-workspace', 'personal', 'smoke-user', 'free', '2026-04-30T00:00:00.000Z', '2026-04-30T00:00:00.000Z');",
    `INSERT OR REPLACE INTO radio_episodes (id, workspace_id, user_id, date, status, title, script, provider, provider_model, credits_estimated, credits_used, created_at, updated_at) VALUES (${sqlString(id)}, 'smoke-workspace', 'smoke-user', ${sqlString(`smoke-${id}`)}, 'queued', 'Smoke radio', '这是一条本地电台测试脚本。', 'minimax-tts', 'speech-2.8-turbo', 1, 0, '2026-04-30T00:00:00.000Z', '2026-04-30T00:00:00.000Z');`,
  ].join(' ')
}

async function smokePages(config: SmokeConfig): Promise<void> {
  const checks = [
    { path: '/channels', required: ['name="packId"', 'finance-macro-starter'] },
    { path: '/sources', required: ['我的信息源'] },
    { path: '/today?category=rss', required: ['Reado Smoke RSS Item', 'reado smoke feed'] },
  ]

  for (const check of checks) {
    const result = await httpGet(check.path, config)
    assertNoRuntimeError(check.path, result.body)
    for (const required of check.required) {
      if (!result.body.includes(required)) throw new Error(`${check.path} is missing ${required}`)
    }
    console.log(`ok ${check.path} ${result.status}`)
  }
}

async function smokeRssSuccess(config: SmokeConfig, id: string): Promise<void> {
  runLocalD1(config, seedRssSuccessJobSql(id, new URL('/api/smoke/rss', config.baseUrl).toString()))
  const response = await httpPostJson<SourceCollectionRunResponse>('/api/source-collections/run', config)
  if (response.json.result?.jobId !== id || response.json.result.status !== 'completed' || response.json.result.itemCount < 1) {
    throw new Error(`expected RSS smoke job to complete, got ${response.body}`)
  }
  console.log(`ok rss collection state ${id}`)
}

async function smokeXFailure(config: SmokeConfig, id: string): Promise<void> {
  runLocalD1(config, seedXFailureJobSql(id))
  const response = await httpPostJson<SourceCollectionRunResponse>('/api/source-collections/run', config)
  if (response.json.result?.jobId !== id || response.json.result.status !== 'failed') {
    throw new Error(`expected X smoke job to fail clearly, got ${response.body}`)
  }
  if (!response.json.result.error) {
    throw new Error(`expected X smoke job to include an error, got ${response.body}`)
  }
  console.log(`ok x failure state ${id}`)
}

async function smokeRadioFailure(config: SmokeConfig, id: string): Promise<void> {
  runLocalD1(config, seedRadioFailureJobSql(id))
  const response = await httpPostJson<RadioRunResponse>('/api/radio/episodes/run', config)
  if (response.json.episode?.id !== id || response.json.episode.status !== 'failed') {
    throw new Error(`expected radio smoke episode to fail clearly, got ${response.body}`)
  }
  console.log(`ok radio failure state ${id}`)
}

export async function runInputClosureSmoke(config = smokeConfigFromEnv()): Promise<void> {
  const suffix = String(Date.now())
  smokeSchemaPreflight(config)
  runLocalD1(config, smokeCleanupSql())
  try {
    await smokeRssSuccess(config, `smoke-rss-${suffix}`)
    await smokePages(config)
    await smokeXFailure(config, `smoke-x-${suffix}`)
    await smokeRadioFailure(config, `smoke-radio-${suffix}`)
  } finally {
    runLocalD1(config, smokeCleanupSql())
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runInputClosureSmoke().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
