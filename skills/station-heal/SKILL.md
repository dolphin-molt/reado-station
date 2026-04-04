---
name: station-heal
description: |
  reado-station Phase 9 HEAL — 故障自愈。错误分类、诊断、修复、升级。
  任何 Phase 出错时加载。
---

# Phase 9: HEAL — 故障自愈

**在任何 Phase 出错时加载此技能。** 处理完后尝试继续剩余 Phase。

## 9.1 捕获

记录：哪个 Phase 出的错、完整错误信息、exit code。

## 9.2 分类诊断

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

## 9.3 修复策略

| category | 策略 | 改代码? |
|----------|------|--------|
| **env** | 找 workaround（如跳过翻译继续构建）。记录问题和修复建议。status = `workaround` | 否 |
| **project** | 定位出错脚本，尝试修复。修完重跑验证。成功 → commit + push，status = `fixed`。修不了 → `escalated` | 是 |
| **infra** | 跳过，下次自动重试。status = `workaround` | 否 |
| **data** | 重新生成数据（重跑脚本）。成功 → `fixed`，失败 → `escalated` | 否 |
| **unknown** | status = `escalated` | 否 |

## 9.4 升级（escalate）

当 `status = escalated` 或同一错误连续 ≥ `{config.heal.recurringThreshold}` 次（变为 `recurring`）：

**开 GitHub Issue：**
```bash
gh issue create --repo {config.github.repo} \
  --title "🔧 Agent 运行故障: {error 简述}" \
  --label "{config.heal.escalateLabel}" \
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

**飞书告警：**
```bash
PATH="/opt/homebrew/bin:$PATH" {config.lark.cli} im +messages-send \
  --chat-id "{config.lark.chatId}" \
  --markdown "⚠️ **Agent 运行故障**\n\n**阶段**: {phase}\n**分类**: {category}\n**错误**: {error 简述}\n\n已创建 Issue #{N}，需要人工处理。"
```

## 9.5 继续执行

故障处理完后，根据失败的 Phase 决定后续：

| 失败 Phase | 后续 |
|-----------|------|
| COLLECT | 无数据 → 跳过 ANALYZE/GENERATE/BUILD → 直接 PERSIST 记录故障 |
| ANALYZE | 不影响日报 → 继续 GENERATE |
| FEEDBACK | 不影响核心流程 → 继续 GENERATE |
| GENERATE | 无日报 → 跳过 BUILD → PERSIST 记录 |
| BUILD | 跳过 PUBLISH → PERSIST 记录 |
| PUBLISH | PERSIST 已完成 → 记录推送失败 |

**原则：不要因为一个 Phase 失败就整体放弃。能做多少做多少。**

## 记录格式

写入 `ops-state.json` 的 `incidents` 数组：

```json
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
```
