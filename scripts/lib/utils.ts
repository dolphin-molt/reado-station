/**
 * Shared utilities for reado-station scripts
 */
import { execSync, exec } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import dayjs from 'dayjs'

// ─── Types ───────────────────────────────────────────────────────────

export interface CollectedData {
  fetchedAt: string
  stats: {
    totalSources: number
    successSources: number
    failedSources: number
    totalItems: number
    deduplicatedItems: number
  }
  items: InfoItem[]
}

export interface InfoItem {
  title: string
  url: string
  summary: string
  publishedAt: string
  source: string
  sourceName: string
}

export interface CollectionResult {
  name: string
  success: boolean
  items: InfoItem[]
  error?: string
  duration: number
}

export interface StationConfig {
  language: 'zh' | 'en' | 'bilingual'
  sync: 'none' | 'feishu'
  sync_config: Record<string, string>
  schedule: string | null
}

// ─── Paths ───────────────────────────────────────────────────────────

export function getProjectRoot(): string {
  return join(import.meta.dirname, '..', '..')
}

export function getDataDir(batch: 'morning' | 'evening' = getBatch()): string {
  const date = dayjs().format('YYYY/MM/DD')
  const dir = join(getProjectRoot(), 'data', date, batch)
  mkdirSync(dir, { recursive: true })
  return dir
}

export function getBatch(): 'morning' | 'evening' {
  const hour = dayjs().hour()
  return hour < 14 ? 'morning' : 'evening'
}

export function getConfigDir(): string {
  return join(getProjectRoot(), 'config')
}

export function getPromptsDir(): string {
  return join(getProjectRoot(), 'prompts')
}

// ─── CLI Helpers ─────────────────────────────────────────────────────

/**
 * Check if a CLI tool is available
 */
export function isCommandAvailable(cmd: string): boolean {
  try {
    execSync(`which ${cmd}`, { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

/**
 * Run a shell command and return stdout as string
 */
export function runCommand(cmd: string, options?: {
  timeout?: number
  cwd?: string
}): string {
  const timeout = options?.timeout ?? 120_000 // 2 min default
  return execSync(cmd, {
    timeout,
    cwd: options?.cwd,
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024, // 50MB
    stdio: ['pipe', 'pipe', 'pipe'],
  })
}

/**
 * Run a shell command asynchronously
 */
export function runCommandAsync(cmd: string, options?: {
  timeout?: number
  cwd?: string
}): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = exec(cmd, {
      timeout: options?.timeout ?? 120_000,
      cwd: options?.cwd,
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024,
    }, (error, stdout, stderr) => {
      if (error) {
        reject(Object.assign(error, { stdout, stderr }))
      } else {
        resolve({ stdout, stderr })
      }
    })
  })
}

// ─── File Helpers ────────────────────────────────────────────────────

export function readJSON<T>(path: string): T | null {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    return null
  }
}

export function writeJSON(path: string, data: unknown): void {
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8')
}

export function readText(path: string): string {
  try {
    return readFileSync(path, 'utf-8')
  } catch {
    return ''
  }
}

export function writeText(path: string, content: string): void {
  writeFileSync(path, content, 'utf-8')
}

// ─── Data Processing ─────────────────────────────────────────────────

/**
 * Deduplicate items by URL (keep first occurrence)
 */
export function deduplicateItems(items: InfoItem[]): {
  items: InfoItem[]
  removedCount: number
} {
  const seen = new Set<string>()
  const unique: InfoItem[] = []
  let removedCount = 0

  for (const item of items) {
    // Normalize URL for comparison
    const normalizedUrl = item.url
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
      .toLowerCase()

    if (!seen.has(normalizedUrl)) {
      seen.add(normalizedUrl)
      unique.push(item)
    } else {
      removedCount++
    }
  }

  return { items: unique, removedCount }
}

/**
 * Categorize items by source type for report sections
 */
export function categorizeItems(items: InfoItem[]): {
  news: InfoItem[]        // AI公司 + 科技媒体 → 重大新闻 + 公司动态
  twitter: InfoItem[]     // Twitter → Twitter/X 精选
  opensource: InfoItem[]   // GitHub + arXiv + HuggingFace → 论文与开源
  community: InfoItem[]   // HN + Reddit + V2EX → 社区热点
} {
  const news: InfoItem[] = []
  const twitter: InfoItem[] = []
  const opensource: InfoItem[] = []
  const community: InfoItem[] = []

  for (const item of items) {
    const src = item.source.toLowerCase()

    if (src.includes('twitter') || src.includes('nitter') || src.startsWith('tw-')) {
      twitter.push(item)
    } else if (
      src.includes('github') ||
      src.includes('arxiv') ||
      src.includes('huggingface') ||
      src.includes('hf-')
    ) {
      opensource.push(item)
    } else if (
      src.includes('hackernews') || src.includes('hn') ||
      src.includes('reddit') ||
      src.includes('v2ex') ||
      src.includes('lobsters') ||
      src.includes('devto')
    ) {
      community.push(item)
    } else {
      news.push(item)
    }
  }

  return { news, twitter, opensource, community }
}

// ─── Logging ─────────────────────────────────────────────────────────

export const log = {
  info: (msg: string) => console.log(`ℹ️  ${msg}`),
  success: (msg: string) => console.log(`✅ ${msg}`),
  warn: (msg: string) => console.log(`⚠️  ${msg}`),
  error: (msg: string) => console.error(`❌ ${msg}`),
  step: (msg: string) => console.log(`\n📌 ${msg}`),
  data: (label: string, value: unknown) => console.log(`   ${label}: ${JSON.stringify(value)}`),
}
