import 'server-only'

import { cookies } from 'next/headers'

import { getCloudflareEnv, getD1Database } from '@/lib/cloudflare'
import { constantTimeEqual, randomHex, sha256Hex } from '@/lib/security'

export const AUTH_SESSION_COOKIE = 'reado_session'
export const AUTH_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30

const ADMIN_USER_ID = 'admin'
const LOGIN_WINDOW_MS = 15 * 60 * 1000
const LOGIN_LOCK_MS = 15 * 60 * 1000
const LOGIN_MAX_FAILURES = 5

export interface AuthConfig {
  adminUsername: string
  adminPassword: string | null
  authSecret: string | null
}

interface AuthSessionRow {
  id: string
  userId: string
  createdAt: string
  expiresAt: string
  lastSeenAt: string
}

export interface AuthSession {
  id: string
  userId: string
  createdAt: string
  expiresAt: string
  lastSeenAt: string
}

interface LoginAttemptRow {
  failedCount: number
  windowStartedAt: string
  lockedUntil: string | null
}

export interface LoginFailureResult {
  failedCount: number
  lockedUntil: string | null
}

function readProcessEnv(name: string): string | undefined {
  return process.env[name]
}

export async function getAuthConfig(): Promise<AuthConfig> {
  const env = await getCloudflareEnv()

  return {
    adminUsername: env?.READO_ADMIN_USERNAME ?? readProcessEnv('READO_ADMIN_USERNAME') ?? ADMIN_USER_ID,
    adminPassword: env?.READO_ADMIN_PASSWORD ?? readProcessEnv('READO_ADMIN_PASSWORD') ?? null,
    authSecret: env?.READO_AUTH_SECRET ?? readProcessEnv('READO_AUTH_SECRET') ?? null,
  }
}

export function missingAuthConfig(config: AuthConfig): string[] {
  const missing: string[] = []
  if (!config.adminPassword) missing.push('READO_ADMIN_PASSWORD')
  if (!config.authSecret) missing.push('READO_AUTH_SECRET')
  return missing
}

export function verifyAdminCredentials(config: AuthConfig, username: string, password: string): boolean {
  if (!config.adminPassword) return false

  const usernameOk = constantTimeEqual(username, config.adminUsername)
  const passwordOk = constantTimeEqual(password, config.adminPassword)
  return usernameOk && passwordOk
}

async function hashSessionToken(config: AuthConfig, token: string): Promise<string> {
  if (!config.authSecret) throw new Error('READO_AUTH_SECRET is not configured')
  return sha256Hex(`session:${config.authSecret}:${token}`)
}

export async function createAuthSession(db: D1Database, config: AuthConfig): Promise<{ token: string; expiresAt: Date }> {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + AUTH_SESSION_TTL_SECONDS * 1000)
  const token = randomHex(32)
  const tokenHash = await hashSessionToken(config, token)

  await db
    .prepare(
      `
        INSERT INTO auth_sessions (id, token_hash, user_id, created_at, expires_at, last_seen_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
    )
    .bind(crypto.randomUUID(), tokenHash, ADMIN_USER_ID, now.toISOString(), expiresAt.toISOString(), now.toISOString())
    .run()

  return { token, expiresAt }
}

export async function getAuthSessionByToken(db: D1Database, config: AuthConfig, token: string): Promise<AuthSession | null> {
  if (!config.authSecret || !token) return null

  const tokenHash = await hashSessionToken(config, token)
  const now = new Date().toISOString()
  const row = await db
    .prepare(
      `
        SELECT
          id,
          user_id AS userId,
          created_at AS createdAt,
          expires_at AS expiresAt,
          last_seen_at AS lastSeenAt
        FROM auth_sessions
        WHERE token_hash = ? AND expires_at > ?
        LIMIT 1
      `,
    )
    .bind(tokenHash, now)
    .first<AuthSessionRow>()

  return row
    ? {
        id: row.id,
        userId: row.userId,
        createdAt: row.createdAt,
        expiresAt: row.expiresAt,
        lastSeenAt: row.lastSeenAt,
      }
    : null
}

export async function getCurrentAuthSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value
  if (!token) return null

  const [db, config] = await Promise.all([getD1Database().catch(() => null), getAuthConfig()])
  if (!db) return null

  return getAuthSessionByToken(db, config, token)
}

export async function deleteAuthSessionByToken(db: D1Database, config: AuthConfig, token: string): Promise<void> {
  if (!config.authSecret || !token) return

  const tokenHash = await hashSessionToken(config, token)
  await db.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').bind(tokenHash).run()
}

export async function cleanupExpiredAuthSessions(db: D1Database): Promise<void> {
  await db.prepare('DELETE FROM auth_sessions WHERE expires_at <= ?').bind(new Date().toISOString()).run()
}

export async function loginAttemptKey(config: AuthConfig, username: string, clientId: string): Promise<string> {
  if (!config.authSecret) throw new Error('READO_AUTH_SECRET is not configured')
  return sha256Hex(`login:${config.authSecret}:${username.trim().toLowerCase()}:${clientId}`)
}

export async function getActiveLoginLock(db: D1Database, key: string): Promise<string | null> {
  const row = await db
    .prepare(
      `
        SELECT
          failed_count AS failedCount,
          window_started_at AS windowStartedAt,
          locked_until AS lockedUntil
        FROM auth_login_attempts
        WHERE key = ?
        LIMIT 1
      `,
    )
    .bind(key)
    .first<LoginAttemptRow>()

  if (!row?.lockedUntil) return null
  return Date.parse(row.lockedUntil) > Date.now() ? row.lockedUntil : null
}

export async function recordFailedLoginAttempt(db: D1Database, key: string): Promise<LoginFailureResult> {
  const now = new Date()
  const row = await db
    .prepare(
      `
        SELECT
          failed_count AS failedCount,
          window_started_at AS windowStartedAt,
          locked_until AS lockedUntil
        FROM auth_login_attempts
        WHERE key = ?
        LIMIT 1
      `,
    )
    .bind(key)
    .first<LoginAttemptRow>()

  const windowExpired = !row || Date.parse(row.windowStartedAt) + LOGIN_WINDOW_MS <= now.getTime()
  const failedCount = windowExpired ? 1 : Number(row.failedCount ?? 0) + 1
  const lockedUntil = failedCount >= LOGIN_MAX_FAILURES ? new Date(now.getTime() + LOGIN_LOCK_MS).toISOString() : null
  const windowStartedAt = windowExpired ? now.toISOString() : row.windowStartedAt

  await db
    .prepare(
      `
        INSERT INTO auth_login_attempts (key, failed_count, window_started_at, locked_until, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          failed_count = excluded.failed_count,
          window_started_at = excluded.window_started_at,
          locked_until = excluded.locked_until,
          updated_at = excluded.updated_at
      `,
    )
    .bind(key, failedCount, windowStartedAt, lockedUntil, now.toISOString())
    .run()

  return { failedCount, lockedUntil }
}

export async function clearLoginAttempts(db: D1Database, key: string): Promise<void> {
  await db.prepare('DELETE FROM auth_login_attempts WHERE key = ?').bind(key).run()
}
