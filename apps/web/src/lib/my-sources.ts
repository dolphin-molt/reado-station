import 'server-only'

import { channelSubtitle } from '@/lib/channel-catalog'
import { normalizeSourceType, type SourceType } from '@/lib/plans'

export interface WorkspaceSourceListItem {
  sourceId: string
  sourceType: SourceType
  name: string
  url: string
  status: string
  visibility: string
  backfillHours: number
  createdAt: string
  latestCollectedAt: string | null
  itemCount: number
}

interface WorkspaceSourceRow {
  sourceId: string
  sourceType: string
  name: string
  url: string | null
  status: string
  visibility: string
  backfillHours: number | null
  createdAt: string
  latestCollectedAt: string | null
  itemCount: number | null
}

function rowToWorkspaceSource(row: WorkspaceSourceRow): WorkspaceSourceListItem {
  const sourceType = normalizeSourceType(row.sourceType)
  return {
    sourceId: row.sourceId,
    sourceType,
    name: row.name,
    url: row.url ?? '',
    status: row.status,
    visibility: row.visibility,
    backfillHours: Number(row.backfillHours ?? 24),
    createdAt: row.createdAt,
    latestCollectedAt: row.latestCollectedAt,
    itemCount: Number(row.itemCount ?? 0),
  }
}

export async function loadWorkspaceSources(db: D1Database, workspaceId: string): Promise<WorkspaceSourceListItem[]> {
  let results: WorkspaceSourceRow[] = []
  try {
    const response = await db
      .prepare(
        `
          SELECT
            s.source_id AS sourceId,
            s.source_type AS sourceType,
            src.name,
            src.url,
            s.status,
            s.visibility,
            s.backfill_hours AS backfillHours,
            s.created_at AS createdAt,
            snap.collected_at AS latestCollectedAt,
            (SELECT COUNT(1) FROM items i WHERE i.hidden_at IS NULL AND lower(i.source) = lower(s.source_id)) AS itemCount
          FROM workspace_source_subscriptions s
          INNER JOIN sources src ON src.id = s.source_id
          LEFT JOIN source_collection_snapshots snap ON snap.source_id = s.source_id
          WHERE s.workspace_id = ?
          ORDER BY s.created_at DESC
        `,
      )
      .bind(workspaceId)
      .all<WorkspaceSourceRow>()
    results = response.results ?? []
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('source_collection_snapshots')) throw error
    const response = await db
      .prepare(
        `
          SELECT
            s.source_id AS sourceId,
            s.source_type AS sourceType,
            src.name,
            src.url,
            s.status,
            s.visibility,
            s.backfill_hours AS backfillHours,
            s.created_at AS createdAt,
            NULL AS latestCollectedAt,
            (SELECT COUNT(1) FROM items i WHERE i.hidden_at IS NULL AND lower(i.source) = lower(s.source_id)) AS itemCount
          FROM workspace_source_subscriptions s
          INNER JOIN sources src ON src.id = s.source_id
          WHERE s.workspace_id = ?
          ORDER BY s.created_at DESC
        `,
      )
      .bind(workspaceId)
      .all<WorkspaceSourceRow>()
    results = response.results ?? []
  }
  return results.map(rowToWorkspaceSource)
}

export function sourceDisplayUrl(source: Pick<WorkspaceSourceListItem, 'sourceType' | 'url' | 'sourceId'>): string {
  if (source.url) return source.url
  const value = source.sourceId.replace(/^tw-/i, '')
  return channelSubtitle({ type: source.sourceType, value })
}
