import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ExecutionLogsPage } from './ExecutionLogsPage'

describe('ExecutionLogsPage', () => {
  it('renders recent program execution steps with filters and metadata', () => {
    const html = renderToStaticMarkup(createElement(ExecutionLogsPage, {
      filters: {
        runId: 'run-1',
        scope: 'source-collection',
        status: 'completed',
        subjectId: '',
      },
      logs: [{
        createdAt: '2026-05-02T10:00:00.000Z',
        durationMs: 35,
        id: 'log-1',
        message: 'Collected 3 items',
        metadata: { itemCount: 3 },
        runId: 'run-1',
        scope: 'source-collection',
        status: 'completed',
        step: 'persist_items',
        subjectId: 'tw-openai',
        subjectType: 'source',
      }],
    }))

    expect(html).toContain('执行过程')
    expect(html).toContain('source-collection')
    expect(html).toContain('persist_items')
    expect(html).toContain('Collected 3 items')
    expect(html).toContain('tw-openai')
    expect(html).toContain('&quot;itemCount&quot;: 3')
    expect(html).toContain('name="runId"')
    expect(html).toContain('value="run-1"')
  })
})
