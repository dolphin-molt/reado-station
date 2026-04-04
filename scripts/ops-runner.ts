/**
 * ops-runner — 运营循环的机械骨架
 *
 * 把 9 Phase 中不需要 LLM 判断力的部分固化为代码。
 * Agent 只需调用这个脚本，然后处理它输出的"决策请求"。
 *
 * Usage:
 *   npx tsx scripts/ops-runner.ts restore     # Phase 1
 *   npx tsx scripts/ops-runner.ts collect      # Phase 2
 *   npx tsx scripts/ops-runner.ts analyze      # Phase 3（输出分析报告，Agent 决策）
 *   npx tsx scripts/ops-runner.ts build        # Phase 6
 *   npx tsx scripts/ops-runner.ts persist      # Phase 7
 *   npx tsx scripts/ops-runner.ts publish      # Phase 8（git 部分）
 *   npx tsx scripts/ops-runner.ts publish-lark # Phase 8（飞书部分）
 *
 * 不包含的 Phase（需要 LLM）：
 *   Phase 4 FEEDBACK — Agent 自己处理 Issue
 *   Phase 5 GENERATE — Agent 自己写日报
 *   Phase 9 HEAL     — Agent 自己诊断修复
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'
import { loadConfig, getCurrentBatch, getTodayDataPath } from './lib/load-config.js'

const config = loadConfig()
const batch = getCurrentBatch(config)
const stationDir = config.paths.station
const phase = process.argv[2]

// ─── Helpers ───

function readJSON(path: string): any {
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, 'utf-8'))
}

function writeJSON(path: string, data: any) {
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf-8')
}

function run(cmd: string, cwd?: string): string {
  try {
    return execSync(cmd, { cwd: cwd || stationDir, encoding: 'utf-8', timeout: 600_000 })
  } catch (e: any) {
    return `ERROR: ${e.message}\n${e.stderr || ''}`
  }
}

function datePath() { return getTodayDataPath(config, batch) }
function opsStatePath() { return join(stationDir, 'data', 'ops-state.json') }

// ─── Phase 1: RESTORE ───
function restore() {
  const state = readJSON(opsStatePath())
  if (!state) {
    console.log(JSON.stringify({
      phase: 'RESTORE',
      status: 'empty',
      message: 'ops-state.json 不存在，首次运行',
      batch,
      config: { repo: config.github.repo, siteUrl: config.github.siteUrl }
    }, null, 2))
    return
  }
  console.log(JSON.stringify({
    phase: 'RESTORE',
    status: 'ok',
    batch,
    lastUpdated: state.lastUpdated,
    totalRuns: state.stats?.totalRuns || 0,
    pendingActions: state.pendingActions?.length || 0,
    recentFailures: state.recentFailures?.length || 0,
    unresolvedGaps: state.recentGaps?.filter((g: any) => g.status === 'pending').length || 0,
    config: { repo: config.github.repo, siteUrl: config.github.siteUrl }
  }, null, 2))
}

// ─── Phase 2: COLLECT ───
function collect() {
  console.log(JSON.stringify({ phase: 'COLLECT', status: 'running', mode: config.collect.defaultMode, batch }))
  const output = run(`npx tsx scripts/collect.ts --mode ${config.collect.defaultMode}`)
  const rawPath = join(datePath(), 'raw.json')
  if (existsSync(rawPath)) {
    const raw = readJSON(rawPath)
    console.log(JSON.stringify({
      phase: 'COLLECT',
      status: 'ok',
      rawPath,
      items: raw?.items?.length || 0,
      stats: raw?.stats || {},
      batch
    }, null, 2))
  } else {
    console.log(JSON.stringify({
      phase: 'COLLECT',
      status: 'error',
      error: `raw.json not found at ${rawPath}`,
      output: output.slice(0, 500)
    }, null, 2))
  }
}

// ─── Phase 3: ANALYZE (机械部分：统计 + 输出报告，Agent 决策) ───
function analyze() {
  const rawPath = join(datePath(), 'raw.json')
  const raw = readJSON(rawPath)
  if (!raw) {
    console.log(JSON.stringify({ phase: 'ANALYZE', status: 'skip', reason: 'no raw.json' }))
    return
  }
  const state = readJSON(opsStatePath()) || { sourceHealth: {}, pendingActions: [], recentGaps: [] }

  // 源健康统计
  const failedIds: string[] = raw.stats?.failedSourceIds || []
  const successIds: string[] = raw.stats?.successSourceIds || raw.items
    ?.map((i: any) => i.source)
    .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i) || []

  const healthUpdates: any[] = []
  for (const id of failedIds) {
    const h = state.sourceHealth[id] || { consecutiveFailures: 0 }
    h.consecutiveFailures += 1
    h.lastFailure = new Date().toISOString()
    state.sourceHealth[id] = h
    healthUpdates.push({
      sourceId: id,
      consecutiveFailures: h.consecutiveFailures,
      needsDisable: h.consecutiveFailures >= config.sourceHealth.maxConsecutiveFailures
    })
  }
  for (const id of successIds) {
    if (state.sourceHealth[id]?.consecutiveFailures > 0) {
      state.sourceHealth[id].consecutiveFailures = 0
      state.sourceHealth[id].lastSuccess = new Date().toISOString()
      healthUpdates.push({ sourceId: id, recovered: true })
    }
  }

  // 分类统计
  const categories: Record<string, number> = {}
  for (const item of raw.items || []) {
    const cat = item.category || item.source || 'unknown'
    categories[cat] = (categories[cat] || 0) + 1
  }

  console.log(JSON.stringify({
    phase: 'ANALYZE',
    status: 'ok',
    totalItems: raw.items?.length || 0,
    failedSources: failedIds.length,
    healthUpdates,
    categories,
    pendingActions: state.pendingActions?.length || 0,
    // Agent 决策点：
    needsAgentDecision: healthUpdates.some(h => h.needsDisable) || state.pendingActions?.length > 0,
    message: healthUpdates.some(h => h.needsDisable)
      ? '有源需要禁用，请加载 station-analyze 技能处理'
      : state.pendingActions?.length > 0
        ? '有待办需要执行，请加载 station-analyze 技能处理'
        : '一切正常，可跳过'
  }, null, 2))

  // 写回中间状态（sourceHealth 更新）
  writeJSON(opsStatePath(), state)
}

// ─── Phase 6: BUILD ───
function build() {
  console.log(JSON.stringify({ phase: 'BUILD', status: 'running' }))
  const output = run('npm run build:site')
  const hasError = output.includes('ERROR') || output.includes('error')
  console.log(JSON.stringify({
    phase: 'BUILD',
    status: hasError ? 'error' : 'ok',
    output: output.slice(-500)
  }, null, 2))
}

// ─── Phase 7: PERSIST ───
function persist() {
  const state = readJSON(opsStatePath()) || {
    sourceHealth: {}, recentFailures: [], recentGaps: [],
    pendingActions: [], completedActions: [], incidents: [],
    feedbackProcessed: [], stats: { totalRuns: 0 }
  }

  state.lastUpdated = new Date().toISOString()
  state.stats.totalRuns = (state.stats.totalRuns || 0) + 1

  // Trim arrays
  if (state.completedActions?.length > config.limits.completedActionsKeep) {
    state.completedActions = state.completedActions.slice(-config.limits.completedActionsKeep)
  }
  if (state.incidents?.length > config.limits.incidentsKeep) {
    state.incidents = state.incidents.slice(-config.limits.incidentsKeep)
  }
  if (state.recentGaps?.length > config.limits.recentGapsKeep) {
    state.recentGaps = state.recentGaps.slice(-config.limits.recentGapsKeep)
  }

  writeJSON(opsStatePath(), state)
  console.log(JSON.stringify({
    phase: 'PERSIST',
    status: 'ok',
    totalRuns: state.stats.totalRuns,
    pendingActions: state.pendingActions?.length || 0,
    incidents: state.incidents?.length || 0
  }, null, 2))
}

// ─── Phase 8: PUBLISH (git) ───
function publish() {
  const gitStatus = run('git status --porcelain')
  if (!gitStatus.trim()) {
    console.log(JSON.stringify({ phase: 'PUBLISH', status: 'skip', reason: 'nothing to commit' }))
    return
  }
  const now = new Date()
  const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
  run('git add data/ site/src/data/ site/public/images/')
  const commitMsg = `data: ${dateStr} ${batch} collection + digest`
  run(`git commit -m "${commitMsg}"`)
  const pushResult = run('git push')
  console.log(JSON.stringify({
    phase: 'PUBLISH',
    status: pushResult.includes('ERROR') ? 'error' : 'ok',
    commit: commitMsg,
    output: pushResult.slice(-300)
  }, null, 2))
}

// ─── Phase 8: PUBLISH (lark) ───
function publishLark() {
  const digestPath = join(datePath(), 'digest.md')
  if (!existsSync(digestPath)) {
    console.log(JSON.stringify({ phase: 'PUBLISH-LARK', status: 'skip', reason: 'no digest.md' }))
    return
  }

  // 检测 lark-cli
  let larkCli = config.lark.cli
  try {
    execSync(`${larkCli} --version`, { stdio: 'ignore' })
  } catch {
    console.log(JSON.stringify({ phase: 'PUBLISH-LARK', status: 'skip', reason: 'lark-cli not available' }))
    return
  }

  const content = readFileSync(digestPath, 'utf-8')
  // 飞书消息限制约 4000 字
  const truncated = content.length > 3800
    ? content.slice(0, 3800) + `\n\n📡 完整日报: ${config.github.siteUrl}`
    : content

  const result = run(`${larkCli} im +messages-send --chat-id "${config.lark.chatId}" --markdown "${truncated.replace(/"/g, '\\"')}"`)
  console.log(JSON.stringify({
    phase: 'PUBLISH-LARK',
    status: result.includes('ERROR') ? 'error' : 'ok',
    truncated: content.length > 3800,
    output: result.slice(-300)
  }, null, 2))
}

// ─── Dispatch ───
switch (phase) {
  case 'restore':      restore(); break
  case 'collect':      collect(); break
  case 'analyze':      analyze(); break
  case 'build':        build(); break
  case 'persist':      persist(); break
  case 'publish':      publish(); break
  case 'publish-lark': publishLark(); break
  default:
    console.log(JSON.stringify({
      error: `Unknown phase: ${phase}`,
      usage: 'npx tsx scripts/ops-runner.ts <restore|collect|analyze|build|persist|publish|publish-lark>'
    }))
    process.exit(1)
}
