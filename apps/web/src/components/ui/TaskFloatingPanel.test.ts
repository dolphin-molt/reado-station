import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { TaskFloatingPanel } from './TaskFloatingPanel'

describe('TaskFloatingPanel', () => {
  it('renders tasks as a compact status-icon list without card blocks', () => {
    const html = renderToStaticMarkup(createElement(TaskFloatingPanel, {
      lang: 'zh',
      tasks: [
        {
          id: 'collect-1',
          status: 'running',
          subject: '@elonmusk',
          title: '内容采集',
        },
        {
          id: 'profile-1',
          status: 'queued',
          subject: '@OpenAI',
          title: '主页补全',
        },
        {
          id: 'done-1',
          status: 'completed',
          subject: '今日电台',
          title: '电台生成',
        },
      ],
    }))

    expect(html).toContain('class="task-floating"')
    expect(html).toContain('class="task-floating-trigger"')
    expect(html).toContain('aria-label="任务"')
    expect(html).toContain('进行中的任务')
    expect(html).toContain('内容采集')
    expect(html).toContain('@elonmusk')
    expect(html).toContain('运行中')
    expect(html).toContain('等待中')
    expect(html).toContain('已完成')
    expect(html).toContain('class="task-floating-list__row"')
    expect(html).toContain('class="task-floating-status-icon task-floating-status-icon--running"')
    expect(html).toContain('class="task-floating-status-icon task-floating-status-icon--queued"')
    expect(html).toContain('class="task-floating-status-icon task-floating-status-icon--completed"')
    expect(html).toContain('class="task-floating-trigger__badge"')
    expect(html).not.toContain('task-floating-list__item')
    expect(html).not.toContain('status-pill')
    expect(html).not.toContain('href="/tasks"')
    expect(html).not.toContain('查看')
  })

  it('keeps the popup empty state concise', () => {
    const html = renderToStaticMarkup(createElement(TaskFloatingPanel, {
      lang: 'zh',
      tasks: [],
    }))

    expect(html).toContain('没有进行中的任务')
    expect(html).not.toContain('class="task-floating-trigger__badge"')
  })
})
