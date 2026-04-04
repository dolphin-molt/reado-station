---
name: reado-station-ops
description: |
  reado-station 网站自主运营。采集→分析→维护→日报→构建→发布→反馈处理，完整闭环。
  触发词：运营网站、发布日报、构建网站、处理反馈、reado station、网站运营
---

# reado-station-ops — 网站运营技能包

自主运营 reado-station 情报网站。这是入口技能，按需加载子技能。

## 入职

1. `cat agent.config.json` — 配置
2. `cat AGENT-PROTOCOL.md` — 运营循环（9 Phase 路由表）
3. `cat data/ops-state.json` — 上一任 Agent 的记忆

## 技能体系

| 技能 | 加载时机 | 内容 |
|------|---------|------|
| **reado-station-ops**（本技能） | 每次 | 入口 + 路由 |
| **station-analyze** | Phase 3 有异常时 | 源健康检查 + 覆盖度分析 + 执行待办 |
| **station-feedback** | Phase 4 有 Issue 时 | GitHub Issue 处理规则 |
| **station-generate** | Phase 5 | 日报生成规范 + prompt 文件 |
| **station-publish** | Phase 8 | git push + 飞书群推送 |
| **station-heal** | 任何 Phase 出错时 | 故障分类 + 诊断 + 修复 + 升级 |
| **reado-collect** | 需要加源时 | 信息源配置格式 + 采集命令 |

## 正常运行的上下文加载

一次无故障的运行只需加载：

```
常驻：reado-station-ops + AGENT-PROTOCOL.md + agent.config.json + ops-state.json
Phase 5：station-generate
Phase 8：station-publish
```

总计约 5KB。其余技能仅在异常/反馈/维护场景才加载。

## 构建管线

```bash
npm run build:site
# = build-site-data → translate → fetch-images → astro build
```

## 约束

1. 日报由你自己生成，不调外部 LLM
2. 不编造内容，来自 raw.json
3. 信息源维护用 **reado-collect** 技能包的知识
4. 翻译用廉价模型，不消耗主 Agent token
5. Issue 处理后必须评论
