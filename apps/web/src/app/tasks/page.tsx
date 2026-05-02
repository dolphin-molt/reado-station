import type { Metadata } from 'next'

import { TasksPage } from '@/components/pages/TasksPage'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '任务 | reado',
}

export default function TasksRoute() {
  return <TasksPage lang="zh" />
}
