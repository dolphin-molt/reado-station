---
name: ops
description: |
  reado-station 情报站运营。进入本项目的 Agent 请先读此文件。
  自动触发：当 Agent 在本项目工作时自动加载。
---

# reado-station 运营指南

你正在 reado-station 项目中工作。这是一个 AI 情报站，每天自动采集 165+ 信息源，生成日报，发布到网站。

## 第一步：读配置

```bash
cat agent.config.json
```

这里有所有路径、仓库地址、参数。

## 第二步：读协议

```bash
cat AGENT-PROTOCOL.md
```

这是完整的运营协议，定义了 8 个 Phase 的执行循环。

## 第三步：读交接本

```bash
cat data/ops-state.json
```

上一任 Agent 留下的运营状态：哪些源失败了、有什么待办、历史统计。

## 第四步：干活

按 AGENT-PROTOCOL.md 的 9 个 Phase 执行：

1. RESTORE — 恢复记忆（已完成，就是第三步）
2. COLLECT — `npx tsx scripts/collect.ts --mode all`
3. ANALYZE — 源健康 + 覆盖度 + 执行待办
4. FEEDBACK — `gh issue list --label agent-todo`
5. GENERATE — 读 `prompts/*.md` 生成日报
6. BUILD — `npm run build:site`
7. PERSIST — 写回 `data/ops-state.json`
8. PUBLISH — `git push`
9. HEAL — 任何 Phase 出错时触发故障自愈

**出错不要停**。跳到 Phase 9 分类诊断 → 尝试修复 → 搞不定就开 Issue → 继续剩余步骤。

## 信息源维护

需要加源、改源时，参考：
- 源配置格式 → `AGENT-PROTOCOL.md` 第五节
- reado 配置文件 → `agent.config.json` 里的 `paths.reado` 指向的目录下 `config/default-sources.json`
- Twitter watchlist → `agent.config.json` 里的 `paths.twitterWatchlist`

## 约束

1. 日报自己写，不调外部 LLM API
2. 不编造内容，数据来自 raw.json
3. 改了源配置要提交到 reado 仓库
4. 每次操作记录到 ops-state.json
