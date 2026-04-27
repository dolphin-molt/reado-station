import 'server-only'

import { PLAN_LIMITS, normalizePlanId, type PlanId } from '@/lib/plans'

export interface Workspace {
  id: string
  name: string
  slug: string
  type: 'personal' | 'team'
  ownerUserId: string
  planId: PlanId
  createdAt: string
  updatedAt: string
}

interface WorkspaceRow {
  id: string
  name: string
  slug: string
  type: string
  ownerUserId: string
  planId: string | null
  createdAt: string
  updatedAt: string
}

function rowToWorkspace(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    type: row.type === 'team' ? 'team' : 'personal',
    ownerUserId: row.ownerUserId,
    planId: normalizePlanId(row.planId),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function slugBase(username: string): string {
  const normalized = username.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '')
  return normalized || `user-${crypto.randomUUID().slice(0, 8)}`
}

async function uniqueWorkspaceSlug(db: D1Database, username: string): Promise<string> {
  const base = slugBase(username)
  for (let index = 0; index < 20; index += 1) {
    const slug = index === 0 ? base : `${base}-${index + 1}`
    const row = await db.prepare('SELECT id FROM workspaces WHERE slug = ? LIMIT 1').bind(slug).first<{ id: string }>()
    if (!row) return slug
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`
}

export async function ensurePersonalWorkspace(db: D1Database, userId: string, username: string): Promise<Workspace> {
  const existing = await db
    .prepare(
      `
        SELECT
          w.id,
          w.name,
          w.slug,
          w.type,
          w.owner_user_id AS ownerUserId,
          w.plan_id AS planId,
          w.created_at AS createdAt,
          w.updated_at AS updatedAt
        FROM workspaces w
        INNER JOIN workspace_members m ON m.workspace_id = w.id
        WHERE m.user_id = ? AND w.type = 'personal'
        ORDER BY w.created_at ASC
        LIMIT 1
      `,
    )
    .bind(userId)
    .first<WorkspaceRow>()

  if (existing) return rowToWorkspace(existing)

  const now = new Date().toISOString()
  const workspace: Workspace = {
    id: crypto.randomUUID(),
    name: `${username}'s workspace`,
    slug: await uniqueWorkspaceSlug(db, username),
    type: 'personal',
    ownerUserId: userId,
    planId: 'free',
    createdAt: now,
    updatedAt: now,
  }

  await db.batch([
    db
      .prepare(
        `
          INSERT INTO workspaces (id, name, slug, type, owner_user_id, plan_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .bind(workspace.id, workspace.name, workspace.slug, workspace.type, workspace.ownerUserId, workspace.planId, now, now),
    db
      .prepare(
        `
          INSERT INTO workspace_members (workspace_id, user_id, role, created_at)
          VALUES (?, ?, 'owner', ?)
        `,
      )
      .bind(workspace.id, userId, now),
    db.prepare('UPDATE auth_users SET default_workspace_id = ?, updated_at = ? WHERE id = ?').bind(workspace.id, now, userId),
    db
      .prepare(
        `
          INSERT INTO credit_ledger (id, workspace_id, user_id, action, credits_delta, metadata_json, created_at)
          VALUES (?, ?, ?, 'monthly_grant', ?, ?, ?)
        `,
      )
      .bind(crypto.randomUUID(), workspace.id, userId, PLAN_LIMITS.free.monthlyCredits, JSON.stringify({ plan: 'free', reason: 'workspace_created' }), now),
  ])

  return workspace
}

export async function getDefaultWorkspaceForUser(db: D1Database, userId: string, username: string): Promise<Workspace> {
  try {
    const row = await db
      .prepare(
        `
          SELECT
            w.id,
            w.name,
            w.slug,
            w.type,
            w.owner_user_id AS ownerUserId,
            w.plan_id AS planId,
            w.created_at AS createdAt,
            w.updated_at AS updatedAt
          FROM auth_users u
          INNER JOIN workspaces w ON w.id = u.default_workspace_id
          INNER JOIN workspace_members m ON m.workspace_id = w.id AND m.user_id = u.id
          WHERE u.id = ?
          LIMIT 1
        `,
      )
      .bind(userId)
      .first<WorkspaceRow>()
    if (row) return rowToWorkspace(row)
  } catch {
    // Fall through for environments that have not applied the V1 migration.
  }

  return ensurePersonalWorkspace(db, userId, username)
}

export async function getWorkspaceCreditBalance(db: D1Database, workspaceId: string): Promise<number> {
  const row = await db
    .prepare('SELECT COALESCE(SUM(credits_delta), 0) AS balance FROM credit_ledger WHERE workspace_id = ?')
    .bind(workspaceId)
    .first<{ balance: number | null }>()
  return Number(row?.balance ?? 0)
}

export async function getWorkspaceSourceCount(db: D1Database, workspaceId: string): Promise<number> {
  const row = await db
    .prepare('SELECT COUNT(1) AS total FROM workspace_source_subscriptions WHERE workspace_id = ?')
    .bind(workspaceId)
    .first<{ total: number | null }>()
  return Number(row?.total ?? 0)
}
