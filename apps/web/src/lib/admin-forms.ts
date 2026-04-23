import type { SourceInput } from '@/lib/admin-data'

export function formString(form: FormData, name: string): string {
  const value = form.get(name)
  return typeof value === 'string' ? value.trim() : ''
}

export function safeNextPath(value: string, fallback = '/admin'): string {
  if (!value.startsWith('/') || value.startsWith('//')) return fallback
  return value
}

function parseHours(value: string): number {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return 24
  return Math.min(Math.max(parsed, 1), 2160)
}

function parseList(value: string): string[] {
  if (!value) return []
  if (value.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(value) as unknown
      return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : []
    } catch {
      return []
    }
  }
  return value
    .split(/[\n,]/g)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function assertSourceId(id: string): void {
  if (!/^[a-z0-9][a-z0-9_.:-]{1,80}$/i.test(id)) {
    throw new Error('source id must be 2-81 characters and use letters, numbers, dot, underscore, colon or dash')
  }
}

export function sourceInputFromForm(form: FormData, fixedId?: string): SourceInput {
  const id = fixedId ?? formString(form, 'id')
  assertSourceId(id)

  const name = formString(form, 'name')
  const adapter = formString(form, 'adapter')
  if (!name) throw new Error('name is required')
  if (!adapter) throw new Error('adapter is required')

  return {
    id,
    name,
    adapter,
    url: formString(form, 'url'),
    hours: parseHours(formString(form, 'hours')),
    enabled: form.get('enabled') === 'on',
    category: formString(form, 'category'),
    topics: parseList(formString(form, 'topics')),
    fallbackAdapter: formString(form, 'fallbackAdapter'),
    fallbackUrl: formString(form, 'fallbackUrl'),
    googleNewsQuery: formString(form, 'googleNewsQuery'),
    command: parseList(formString(form, 'command')),
    strategy: formString(form, 'strategy'),
    searchable: form.get('searchable') === 'on',
    searchCommand: parseList(formString(form, 'searchCommand')),
  }
}
