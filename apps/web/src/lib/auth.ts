import 'server-only'

import { cookies } from 'next/headers'

import { getCloudflareEnv, getD1Binding } from '@/lib/cloudflare'
import { constantTimeEqual, hashPassword, randomHex, sha256Hex, verifyPasswordHash } from '@/lib/security'
import { ensurePersonalWorkspace } from '@/lib/workspaces'

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
  username: string | null
  role: string | null
  createdAt: string
  expiresAt: string
  lastSeenAt: string
}

export interface AuthSession {
  id: string
  userId: string
  username: string
  role: string
  createdAt: string
  expiresAt: string
  lastSeenAt: string
}

interface AuthUserRow {
  id: string
  username: string
  email: string | null
  displayName: string | null
  avatarUrl: string | null
  defaultWorkspaceId: string | null
  passwordHash: string
  role: string
  createdAt: string
  updatedAt: string
  lastLoginAt: string | null
}

export interface AuthUser {
  id: string
  username: string
  email: string | null
  displayName: string | null
  avatarUrl: string | null
  defaultWorkspaceId: string | null
  role: string
  createdAt: string
  updatedAt: string
  lastLoginAt: string | null
}

export interface VerifiedLoginUser {
  id: string
  username: string
  role: string
}

export type OAuthProvider = 'google' | 'github'

