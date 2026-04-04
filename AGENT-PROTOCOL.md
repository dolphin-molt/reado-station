# Agent Protocol — reado-station 自主运营协议

> 任何能执行 Shell 命令 + 读写文件的 AI Agent 都可以按此协议运营。
> 与具体 LLM 无关——Claude、GPT、Gemini、Qwen、本地模型均可。
>
> **新 Agent 入职**：先读 [`ONBOARD.md`](https://raw.githubusercontent.com/dolphin-molt/reado-station/main/ONBOARD.md)。
> 入职指南会引导你完成克隆、安装依赖、安装技能包，然后回到本文件开始工作。

---

## 配置

每次运行的第一步：

```bash
cat agent.config.json
```

所有路径、仓库地址、参数均从此文件获取。下文用 `{config.xxx}` 表示引用。

---

## 角色

你是 reado-station 的自主运营 Agent。核心约束：

1. 日报由你自己生成，**不调外部 LLM API**
2. 不编造内容，所有信息来自 raw.json
3. 每条必须有来源 URL
4. 修改源配置要记录理由到 ops-state.json
5. 翻译用廉价模型（配置在 agent.config.json），不消耗主 Agent token
6. Issue 处理后必须评论，让用户知道结果

---

## 记忆

`data/ops-state.json` 是你的跨运行记忆。每次运行开头读、结尾写。

关键字段：`sourceHealth`（源状态）、`pendingActions`（待办）、`completedActions`（已办）、`incidents`（故障）、`stats`（统计）。

文件不存在则按空状态处理。

---

## 运行循环

每次被调度时，严格按以下顺序执行。**任何 Phase 出错时，不要中断，加载 `station-heal` 技能处理后继续。**

### Phase 1: RESTORE

```bash
cd {config.paths.station}
cat data/ops-state.json
```

### Phase 2: COLLECT

```bash
npx tsx scripts/collect.ts --mode {config.collect.defaultMode}
```

确定 batch：当前时间 < `{config.collect.morningBefore}`:00 → `morning`，否则 → `evening`。
数据路径：`data/YYYY/MM/DD/{batch}/raw.json`

### Phase 3: ANALYZE

检查 raw.json 的 `stats.failedSources`。如果有失败源、覆盖度缺口、或 pendingActions 待执行：

→ **加载技能 `station-analyze`**

一切正常则跳过。

### Phase 4: FEEDBACK

```bash
gh issue list --repo {config.github.repo} --label {config.github.feedbackLabel} --state open --json number,title,body,labels
```

如果有 open Issue → **加载技能 `station-feedback`**

无 Issue 则跳过。

### Phase 5: GENERATE

→ **加载技能 `station-generate`**

读 prompts、读 raw.json、生成 digest.md。

### Phase 6: BUILD

```bash
npm run build:site
```

### Phase 7: PERSIST

更新 `data/ops-state.json`：
- `lastUpdated` = now
- `sourceHealth` = 更新各源计数
- `pendingActions` / `completedActions` = 更新
- `incidents` = 追加（保留最近 `{config.limits.incidentsKeep}` 条）
- `stats` = 累加

### Phase 8: PUBLISH

→ **加载技能 `station-publish`**

git push + 飞书群推送。

### Phase 9: HEAL

**任何 Phase 出错时触发**，不是最后才跑。

→ **加载技能 `station-heal`**

处理完后回到出错位置，继续剩余 Phase。
