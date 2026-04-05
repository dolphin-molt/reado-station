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
 *   npx tsx scripts/ops-runner.ts quality      # Phase 3.4（质量信号采集）
 *   npx tsx scripts/ops-runner.ts rollback     # 回滚到上次发布前
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
  // 翻译由 CI (deploy-site.yml) 负责，本地只做无翻译构建
  const output = run('npm run build:site-no-translate')
  const hasError = output.startsWith('ERROR')
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

  // 发布前打 tag，作为回滚锚点
  const tagName = `pre-publish/${dateStr}-${batch}`
  run(`git tag -f ${tagName}`)

  run('git add data/ site/src/data/ site/public/images/')
  const commitMsg = `data: ${dateStr} ${batch} collection + digest`
  const commitResult = run(`git commit -m "${commitMsg}"`)

  if (commitResult.includes('ERROR')) {
    // commit 失败，回滚到 tag
    run(`git reset --hard ${tagName}`)
    console.log(JSON.stringify({
      phase: 'PUBLISH',
      status: 'error',
      error: 'commit failed, rolled back',
      output: commitResult.slice(-300)
    }, null, 2))
    return
  }

  const pushResult = run('git push')
  if (pushResult.includes('ERROR')) {
    // push 失败，revert 这次 commit（保留在本地历史中）
    run('git revert --no-edit HEAD')
    console.log(JSON.stringify({
      phase: 'PUBLISH',
      status: 'error',
      error: 'push failed, commit reverted',
      rollbackTag: tagName,
      output: pushResult.slice(-300)
    }, null, 2))
    return
  }

  console.log(JSON.stringify({
    phase: 'PUBLISH',
    status: 'ok',
    commit: commitMsg,
    rollbackTag: tagName,
    output: pushResult.slice(-300)
  }, null, 2))
}