export interface OAuthProfile {
  provider: OAuthProvider
  providerUserId: string
  email: string | null
  displayName: string
  avatarUrl: string | null
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

export async function createAuthSession(db: D1Database, config: AuthConfig, userId = ADMIN_USER_ID): Promise<{ token: string; expiresAt: Date }> {
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
    .bind(crypto.randomUUID(), tokenHash, userId, now.toISOString(), expiresAt.toISOString(), now.toISOString())
    .run()

  return { token, expiresAt }
}

export async function getAuthSessionByToken(db: D1Database, config: AuthConfig, token: string): Promise<AuthSession | null> {
  if (!config.authSecret || !token) return null

  const tokenHash = await hashSessionToken(config, token)
  const now = new Date().toISOString()
  let row: AuthSessionRow | null = null

  try {
    row = await db
      .prepare(
        `
          SELECT
            s.id,
            s.user_id AS userId,
            u.username AS username,
            u.role AS role,
            s.created_at AS createdAt,
            s.expires_at AS expiresAt,
            s.last_seen_at AS lastSeenAt
          FROM auth_sessions s
          LEFT JOIN auth_users u ON u.id = s.user_id
          WHERE s.token_hash = ? AND s.expires_at > ?
          LIMIT 1
        `,
      )
      .bind(tokenHash, now)
      .first<AuthSessionRow>()
  } catch {
    row = await db
      .prepare(
        `
          SELECT
            id,
            user_id AS userId,
            NULL AS username,
            NULL AS role,
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
  }

  return row
    ? {
        id: row.id,
        userId: row.userId,
        username: row.username ?? (row.userId === ADMIN_USER_ID ? config.adminUsername : row.userId),
        role: row.role ?? (row.userId === ADMIN_USER_ID ? 'admin' : 'member'),
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

  const [db, config] = await Promise.all([getD1Binding().catch(() => null), getAuthConfig()])
  if (!db) return null

  return getAuthSessionByToken(db, config, token)
}

export function isAdminPath(path: string): boolean {
  return path === '/admin' || path.startsWith('/admin/')
}

export function isAdminSession(session: AuthSession | null): session is AuthSession {
  return session?.role === 'admin'
}

export function safeNextPathForRole(path: string, role: string): string {
  return role === 'admin' || !isAdminPath(path) ? path : '/'
}

export async function getCurrentAdminSession(): Promise<AuthSession | null> {
  const session = await getCurrentAuthSession()
  return isAdminSession(session) ? session : null
}

export async function deleteAuthSessionByToken(db: D1Database, config: AuthConfig, token: string): Promise<void> {
  if (!config.authSecret || !token) return

  const tokenHash = await hashSessionToken(config, token)
  await db.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').bind(tokenHash).run()
}

export async function cleanupExpiredAuthSessions(db: D1Database): Promise<void> {
  await db.prepare('DELETE FROM auth_sessions WHERE expires_at <= ?').bind(new Date().toISOString()).run()
}

function rowToAuthUser(row: AuthUserRow): AuthUser {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    defaultWorkspaceId: row.defaultWorkspaceId,
    role: row.role,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastLoginAt: row.lastLoginAt,
  }
}

export async function getAuthUserByUsername(db: D1Database, username: string): Promise<(AuthUser & { passwordHash: string }) | null> {
  let row: AuthUserRow | null = null
  try {
    row = await db
      .prepare(
        `
          SELECT
            id,
            username,
            email,
            display_name AS displayName,
            avatar_url AS avatarUrl,
            default_workspace_id AS defaultWorkspaceId,
            password_hash AS passwordHash,
            role,
            created_at AS createdAt,
            updated_at AS updatedAt,
            last_login_at AS lastLoginAt
          FROM auth_users
          WHERE lower(username) = lower(?)
          LIMIT 1
        `,
      )
      .bind(username)
      .first<AuthUserRow>()
  } catch {
    return null
  }

  return row ? { ...rowToAuthUser(row), passwordHash: row.passwordHash } : null
}

export async function getAuthUserByEmail(db: D1Database, email: string): Promise<AuthUser | null> {
  const row = await db
    .prepare(
      `
        SELECT
          id,
          username,
          email,
          display_name AS displayName,
          avatar_url AS avatarUrl,
          default_workspace_id AS defaultWorkspaceId,
          password_hash AS passwordHash,
          role,
          created_at AS createdAt,
          updated_at AS updatedAt,
          last_login_at AS lastLoginAt
        FROM auth_users
        WHERE lower(email) = lower(?)
        LIMIT 1
      `,
    )
    .bind(email)
    .first<AuthUserRow>()

  return row ? rowToAuthUser(row) : null
}

export async function verifyLoginCredentials(db: D1Database, config: AuthConfig, username: string, password: string): Promise<VerifiedLoginUser | null> {
  const registeredUser = await getAuthUserByUsername(db, username)
  if (registeredUser && (await verifyPasswordHash(password, registeredUser.passwordHash))) {
    return {
      id: registeredUser.id,
      username: registeredUser.username,
      role: registeredUser.role,
    }
  }

  if (verifyAdminCredentials(config, username, password)) {
    return {
      id: ADMIN_USER_ID,
      username: config.adminUsername,
      role: 'admin',
    }
  }

  return null
}

export async function createRegisteredUser(db: D1Database, input: { username: string; password: string }): Promise<AuthUser> {
  const now = new Date().toISOString()
  const user: AuthUser = {
    id: crypto.randomUUID(),
    username: input.username,
    email: null,
    displayName: input.username,
    avatarUrl: null,
    defaultWorkspaceId: null,
    role: 'member',
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
  }
  const passwordHash = await hashPassword(input.password)

  await db
    .prepare(
      `
        INSERT INTO auth_users (id, username, email, display_name, avatar_url, password_hash, role, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .bind(user.id, user.username, user.email, user.displayName, user.avatarUrl, passwordHash, user.role, user.createdAt, user.updatedAt)
    .run()

  const workspace = await ensurePersonalWorkspace(db, user.id, user.username)
  user.defaultWorkspaceId = workspace.id

  return user
}

async function uniqueUsername(db: D1Database, baseValue: string): Promise<string> {
  const base = (baseValue || 'member').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^[^a-z0-9]+/, '').slice(0, 24) || 'member'
  for (let index = 0; index < 20; index += 1) {
    const username = index === 0 ? base : `${base}-${index + 1}`
    const existing = await getAuthUserByUsername(db, username)
    if (!existing) return username
  }
  return `${base.slice(0, 20)}-${randomHex(3)}`
}

export async function findUserByOAuthIdentity(db: D1Database, provider: OAuthProvider, providerUserId: string): Promise<AuthUser | null> {
  const row = await db
    .prepare(
      `
        SELECT
          u.id,
          u.username,
          u.email,
          u.display_name AS displayName,
          u.avatar_url AS avatarUrl,
          u.default_workspace_id AS defaultWorkspaceId,
          u.password_hash AS passwordHash,
          u.role,
          u.created_at AS createdAt,
          u.updated_at AS updatedAt,
          u.last_login_at AS lastLoginAt
        FROM auth_identities i
        INNER JOIN auth_users u ON u.id = i.user_id
        WHERE i.provider = ? AND i.provider_user_id = ?
        LIMIT 1
      `,
    )
    .bind(provider, providerUserId)
    .first<AuthUserRow>()

  return row ? rowToAuthUser(row) : null
}

export async function upsertOAuthUser(db: D1Database, profile: OAuthProfile, currentUserId?: string | null): Promise<AuthUser> {
  const now = new Date().toISOString()
  const identityUser = await findUserByOAuthIdentity(db, profile.provider, profile.providerUserId)
  let user = identityUser

  if (!user && currentUserId) {
    const row = await db
      .prepare(
        `
          SELECT
            id,
            username,
            email,
            display_name AS displayName,
            avatar_url AS avatarUrl,
            default_workspace_id AS defaultWorkspaceId,
            password_hash AS passwordHash,
            role,
            created_at AS createdAt,
            updated_at AS updatedAt,
            last_login_at AS lastLoginAt
          FROM auth_users
          WHERE id = ?
          LIMIT 1
        `,
      )
      .bind(currentUserId)
      .first<AuthUserRow>()
    user = row ? rowToAuthUser(row) : null
  }

  if (!user && profile.email) {
    user = await getAuthUserByEmail(db, profile.email)
  }

  if (!user) {
    const username = await uniqueUsername(db, profile.email?.split('@')[0] ?? profile.displayName)
    const created: AuthUser = {
      id: crypto.randomUUID(),
      username,
      email: profile.email,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      defaultWorkspaceId: null,
      role: 'member',
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
    }

    await db
      .prepare(
        `
          INSERT INTO auth_users (id, username, email, display_name, avatar_url, password_hash, role, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .bind(created.id, created.username, created.email, created.displayName, created.avatarUrl, '', created.role, now, now)
      .run()
    user = created
  } else {
    await db
      .prepare(
        `
          UPDATE auth_users
          SET
            email = COALESCE(email, ?),
            display_name = COALESCE(?, display_name),
            avatar_url = COALESCE(?, avatar_url),
            updated_at = ?
          WHERE id = ?
        `,
      )
      .bind(profile.email, profile.displayName, profile.avatarUrl, now, user.id)
      .run()
    user = { ...user, email: user.email ?? profile.email, displayName: profile.displayName ?? user.displayName, avatarUrl: profile.avatarUrl ?? user.avatarUrl }
  }

  await db
    .prepare(
      `
        INSERT INTO auth_identities (provider, provider_user_id, user_id, email, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(provider, provider_user_id) DO UPDATE SET
          user_id = excluded.user_id,
          email = excluded.email,
          updated_at = excluded.updated_at
      `,
    )
    .bind(profile.provider, profile.providerUserId, user.id, profile.email, now, now)
    .run()

  const workspace = await ensurePersonalWorkspace(db, user.id, user.username)
  return { ...user, defaultWorkspaceId: workspace.id }
}

export async function updateUserLastLogin(db: D1Database, userId: string): Promise<void> {
  if (userId === ADMIN_USER_ID) return
  const now = new Date().toISOString()
  await db.prepare('UPDATE auth_users SET last_login_at = ?, updated_at = ? WHERE id = ?').bind(now, now, userId).run()
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
