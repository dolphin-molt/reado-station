---
name: station-feedback
description: |
  reado-station Phase 4 FEEDBACK — 处理 GitHub Issues 中的用户反馈。
  当存在 label 为 agent-todo 的 open Issue 时加载。
---

# Phase 4: FEEDBACK — 处理用户反馈

## 查询待处理 Issue

```bash
gh issue list --repo {config.github.repo} --label {config.github.feedbackLabel} --state open --json number,title,body,labels
```

如果返回空数组 → 跳过本阶段。

## 处理规则

按 Issue 的 label 分类处理：

| Label | 处理方式 |
|-------|---------|
| `source-request` | 搜索该信息源的 RSS/API → 找到则加源（用 reado-collect 技能的知识）→ 评论处理结果 → 关闭 Issue |
| `bug` | 记录到 ops-state.json 的 incidents → 评论"已收到，等待人工排查" → **不关闭** |
| `enhancement` | 评估是否与信息源相关 → 是则尝试加源 → 否则记录到 recentGaps → 评论结果 |

## 评论与关闭

处理完毕后：

```bash
# 评论
gh issue comment {N} --repo {config.github.repo} --body "✅ 已处理：{具体描述做了什么}"

# 关闭（仅 source-request 和已解决的 enhancement）
gh issue close {N} --repo {config.github.repo}
```

**约束**：每个 Issue 处理后必须评论，让用户知道结果。bug 类 Issue 不关闭。

## 记录

处理完的 Issue 记录到 `ops-state.json`：

```json
{ "feedbackProcessed": [{ "issueNumber": 42, "action": "添加了 xxx 信息源", "processedAt": "ISO-8601" }] }
```

更新 `stats.issuesProcessed += 1`。
