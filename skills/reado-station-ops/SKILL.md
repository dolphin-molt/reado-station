---
name: reado-station-ops
description: |
  reado-station 网站自主运营。采集→分析→维护→日报→构建→发布→反馈处理，完整闭环。
  触发词：运营网站、发布日报、构建网站、处理反馈、reado station、网站运营
---

# reado-station-ops — 网站运营技能包

自主运营 reado-station 情报网站的完整闭环。

**依赖 reado-collect 技能包**采集数据，本技能包负责后续的分析、生成、构建、发布。

## 入职指南

**你是新来的 Agent？按以下步骤入职：**

1. 读取项目配置：`cat agent.config.json`（所有路径和参数）
2. 读取运营协议：`cat AGENT-PROTOCOL.md`（8 个 Phase 完整流程）
3. 读取运营状态：`cat data/ops-state.json`（上一任 Agent 的交接记录）
4. 开始干活

## 项目位置

从 `agent.config.json` 的 `paths.station` 获取。

## 运营循环（8 Phase）

完整规范见 `AGENT-PROTOCOL.md`，简版：

```
1. RESTORE   — 读 ops-state.json（恢复记忆）
2. COLLECT   — npx tsx scripts/collect.ts（采集数据）
3. ANALYZE   — 源健康 + 覆盖度 + 执行待办
4. FEEDBACK  — gh issue list --label agent-todo（处理反馈）
5. GENERATE  — 读 prompts/*.md → 生成 digest.md
6. BUILD     — npm run build:site（翻译+图片+Astro）
7. PERSIST   — 写回 ops-state.json
8. PUBLISH   — git push → GitHub Actions 部署
```

## 关键文件

| 文件 | 作用 |
|------|------|
| `agent.config.json` | 所有配置（路径、仓库、参数） |
| `AGENT-PROTOCOL.md` | 完整运营协议（8 Phase 详细规范） |
| `data/ops-state.json` | 运营状态（你的记忆 / 交接本） |
| `prompts/*.md` | 日报生成模板 |
| `scripts/collect.ts` | 采集脚本 |
| `scripts/build-site-data.ts` | 数据转换 |
| `scripts/translate.ts` | 翻译（SiliconFlow Qwen3-8B） |
| `scripts/fetch-images.ts` | OG 图片抓取 |

## 构建管线

```bash
npm run build:site
# = build-site-data → translate → fetch-images → astro build
```

## 反馈处理

用户通过网站 About 页提交 GitHub Issue（自动标 `agent-todo`）。

```bash
gh issue list --repo {repo} --label agent-todo --state open --json number,title,body,labels
```

| Label | 处理 |
|-------|------|
| `source-request` | 找 RSS → 加源（用 reado-collect 技能）→ 评论 → 关闭 |
| `bug` | 记录 → 评论已收到 → 留给人工 |
| `enhancement` | 评估 → 能做就做 → 不能做就记录 |

## 约束

1. 日报由你自己生成，不调外部 LLM
2. 不编造内容，来自 raw.json
3. 信息源维护用 **reado-collect** 技能包的知识
4. 翻译用廉价模型，不消耗主 Agent token
5. Issue 处理后必须评论
