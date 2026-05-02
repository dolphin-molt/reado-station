import Link from 'next/link'

import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { ProcessingQueueAutoRefresh } from '@/components/ui/ProcessingQueueAutoRefresh'
import { getCurrentAuthSession } from '@/lib/auth'
import { getD1Binding } from '@/lib/cloudflare'
import { localizedPath, type Lang } from '@/lib/i18n'
import { loadWorkspaceTasks, type Task, type TaskKind } from '@/lib/tasks'
import { getDefaultWorkspaceForUser } from '@/lib/workspaces'

function taskStatusLabel(status: string, lang: Lang): string {
  if (status === 'running') return lang === 'zh' ? '运行中' : 'Running'
  return lang === 'zh' ? '排队中' : 'Queued'
}

function taskKindLabel(kind: TaskKind, fallback: string, lang: Lang): string {
  if (lang === 'zh') return fallback
  if (kind === 'source-collection') return 'Content collection'
  if (kind === 'profile-enrichment') return 'Profile enrichment'
  if (kind === 'radio') return 'Radio generation'
  return 'Backfill'
}

function formatTaskTime(value: string, lang: Lang): string {
  return new Date(value).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function TaskItem({ lang, task }: { lang: Lang; task: Task }) {
  return (
    <article className="task-list__item">
      <div>
        <div className="admin-item__meta">
          <span className={task.status === 'running' ? 'status-pill status-pill--ok' : 'status-pill'}>{taskStatusLabel(task.status, lang)}</span>
          <span>{formatTaskTime(task.updatedAt || task.createdAt, lang)}</span>
        </div>
        <h2>{taskKindLabel(task.kind, task.title, lang)}</h2>
        <p>{task.subject}</p>
      </div>
      <Link className="table-link" href={task.href}>
        {lang === 'zh' ? '查看' : 'View'}
      </Link>
    </article>
  )
}

export async function TasksPage({ lang }: { lang: Lang }) {
  const session = await getCurrentAuthSession()
  const loginPath = `${localizedPath(lang, 'login')}?next=${encodeURIComponent(localizedPath(lang, 'tasks'))}`

  if (!session) {
    return (
      <div className="page-shell reader-shell">
        <Header active="tasks" lang={lang} path="tasks" showSourceFilter={false} />
        <main className="container section-stack">
          <section className="panel panel--narrow">
            <h1>{lang === 'zh' ? '任务' : 'Tasks'}</h1>
            <p>{lang === 'zh' ? '登录后查看正在处理的信息源、主页补全和电台任务。' : 'Sign in to view active source, profile, and radio jobs.'}</p>
            <Link className="nav-button" href={loginPath}>{lang === 'zh' ? '登录' : 'Sign in'}</Link>
          </section>
        </main>
        <Footer lang={lang} />
      </div>
    )
  }

  const db = await getD1Binding().catch(() => null)
  const workspace = db ? await getDefaultWorkspaceForUser(db, session.userId, session.username) : null
  const tasks = db && workspace ? await loadWorkspaceTasks(db, workspace.id) : []

  return (
    <div className="page-shell reader-shell">
      <Header active="tasks" lang={lang} path="tasks" showSourceFilter={false} />
      <main className="container section-stack">
        <section className="panel task-board">
          {tasks.length > 0 && <ProcessingQueueAutoRefresh />}
          <div className="panel__header">
            <div>
              <h1>{lang === 'zh' ? '任务' : 'Tasks'}</h1>
              <p>{lang === 'zh' ? '正在处理的信息源、主页补全和电台任务。' : 'Active source, profile, and radio jobs.'}</p>
            </div>
            <Link className="secondary-button" href={localizedPath(lang, 'tasks')}>
              {lang === 'zh' ? '刷新' : 'Refresh'}
            </Link>
          </div>

          {tasks.length > 0 ? (
            <div className="task-list">
              {tasks.map((task) => <TaskItem key={`${task.kind}-${task.id}`} lang={lang} task={task} />)}
            </div>
          ) : (
            <div className="empty-state task-board__empty">
              {lang === 'zh' ? '当前没有正在处理的任务。' : 'No active tasks right now.'}
            </div>
          )}
        </section>
      </main>
      <Footer lang={lang} />
    </div>
  )
}
