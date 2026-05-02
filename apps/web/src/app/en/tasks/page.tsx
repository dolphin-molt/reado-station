import type { Metadata } from 'next'

import { TasksPage } from '@/components/pages/TasksPage'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Tasks | reado',
}

export default function EnTasksRoute() {
  return <TasksPage lang="en" />
}
