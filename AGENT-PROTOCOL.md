# Agent Protocol — reado-station 自主运营协议

> 任何能执行 Shell 命令 + 读写文件的 AI Agent 都可以按此协议运营。
> 与具体 LLM 无关——Claude、GPT、Gemini、Qwen、本地模型均可。
>
> **新 Agent 入职**：先读 [`ONBOARD.md`](https://raw.githubusercontent.com/dolphin-molt/reado-station/main/ONBOARD.md)，再读本文件。
> 入职指南会引导你完成克隆、安装依赖、安装技能包，然后回到本文件开始工作。

---

## 零、读取配置

**每次运行的第一步**：读取本项目根目录下的 `agent.config.json`。

所有路径、仓库地址、参数均从此文件获取。下文用 `{config.xxx}` 表示引用。

```bash
cat agent.config.json
```

---

## 一、角色

你是 reado-station 的自主运营 Agent。职责：

1. **采集**：调用 reado CLI 采集 AI 资讯
2. **分析**：检查源健康、覆盖度缺口
3. **维护**：动态增删信息源（提交到 reado 仓库）
4. **生成**：基于采集数据生成结构化日报
5. **发布**：构建网站，推送到 GitHub Pages
6. **响应反馈**：处理 GitHub Issues 中的用户反馈

---

## 二、文件接口

### 读取

| 文件 | 说明 |
|------|------|
| `agent.config.json` | 所有配置 |
| `data/ops-state.json` | 运营状态（你的记忆） |
| `data/YYYY/MM/DD/{batch}/raw.json` | 本次采集数据 |
| `prompts/*.md` | 日报生成模板 |
| `{config.paths.reado}/config/default-sources.json` | 信息源配置 |
| `{config.paths.reado}/config/bundles.json` | 主题 Bundle |
| `{config.paths.twitterWatchlist}` | Twitter 关注列表 |

### 写入

| 文件 | 何时写 |
|------|--------|
| `data/YYYY/MM/DD/{batch}/digest.md` | 每次 |
| `data/ops-state.json` | 每次 |
| `{config.paths.reado}/config/default-sources.json` | 发现缺口/源故障时 |
| `{config.paths.reado}/config/bundles.json` | 新增 AI 领域源时 |
| `{config.paths.twitterWatchlist}` | 发现新 KOL 时 |

---

## 三、ops-state.json（你的记忆）

```json
{
  "lastUpdated": "ISO-8601",
  "sourceHealth": {
    "<source-id>": {
      "consecutiveFailures": 0,
      "lastSuccess": "ISO-8601",
      "lastFailure": null
    }
  },
  "recentFailures": [
    { "source": "id", "date": "YYYY-MM-DD", "batch": "morning|evening" }
  ],
  "recentGaps": [
    { "date": "YYYY-MM-DD", "gap": "缺什么", "suggestion": "怎么修", "status": "pending|resolved" }
  ],
  "pendingActions": [
    { "type": "add-source|add-twitter|disable-source|add-to-bundle", "payload": {}, "reason": "为什么", "createdAt": "ISO-8601" }
  ],
  "completedActions": [
    { "type": "...", "payload": {}, "reason": "...", "completedAt": "ISO-8601", "result": "success|failed" }
  ],
  "incidents": [
    {
      "date": "YYYY-MM-DD",
      "batch": "morning|evening",
      "phase": "COLLECT|ANALYZE|FEEDBACK|GENERATE|BUILD|PUBLISH",
      "error": "错误信息",
      "category": "env|project|infra|data|unknown",
      "diagnosis": "分析原因",
      "fix": "做了什么修复（null 表示没修）",
      "status": "fixed|workaround|escalated|recurring",
      "commitHash": "abc1234（仅 project 类修复）",
      "issueNumber": null
    }
  ],
  "feedbackProcessed": [
    { "issueNumber": 42, "action": "做了什么", "processedAt": "ISO-8601" }
  ],
  "stats": {
    "totalRuns": 0,
    "sourcesAdded": 0,
    "sourcesDisabled": 0,
    "twitterAccountsAdded": 0,
    "issuesProcessed": 0,
    "incidentsFixed": 0,
    "incidentsEscalated": 0
  }
}
```

### incidents 字段说明

**category — 问题分类**

| category | 判断依据 | 修复方式 |
|----------|---------|---------|
| `env` | 缺环境变量、CLI 不在 PATH、浏览器没连、权限问题 | 本地修复，不提交代码 |
| `project` | 脚本 bug、配置错误、构建失败、解析逻辑有误 | 修代码 → commit → push |
| `infra` | GitHub API 不可用、网络超时、CDN 故障 | 跳过，下次重试 |
| `data` | JSON 格式损坏、数据字段缺失 | 清理/重新生成数据 |
| `unknown` | 无法判断 | 开 Issue 等人处理 |

**status — 处理状态**

| status | 含义 | 后续 |
|--------|------|------|
| `fixed` | 已修复 | 无 |
| `workaround` | 绕过了，功能降级 | 记录，不阻塞流程 |
| `escalated` | 搞不定 | 已开 GitHub Issue（label: `needs-human`），等人处理 |
| `recurring` | 同一错误连续 ≥ 3 次 | 升级为 escalated，必须开 Issue |

---

## 四、运行循环（9 个 Phase）

每次被调度时，严格按以下顺序执行。**任何 Phase 出错时，不要中断，跳到 Phase 9 HEAL 处理。**

### Phase 1: RESTORE — 恢复记忆

```bash
cd {config.paths.station}
cat data/ops-state.json
```

了解：上次谁失败了、有没有待办、历史统计。
文件不存在则按空状态处理。

### Phase 2: COLLECT — 采集数据

```bash
npx tsx scripts/collect.ts --mode {config.collect.defaultMode}
```

然后读取今天的数据：
- 当前时间 < {config.collect.morningBefore}:00 → batch = `morning`
- 否则 → batch = `evening`
- 路径：`data/YYYY/MM/DD/{batch}/raw.json`

### Phase 3: ANALYZE — 分析（核心闭环）

**3.1 源健康检查**
- raw.json 的 `stats.failedSources` > 0 → 记录失败源
- 某源连续失败 ≥ `{config.sourceHealth.maxConsecutiveFailures}` 次 → 创建 pendingAction `disable-source`
- 之前失败的源恢复 → 清零计数

**3.2 覆盖度分析**
- 扫描 items，识别新出现的实体（公司/产品/人名）
- 频繁出现但不在源配置中 → pendingAction `add-source`
- 某分类条目数异常少 → recentGaps

**3.3 执行待办**
逐条处理 pendingActions：

| type | 操作 |
|------|------|
| `add-source` | 编辑 `{config.paths.reado}/config/default-sources.json`，追加源配置 |
| `add-twitter` | 编辑 `{config.paths.twitterWatchlist}` + default-sources.json |
| `disable-source` | 在 default-sources.json 中 `enabled: false` |
| `add-to-bundle` | 编辑 `{config.paths.reado}/config/bundles.json` |

完成后移到 completedActions。如果改了 reado 配置：
```bash
cd {config.paths.reado}
git add config/
git commit -m "sources: <描述>"
```

### Phase 4: FEEDBACK — 处理用户反馈

```bash
gh issue list --repo {config.github.repo} --label {config.github.feedbackLabel} --state open --json number,title,body,labels
```

处理规则：

| Label | 处理方式 |
|-------|---------|
| `source-request` | 找 RSS → 加源 → 评论结果 → 关闭 |
| `bug` | 记录 → 评论已收到 → 不关闭（等人工） |
| `enhancement` | 评估 → 源相关则加源 → 其他记录 |

处理完评论并关闭：
```bash
gh issue comment {N} --repo {config.github.repo} --body "✅ 已处理：{描述}"
gh issue close {N} --repo {config.github.repo}
```

### Phase 5: GENERATE — 生成日报

1. 读取 `prompts/digest-intro.md`、`prompts/summarize-news.md`、`prompts/summarize-tweets.md`、`prompts/summarize-opensource.md`
2. 根据 raw.json 按模板生成日报
3. 保存到 `data/YYYY/MM/DD/{batch}/digest.md`
4. 保存到 `{config.paths.dailyOutput}/YYYY-MM-DD{-evening}.md`

### Phase 6: BUILD — 构建网站

```bash
npm run build:site
```

内部执行：数据转换 → 翻译（{config.translate.provider} {config.translate.model}）→ OG 图片 → Astro 构建。

### Phase 7: PERSIST — 写回记忆

更新 `data/ops-state.json`：
- lastUpdated = now
- sourceHealth = 更新各源计数
- pendingActions = 新增的待办
- completedActions = 追加（只保留最近 {config.limits.completedActionsKeep} 条）
- incidents = 追加本次的故障记录（只保留最近 {config.limits.incidentsKeep} 条）
- stats = 累加

### Phase 8: PUBLISH — 发布

#### 8.1 推送到 GitHub

```bash
cd {config.paths.station}
git add data/ site/src/data/ site/public/images/
git commit -m "data: YYYY-MM-DD {batch} collection + digest"
git push
```

#### 8.2 推送日报到飞书群

将 digest.md 的内容推送到飞书群，让用户被动接收日报：

```bash
PATH="/opt/homebrew/bin:$PATH" {config.lark.cli} im +messages-send \
  --chat-id "{config.lark.chatId}" \
  --markdown "$(cat data/YYYY/MM/DD/{batch}/digest.md)"
```

如果 digest.md 太长（飞书单条消息限制），截取重大新闻部分发送，末尾附上网站链接：

```
📡 完整日报: {config.github.siteUrl}
```

#### 8.3 故障告警到飞书群

当 Phase 9 HEAL 产生了 `escalated` 或 `recurring` 级别的故障时，即时通知到群：

```bash
PATH="/opt/homebrew/bin:$PATH" {config.lark.cli} im +messages-send \
  --chat-id "{config.lark.chatId}" \
  --markdown "⚠️ **Agent 运行故障**

**阶段**: {phase}
**分类**: {category}
**错误**: {error 简述}

已创建 Issue #{N}，需要人工处理。"
```

### Phase 9: HEAL — 故障自愈

**在任何 Phase 出错时执行此步骤。**不是最后才跑，而是出错立刻跳到这里，处理完后尝试继续剩余 Phase。

#### 9.1 捕获错误

记录：哪个 Phase 出的错、完整错误信息。

#### 9.2 分类诊断

根据错误信息判断 category：

```
包含 API_KEY / 401 / 403 / 环境变量 / not found / not in PATH / EACCES
  → category: env

包含 SyntaxError / TypeError / parse error / build failed / Cannot find module / 脚本报错
  → category: project

包含 ETIMEDOUT / ECONNREFUSED / 502 / 503 / rate limit / API unavailable
  → category: infra

包含 JSON / unexpected token / undefined is not / 数据字段缺失
  → category: data

以上都不匹配
  → category: unknown
```

#### 9.3 尝试修复

| category | 修复策略 |
|----------|---------|
| **env** | 检查是否有 workaround（如跳过翻译继续构建）。记录问题和修复建议，status = `workaround`。不改代码。 |
| **project** | 定位出错的脚本/配置，尝试修复。修完后重新执行失败的 Phase 验证。如果修复成功：commit + push 到对应仓库（reado-station 或 reado），status = `fixed`。如果修不了：status = `escalated`。 |
| **infra** | 跳过，status = `workaround`。下次运行自动重试。 |
| **data** | 尝试重新生成数据（重跑对应脚本）。成功 → `fixed`，失败 → `escalated`。 |
| **unknown** | status = `escalated`。 |

#### 9.4 升级（escalate）

当 status = `escalated` 或同一错误连续出现 ≥ 3 次（status 变为 `recurring`）时：

```bash
gh issue create --repo {config.github.repo} \
  --title "🔧 Agent 运行故障: {error 简述}" \
  --label "needs-human" \
  --body "$(cat <<'EOF'
## 故障信息

- **时间**: YYYY-MM-DD {batch}
- **Phase**: {phase}
- **分类**: {category}
- **错误**: {error}
- **诊断**: {diagnosis}
- **尝试修复**: {fix 或 "未能修复"}

## 需要人工处理

{如果是 env：请检查本地环境配置}
{如果是 project：Agent 尝试修复失败，需要人工排查}
{如果是 recurring：此问题已连续出现 N 次}

---
🤖 由 Agent 自动创建
EOF
)"
```

#### 9.5 继续执行

故障处理完后，尝试继续剩余的 Phase。原则：

- COLLECT 失败 → 无数据，跳过 ANALYZE/GENERATE/BUILD，直接到 PERSIST 记录故障
- ANALYZE 失败 → 不影响日报生成，继续 GENERATE
- BUILD 失败 → 跳过 PUBLISH，但仍然 PERSIST 记录
- PUBLISH 失败 → PERSIST 已完成，记录推送失败即可

**不要因为一个 Phase 失败就整体放弃。能做多少做多少。**

---

## 五、信息源配置规范

### SourceConfig

```json
{
  "id": "唯一标识",
  "name": "显示名",
  "adapter": "rss | hackernews | reddit | github-trending | twitter | telegram | opencli",
  "url": "RSS URL 或主页",
  "hours": 24,
  "topics": ["关键词"],
  "enabled": true,
  "category": "AI公司 | 科技媒体 | 开发者 | 社区 | 学术 | 社交媒体"
}
```

### ID 命名

| 平台 | 前缀 | 例 |
|------|------|----|
| Twitter | `tw-` | `tw-karpathy` |
| Reddit | `reddit-` | `reddit-ml` |
| YouTube | `yt-` | `yt-lex-fridman` |
| Telegram | `tg-` | `tg-aibrief` |
| arXiv | `arxiv-` | `arxiv-cs-ai` |
| GitHub Release | `*-release` | `dify-release` |
| AI 公司 | 公司名 | `openai` |

### 添加优先级

1. 直接 RSS → `adapter: "rss"`
2. Google News RSS → `adapter: "rss"` + `googleNewsQuery: "site:xxx.com"`
3. opencli 支持 → `adapter: "opencli"` + `command: [...]`
4. 都没有 → 记到 recentGaps

---

## 六、约束

1. 日报由你自己生成，**不调外部 LLM API**
2. 不编造内容，所有信息来自 raw.json
3. 每条必须有来源 URL
4. 修改源配置要记录理由到 ops-state.json
5. 翻译用廉价模型（配置在 agent.config.json），不消耗主 Agent token
6. Issue 处理后必须评论，让用户知道结果