// ─── Rollback ───
function rollback() {
  // 找到最近的 pre-publish tag
  const tags = run('git tag -l "pre-publish/*" --sort=-creatordate').trim().split('\n').filter(Boolean)
  if (tags.length === 0) {
    console.log(JSON.stringify({ phase: 'ROLLBACK', status: 'error', error: 'no pre-publish tags found' }))
    return
  }
  const latestTag = tags[0]
  const currentHead = run('git rev-parse --short HEAD').trim()

  // revert 到 tag 对应的状态
  run(`git revert --no-edit ${latestTag}..HEAD`)
  const pushResult = run('git push')

  console.log(JSON.stringify({
    phase: 'ROLLBACK',
    status: pushResult.includes('ERROR') ? 'error' : 'ok',
    from: currentHead,
    to: latestTag,
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

  // 用 bot 身份发送（bot 发的消息才能查已读）
  const result = run(`${larkCli} im +messages-send --as bot --chat-id "${config.lark.chatId}" --markdown "${truncated.replace(/"/g, '\\"')}"`)

  // 从返回结果提取 message_id
  let messageId = ''
  try {
    const parsed = JSON.parse(result)
    messageId = parsed?.data?.message_id || ''
  } catch {
    // 尝试正则匹配
    const match = result.match(/"message_id"\s*:\s*"(om_[^"]+)"/)
    messageId = match?.[1] || ''
  }

  // 保存 message_id 到 ops-state，下次运行时可以查已读
  if (messageId) {
    const state = readJSON(opsStatePath()) || {}
    if (!state.qualitySignals) state.qualitySignals = {}
    state.qualitySignals.lastMessageId = messageId
    state.qualitySignals.lastMessageBatch = batch
    state.qualitySignals.lastMessageTime = new Date().toISOString()
    writeJSON(opsStatePath(), state)
  }

  console.log(JSON.stringify({
    phase: 'PUBLISH-LARK',
    status: result.startsWith('ERROR') ? 'error' : 'ok',
    messageId,
    truncated: content.length > 3800,
    output: result.slice(-300)
  }, null, 2))
}

// ─── Quality Signals ───
function quality() {
  const state = readJSON(opsStatePath()) || {}
  const signals = state.qualitySignals || {}
  const messageId = signals.lastMessageId

  // 1. 飞书消息已读
  let larkSignal: any = { available: false }
  if (messageId) {
    let larkCli = config.lark.cli
    try { execSync(`${larkCli} --version`, { stdio: 'ignore' }) } catch { larkCli = '' }

    if (larkCli) {
      // 查已读用户数
      const readResult = run(`${larkCli} im messages read_users --params '{"message_id":"${messageId}","user_id_type":"open_id"}' --page-all --format json`)
      let readCount = 0
      try {
        const parsed = JSON.parse(readResult)
        readCount = parsed?.data?.items?.length || 0
      } catch {}

      // 查群成员总数
      const memberResult = run(`${larkCli} im chat.members get --params '{"chat_id":"${config.lark.chatId}"}' --page-all --format json`)
      let memberTotal = 0
      try {
        const parsed = JSON.parse(memberResult)
        memberTotal = parsed?.data?.member_total || parsed?.data?.items?.length || 0
      } catch {}

      larkSignal = {
        available: true,
        messageId,
        batch: signals.lastMessageBatch,
        sentAt: signals.lastMessageTime,
        readCount,
        memberTotal,
        readRate: memberTotal > 0 ? Math.round(readCount / memberTotal * 100) / 100 : 0
      }
    }
  }

  // 2. 网站访问数据（Cloudflare Web Analytics GraphQL 优先，Umami 备选）
  let websiteSignal: any = { available: false }
  const cfAccountId = process.env.CF_ACCOUNT_ID
  const cfSiteTag = process.env.CF_ANALYTICS_SITE_TAG
  const umamiUrl = process.env.UMAMI_API_URL
  const umamiToken = process.env.UMAMI_API_TOKEN
  const umamiWebsiteId = process.env.PUBLIC_UMAMI_ID

  // 获取 Cloudflare token：环境变量 > wrangler OAuth
  function getCfToken(): string {
    if (process.env.CF_API_TOKEN) return process.env.CF_API_TOKEN
    try { return run('npx wrangler auth token 2>/dev/null').trim() } catch { return '' }
  }

  if (cfAccountId && cfSiteTag) {
    // ── Cloudflare Web Analytics (RUM) via GraphQL ──
    const cfToken = getCfToken()
    if (cfToken) {
      try {
        const nowISO = new Date().toISOString()
        const oneDayAgoISO = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const query = `{
          viewer {
            accounts(filter:{accountTag:"${cfAccountId}"}){
              total:rumPageloadEventsAdaptiveGroups(
                filter:{siteTag:"${cfSiteTag}",datetime_geq:"${oneDayAgoISO}",datetime_lt:"${nowISO}"}
                limit:1
              ){ count sum { visits } }
              topPages:rumPageloadEventsAdaptiveGroups(
                filter:{siteTag:"${cfSiteTag}",datetime_geq:"${oneDayAgoISO}",datetime_lt:"${nowISO}"}
                limit:5 orderBy:[count_DESC]
              ){ count dimensions { path:requestPath } }
            }
          }
        }`
        const escaped = JSON.stringify({ query })
        const raw = run(`curl -s -X POST "https://api.cloudflare.com/client/v4/graphql" -H "Authorization: Bearer ${cfToken}" -H "Content-Type: application/json" -d '${escaped.replace(/'/g, "'\\''")}'`)
        const resp = JSON.parse(raw)
        const acct = resp?.data?.viewer?.accounts?.[0]
        if (acct) {
          const total = acct.total?.[0]
          websiteSignal = {
            available: true,
            provider: 'cloudflare',
            period: '24h',
            pageviews: total?.count || 0,
            visits: total?.sum?.visits || 0,
            topPages: (acct.topPages || []).map((p: any) => ({
              url: p.dimensions?.path || '',
              views: p.count || 0
            }))
          }
        }
      } catch {}
    }
  }

  if (!websiteSignal.available && umamiUrl && umamiToken && umamiWebsiteId) {
    // ── Umami 备选 ──
    try {
      const now = Date.now()
      const oneDayAgo = now - 24 * 60 * 60 * 1000
      const statsRaw = run(`curl -s -H "Authorization: Bearer ${umamiToken}" "${umamiUrl}/api/websites/${umamiWebsiteId}/stats?startAt=${oneDayAgo}&endAt=${now}"`)
      const stats = JSON.parse(statsRaw)
      const pagesRaw = run(`curl -s -H "Authorization: Bearer ${umamiToken}" "${umamiUrl}/api/websites/${umamiWebsiteId}/metrics?startAt=${oneDayAgo}&endAt=${now}&type=url"`)
      const pages = JSON.parse(pagesRaw)
      websiteSignal = {
        available: true,
        provider: 'umami',
        period: '24h',
        pageviews: stats.pageviews?.value || 0,
        visits: stats.visitors?.value || 0,
        topPages: (pages || []).slice(0, 5).map((p: any) => ({ url: p.x, views: p.y }))
      }
    } catch {}
  }

  // 3. GitHub 反馈统计（Issue 数量按类型）
  let feedbackSignal: any = { available: false }
  try {
    const issuesRaw = run(`gh issue list --repo ${config.github.repo} --state all --limit 50 --json number,labels,createdAt,state`)
    const issues = JSON.parse(issuesRaw)
    const thisWeek = issues.filter((i: any) => {
      const created = new Date(i.createdAt)
      const now = new Date()
      const daysDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
      return daysDiff <= 7
    })
    const byLabel: Record<string, number> = {}
    for (const issue of thisWeek) {
      for (const label of (issue.labels || [])) {
        const name = label.name || label
        byLabel[name] = (byLabel[name] || 0) + 1
      }
    }
    feedbackSignal = {
      available: true,
      totalOpen: issues.filter((i: any) => i.state === 'OPEN').length,
      thisWeekNew: thisWeek.length,
      byLabel
    }
  } catch {}

  // 4. 写入 ops-state
  state.qualitySignals = {
    ...signals,
    lastChecked: new Date().toISOString(),
    lark: larkSignal,
    website: websiteSignal,
    feedback: feedbackSignal
  }

  // 4. 趋势分析（和上次比较）
  const history = signals.history || []
  if (larkSignal.available) {
    history.push({
      date: new Date().toISOString().slice(0, 10),
      batch: larkSignal.batch,
      readRate: larkSignal.readRate,
      readCount: larkSignal.readCount
    })
  }
  // 只保留最近 14 条
  state.qualitySignals.history = history.slice(-14)

  // 计算趋势
  let readRateTrend = 'insufficient_data'
  if (history.length >= 3) {
    const recent3 = history.slice(-3).map((h: any) => h.readRate)
    const avg = recent3.reduce((a: number, b: number) => a + b, 0) / 3
    const prev3 = history.slice(-6, -3).map((h: any) => h.readRate)
    if (prev3.length >= 3) {
      const prevAvg = prev3.reduce((a: number, b: number) => a + b, 0) / 3
      readRateTrend = avg > prevAvg + 0.05 ? 'improving' : avg < prevAvg - 0.05 ? 'declining' : 'stable'
    }
  }

  writeJSON(opsStatePath(), state)

  // 5. 输出报告给 Agent
  const alerts: string[] = []
  if (larkSignal.available && larkSignal.readRate < 0.2) {
    alerts.push(`飞书阅读率低 (${Math.round(larkSignal.readRate * 100)}%)，考虑精简日报`)
  }
  if (readRateTrend === 'declining') {
    alerts.push('阅读率呈下降趋势，建议调整内容策略')
  }
  if (feedbackSignal.available && (feedbackSignal.byLabel?.['bug'] || 0) >= 2) {
    alerts.push(`本周有 ${feedbackSignal.byLabel['bug']} 个 bug 报告待处理`)
  }
  if (websiteSignal.available && websiteSignal.pageviews === 0) {
    alerts.push('网站 24h 内零访问，检查部署是否正常')
  }

  console.log(JSON.stringify({
    phase: 'QUALITY',
    status: 'ok',
    lark: larkSignal,
    website: websiteSignal,
    feedback: feedbackSignal,
    readRateTrend,
    alerts,
    needsAgentAttention: alerts.length > 0,
    message: alerts.length > 0
      ? `有 ${alerts.length} 个质量警告，建议 Agent 关注`
      : '质量信号正常'
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
  case 'quality':      quality(); break
  case 'rollback':     rollback(); break
  default:
    console.log(JSON.stringify({
      error: `Unknown phase: ${phase}`,
      usage: 'npx tsx scripts/ops-runner.ts <restore|collect|analyze|build|persist|publish|publish-lark>'
    }))
    process.exit(1)
}
