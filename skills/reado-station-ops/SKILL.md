---
name: reado-station-ops
description: |
  reado-station 网站自主运营。采集→分析→维护→日报→构建→发布→反馈处理，完整闭环。
  触发词：运营网站、发布日报、构建网站、处理反馈、reado station、网站运营
---

# reado-station-ops — 网站运营技能包

自主运营 reado-station 情报网站。这是入口技能，按需加载子技能。生产数据源是 Cloudflare D1，本地 `data/` 只是缓存/回填源。

## 入职

1. `cat agent.config.json` — 配置
2. `cat AGENT-PROTOCOL.md` — 运营循环（9 Phase 路由表）
3. 读取 D1 `ops_state` 或本地 `data/ops-state.json` 工作副本 — 上一任 Agent 的记忆

## 技能体系

| 技能 | 加载时机 | 内容 |
|------|---------|------|
| **reado-station-ops**（本技能） | 每次 | 入口 + 路由 |
| **station-analyze** | Phase 3 有异常时 | 源健康检查 + 覆盖度分析 + 执行待办 |
| **station-feedback** | Phase 4 有 Issue 时 | GitHub Issue 处理规则 |
| **station-generate** | Phase 5 | 日报生成规范 + prompt 文件 |
| **station-publish** | Phase 8 | D1 写入确认 + 飞书群推送 |
| **station-heal** | 任何 Phase 出错时 | 故障分类 + 诊断 + 修复 + 升级 |
| **reado-collect** | 需要加源时 | 信息源配置格式 + 采集命令 |

## 正常运行的上下文加载

一次无故障的运行只需加载：

```
常驻：reado-station-ops + AGENT-PROTOCOL.md + agent.config.json + ops_state
Phase 5：station-generate
Phase 8：station-publish
```

总计约 5KB。其余技能仅在异常/反馈/维护场景才加载。

## 构建管线

生产网站构建：

```bash
npm run build:web:cloudflare
```

旧 Astro 回退构建：

```bash
npm run build:site
```

### build-site-data 输出

旧构建脚本 `scripts/build-site-data.ts` 输出三个本地 JSON 文件，供 Astro 回退路径使用；这些文件不再提交到 Git：

| 文件 | 内容 |
|------|------|
| `site/src/data/items.json` | 所有新闻条目，平铺 |
| `site/src/data/days.json` | 按天聚合的元数据 |
| `site/src/data/digests.json` | 从 digest.md 解析的结构化数据（今日观察 + 话题聚合） |

`digests.json` 由 build-site-data.ts 自动解析每天的 digest.md 生成，包含：
- `observations[]` — 今日观察（专家视角点评）
- `clusters[]` — 按 H2 段落分组的新闻聚合（重大新闻/公司动态/论文等）

### 网站首页结构

| 模块 | 数据来源 | 说明 |
|------|---------|------|
| **今日必看**（Hero 轮播） | digests.json clusters | 从各话题取前 8 条重要新闻，支持侧滑翻页 |
| **今日观察** | digests.json observations | 不同行业专家视角的今日点评 |
| **全部资讯** | items.json | 分类筛选（新闻/开源&论文/社区/Twitter）+ 分页 |

## 约束

1. 日报由你自己生成，不调外部 LLM
2. 不编造内容，来自 raw.json
3. 信息源维护用 **reado-collect** 技能包的知识
4. 翻译用廉价模型，不消耗主 Agent token
5. Issue 处理后必须评论
6. **digest.md 必须包含 `## 今日观察` 段** — 网站首页依赖此数据
