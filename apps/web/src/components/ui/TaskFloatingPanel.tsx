'use client'

import { useId, useState } from 'react'

import type { Lang } from '@/lib/i18n'
import type { Task } from '@/lib/tasks'

export type FloatingTask = Pick<Task, 'id' | 'status' | 'subject' | 'title'>

interface TaskFloatingPanelProps {
  lang: Lang
  tasks: FloatingTask[]
  totalCount?: number
}

function taskStatusLabel(status: FloatingTask['status'], lang: Lang): string {
  if (status === 'running') return lang === 'zh' ? '运行中' : 'Running'
  return lang === 'zh' ? '排队中' : 'Queued'
}

function TasksIcon() {
  return (
    <svg
      aria-hidden="true"
      className="task-floating-trigger__icon"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path d="M7 7h10" />
      <path d="M7 12h6" />
      <path d="M7 17h9" />
      <path d="M4 7h.1" />
      <path d="M4 12h.1" />
      <path d="M4 17h.1" />
      <path d="M19 5.5v3" />
      <path d="M17.5 7h3" />
    </svg>
  )
}

export function TaskFloatingPanel({ lang, tasks, totalCount = tasks.length }: TaskFloatingPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const panelId = useId()
  const visibleTasks = tasks.slice(0, 5)
  const hiddenCount = Math.max(0, totalCount - visibleTasks.length)

  return (
    <div className="task-floating">
      <section
        aria-hidden={!isOpen}
        aria-labelledby={`${panelId}-title`}
        className="task-floating-popover"
        data-open={isOpen}
        id={panelId}
      >
        <div className="task-floating-popover__header">
          <h2 id={`${panelId}-title`}>{lang === 'zh' ? '进行中的任务' : 'Active tasks'}</h2>
          <button
            aria-label={lang === 'zh' ? '关闭任务弹窗' : 'Close tasks popup'}
            className="task-floating-popover__close"
            onClick={() => setIsOpen(false)}
            type="button"
          >
            ×
          </button>
        </div>

        {visibleTasks.length > 0 ? (
          <div className="task-floating-list">
            {visibleTasks.map((task) => (
              <article className="task-floating-list__item" key={task.id}>
                <span className={task.status === 'running' ? 'status-pill status-pill--ok' : 'status-pill'}>
                  {taskStatusLabel(task.status, lang)}
                </span>
                <div>
                  <strong>{task.title}</strong>
                  <p>{task.subject}</p>
                </div>
              </article>
            ))}
            {hiddenCount > 0 && (
              <p className="task-floating-list__more">
                {lang === 'zh' ? `还有 ${hiddenCount} 个任务` : `${hiddenCount} more tasks`}
              </p>
            )}
          </div>
        ) : (
          <p className="task-floating-popover__empty">
            {lang === 'zh' ? '没有进行中的任务' : 'No active tasks right now.'}
          </p>
        )}
      </section>

      <button
        aria-controls={panelId}
        aria-expanded={isOpen}
        aria-label={lang === 'zh' ? '任务' : 'Tasks'}
        className="task-floating-trigger"
        onClick={() => setIsOpen((current) => !current)}
        title={lang === 'zh' ? '任务' : 'Tasks'}
        type="button"
      >
        <TasksIcon />
        {totalCount > 0 && <span className="task-floating-trigger__badge">{totalCount}</span>}
      </button>
    </div>
  )
}
