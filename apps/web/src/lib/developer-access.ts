export interface DeveloperAccessSession {
  role?: string | null
}

export function canViewExecutionLogs(
  session: DeveloperAccessSession | null,
  nodeEnv = process.env.NODE_ENV,
): boolean {
  if (!session) return false
  if (session.role === 'admin') return true
  return nodeEnv !== 'production'
}
