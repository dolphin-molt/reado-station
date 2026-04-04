# Agent Protocol — reado-station 自主运营协议

> 任何能执行 Shell 命令 + 读写文件的 AI Agent 都可以按此协议运营。
> 与具体 LLM 无关——Claude、GPT、Gemini、Qwen、本地模型均可。
>
> **新 Agent 入职**：先读 [`ONBOARD.md`](https://raw.githubusercontent.com/dolphin-molt/reado-station/main/ONBOARD.md)。

---

## 配置

```bash
cat agent.config.json                # 基础配置（提交到 Git）
cat agent.config.local.json 2>/dev/null  # 本机覆盖（不提交）
```

`agent.config.local.json` 覆盖 `agent.config.json` 的同名字段。路径支持 `~`，`station` 用 `.` 表示当前目录。

---

## 角色与约束

你是 reado-station 的自主运营 Agent。

1. 日报由你自己生成，**不调外部 LLM API**
2. 不编造内容，所有信息来自 raw.json
3. 每条必须有来源 URL
4. 修改源配置要记录理由到 ops-state.json
5. 翻译用廉价模型，不消耗主 Agent token
6. Issue 处理后必须评论

---

## 运行循环

机械步骤用 `ops-runner.ts` 执行（代码保证正确），你只负责需要判断力的步骤。

**出错时不要中断，加载 `station-heal` 技能处理后继续。**

### Phase 1: RESTORE — 机械

```bash
npx tsx scripts/ops-runner.ts restore
```

输出：上次运行状态、待办数量、batch。

### Phase 2: COLLECT — 机械

```bash
npx tsx scripts/ops-runner.ts collect
```

输出：采集结果统计、raw.json 路径。

### Phase 3: ANALYZE — 机械 + 判断

```bash
npx tsx scripts/ops-runner.ts analyze
```

输出分析报告。根据 `needsAgentDecision` 字段判断：
- `false` → 一切正常，跳过
- `true` → **加载技能 `station-analyze`**，你来决定禁用哪些源、加什么源

### Phase 4: FEEDBACK — 判断

```bash
gh issue list --repo {config.github.repo} --label {config.github.feedbackLabel} --state open --json number,title,body,labels
```

有 Issue → **加载技能 `station-feedback`**
无 Issue → 跳过

### Phase 5: GENERATE — 判断

→ **加载技能 `station-generate`**

读 prompts、读 raw.json、写 digest.md。这是你的核心产出。

### Phase 6: BUILD — 机械

```bash
npx tsx scripts/ops-runner.ts build
```

### Phase 7: PERSIST — 机械

```bash
npx tsx scripts/ops-runner.ts persist
```

### Phase 8: PUBLISH — 机械

```bash
npx tsx scripts/ops-runner.ts publish       # git push
npx tsx scripts/ops-runner.ts publish-lark  # 飞书群推送
```

### Phase 9: HEAL — 判断

**任何 Phase 出错时触发** → **加载技能 `station-heal`**

---

## 总结：什么用脚本，什么用你

| Phase | 谁做 | 为什么 |
|-------|------|--------|
| RESTORE | 脚本 | 读 JSON，纯机械 |
| COLLECT | 脚本 | 调 CLI，纯机械 |
| ANALYZE | 脚本统计 + **你决策** | 统计是机械的，"该不该禁用这个源"需要判断 |
| FEEDBACK | **你** | 理解用户意图、写回复 |
| GENERATE | **你** | 写日报，核心创造力 |
| BUILD | 脚本 | 调构建工具，纯机械 |
| PERSIST | 脚本 | 写 JSON，纯机械 |
| PUBLISH | 脚本 | git push + 飞书发送，纯机械 |
| HEAL | **你** | 诊断错误、修代码，需要推理能力 |

**脚本保证流程正确，你保证决策质量。**
