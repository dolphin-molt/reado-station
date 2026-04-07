/**
 * 加载 agent 配置，自动合并 local 覆盖、解析路径、发现 reado 位置。
 * 跨平台：Mac / Linux / Windows 均可用。
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, join, dirname } from 'node:path'
import { homedir } from 'node:os'
import { execSync } from 'node:child_process'

const PROJECT_ROOT = resolve(dirname(new URL(import.meta.url).pathname), '../..')

function deepMerge(target: any, source: any): any {
  const result = { ...target }
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key])
    } else {
      result[key] = source[key]
    }
  }
  return result
}

function expandPath(p: string): string {
  if (!p) return p
  return p.replace(/^~/, homedir()).replace(/\//g, join('a', 'b').charAt(1))
}

function discoverReadoPath(): string {
  // 1. 环境变量
  if (process.env.READO_DIR) return process.env.READO_DIR

  // 2. npm global 包目录
  try {
    const npmRoot = execSync('npm root -g', { encoding: 'utf-8' }).trim()
    const readoPkg = join(npmRoot, '@dolphin-molt', 'reado')
    if (existsSync(readoPkg)) return readoPkg
  } catch {}

  // 3. 同级目录（常见本地开发布局）
  const sibling = resolve(PROJECT_ROOT, '../reado')
  if (existsSync(join(sibling, 'config/default-sources.json'))) return sibling

  return ''
}

export interface AgentConfig {
  env: {
    extraPaths: string[]
  }
  paths: {
    station: string
    reado: string
    twitterWatchlist: string
    dailyOutput: string
  }
  github: { repo: string; readoRepo: string; siteUrl: string; feedbackLabel: string }
  collect: { defaultMode: string; morningBefore: number; schedule: { morning: string; evening: string } }
  translate: { provider: string; model: string; envKey: string; batchSize: number; concurrency: number; timeout: number }
  sourceHealth: { maxConsecutiveFailures: number; autoDisable: boolean }
  limits: { completedActionsKeep: number; recentGapsKeep: number; incidentsKeep: number }
  heal: { recurringThreshold: number; escalateLabel: string }
  lark: { cli: string; chatId: string; chatName: string }
}

export function loadConfig(): AgentConfig {
  // 读取 base 配置
  const basePath = join(PROJECT_ROOT, 'agent.config.json')
  let config = JSON.parse(readFileSync(basePath, 'utf-8'))

  // 合并 local 覆盖
  const localPath = join(PROJECT_ROOT, 'agent.config.local.json')
  if (existsSync(localPath)) {
    const local = JSON.parse(readFileSync(localPath, 'utf-8'))
    config = deepMerge(config, local)
  }

  // 注入额外 PATH（在解析路径之前，这样后续 which/execSync 都能找到工具）
  if (config.env?.extraPaths?.length) {
    const sep = process.platform === 'win32' ? ';' : ':'
    const expanded = config.env.extraPaths.map((p: string) => expandPath(p))
    const currentPath = process.env.PATH || ''
    const missing = expanded.filter((p: string) => !currentPath.includes(p))
    if (missing.length) {
      process.env.PATH = [...missing, currentPath].join(sep)
    }
  }

  // 解析 station 路径
  config.paths.station = config.paths.station === '.'
    ? PROJECT_ROOT
    : expandPath(config.paths.station)

  // 解析其他路径
  config.paths.twitterWatchlist = expandPath(config.paths.twitterWatchlist)
  config.paths.dailyOutput = expandPath(config.paths.dailyOutput)

  // 发现 reado 路径
  if (!config.paths.reado) {
    config.paths.reado = discoverReadoPath()
  } else {
    config.paths.reado = expandPath(config.paths.reado)
  }

  if (!config.paths.reado) {
    console.warn('[load-config] ⚠️ 未找到 reado 安装路径。source-request 功能不可用。设置 READO_DIR 环境变量或在 agent.config.local.json 中配置 paths.reado')
  }

  // 发现 lark-cli 路径（如果只写了命令名，尝试解析完整路径）
  if (config.lark.cli === 'lark-cli') {
    try {
      const which = process.platform === 'win32' ? 'where' : 'which'
      config.lark.cli = execSync(`${which} lark-cli`, { encoding: 'utf-8' }).trim().split('\n')[0]
    } catch {
      // 保持 'lark-cli'，运行时再报错
    }
  }

  return config
}

/**
 * 获取当前 batch（morning/evening）
 */
export function getCurrentBatch(config: AgentConfig): 'morning' | 'evening' {
  return new Date().getHours() < config.collect.morningBefore ? 'morning' : 'evening'
}

/**
 * 获取今日数据路径
 */
export function getTodayDataPath(config: AgentConfig, batch?: string): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const b = batch || getCurrentBatch(config)
  return join(config.paths.station, 'data', String(y), m, d, b)
}
