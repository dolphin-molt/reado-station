# Agent Protocol — reado-station 自主运营协议

> 任何能执行 Shell 命令 + 读写文件的 AI Agent 都可以按此协议运营。
> 与具体 LLM 无关——Claude、GPT、Gemini、Qwen、本地模型均可。
>
> **新 Agent 入职**：先读 `ONBOARD.md`，再读本文件。

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
  "feedbackProcessed": [
    { "issueNumber": 42, "action": "做了什么", "processedAt": "ISO-8601" }
  ],
  "stats": {
    "totalRuns": 0,
    "sourcesAdded": 0,
    "sourcesDisabled": 0,
    "twitterAccountsAdded": 0,
    "issuesProcessed": 0
  }
}
```

---

## 四、运行循环（8 个 Phase）

每次被调度时，严格按以下顺序执行：

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
- stats = 累加

### Phase 8: PUBLISH — 发布

```bash
cd {config.paths.station}
git add data/ site/src/data/ site/public/images/
git commit -m "data: YYYY-MM-DD {batch} collection + digest"
git push
```

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
