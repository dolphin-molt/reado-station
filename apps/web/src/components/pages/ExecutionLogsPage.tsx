import type { ExecutionLogEntry } from '@/lib/execution-logs'

interface ExecutionLogsPageProps {
  filters: {
    runId: string
    scope: string
    status: string
    subjectId: string
  }
  logs: ExecutionLogEntry[]
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  })
}

function statusClass(status: string): string {
  if (status === 'completed') return 'status-pill status-pill--ok'
  if (status === 'failed') return 'status-pill'
  return 'status-pill status-pill--muted'
}

function metadataText(metadata: Record<string, unknown>): string {
  if (Object.keys(metadata).length === 0) return ''
  return JSON.stringify(metadata, null, 2)
}

export function ExecutionLogsPage({ filters, logs }: ExecutionLogsPageProps) {
  return (
    <>
      <div className="panel__header">
        <div>
          <p className="auth-card__eyebrow">Execution Logs</p>
          <h1>执行过程</h1>
        </div>
        <a className="secondary-button" href="/admin/execution-logs">
          刷新
        </a>
      </div>

      <form className="admin-filters admin-filters--wide" method="get">
        <input defaultValue={filters.runId} name="runId" placeholder="run id" type="search" />
        <input defaultValue={filters.subjectId} name="subjectId" placeholder="source / job / workspace id" type="search" />
        <select defaultValue={filters.scope} name="scope">
          <option value="">全部流程</option>
          <option value="subscription">Subscription</option>
          <option value="source-collection">Source collection</option>
          <option value="profile-enrichment">Profile enrichment</option>
          <option value="digest">Digest</option>
        </select>
        <select defaultValue={filters.status} name="status">
          <option value="">全部状态</option>
          <option value="started">Started</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="info">Info</option>
        </select>
        <button className="secondary-button" type="submit">
          筛选
        </button>
      </form>

      <div className="admin-item-list execution-log-list">
        {logs.map((log) => (
          <article className="admin-item execution-log-item" key={log.id}>
            <div>
              <div className="admin-item__meta">
                <span>{formatDateTime(log.createdAt)}</span>
                <span>{log.scope}</span>
                <span>{log.step}</span>
                <span className={statusClass(log.status)}>{log.status}</span>
                {log.durationMs != null && <span>{log.durationMs}ms</span>}
              </div>
              <h2>{log.runId}</h2>
              <small>
                subject: {log.subjectType ?? '-'} / {log.subjectId ?? '-'}
              </small>
              {log.message && <p>{log.message}</p>}
              {metadataText(log.metadata) && <pre className="execution-log-item__metadata">{metadataText(log.metadata)}</pre>}
            </div>
          </article>
        ))}
      </div>

      {logs.length === 0 && <div className="empty-state">还没有执行日志。</div>}
    </>
  )
}
