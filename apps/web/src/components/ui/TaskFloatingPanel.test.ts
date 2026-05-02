import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { TaskFloatingPanel } from './TaskFloatingPanel'

describe('TaskFloatingPanel', () => {
  it('renders a compact floating task popup without navigating to the tasks page', () => {
    const html = renderToStaticMarkup(createElement(TaskFloatingPanel, {
      lang: 'zh',
      tasks: [
        {
          id: 'collect-1',
          status: 'running',
          subject: '@elonmusk',
          title: '内容采集',
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
    expect(html).toContain('class="task-floating-trigger__badge"')
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
