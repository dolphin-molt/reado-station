<div align="center">

# reado-station

「Read All. Miss Nothing.」

[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Agent Operated](https://img.shields.io/badge/Agent-Operated-blue)](AGENT-PROTOCOL.md)
[![Sources](https://img.shields.io/badge/Sources-165+-orange)](config/sources.json)
[![Site](https://img.shields.io/badge/Site-reado.theopcapp.com-purple)](https://reado.theopcapp.com)

AI 情报站自主运营平台。165 个信息源，每天自动采集、生成日报，并通过 Cloudflare Worker + D1 发布网站。

全流程由 Agent 自主运营 — 无需人工介入。

[看网站](https://reado.theopcapp.com) · [快速开始](#quick-start) · [架构设计](#architecture) · [迁移路线](docs/migration-roadmap.md) · [Agent 运营](#agent-运营) · [自主运营文档](docs/autonomous-operation.md)

</div>

---

## Quick Start

```bash
npm install
npm run pipeline:auto   # 采集 + 摘要一条龙
```

本地开发生产 Web 应用：

```bash
npm run dev:web
```

一次性把本地历史数据同步到 D1：

```bash
npm run d1:sync-api -- --require
```

> Secrets 主要在 GitHub Repository Secrets。本地需要直接写 D1 API 时，配置 `READO_D1_API_BASE_URL` 和 `READO_D1_API_SECRET`。详见 `.env.example`。

## Architecture

```
                   ┌─────────────────────────────────────────┐
                   │         9-Phase 运营流水线                │
                   │                                         │
  reado CLI ──→  COLLECT ──→ ANALYZE ──→ GENERATE ──→ BUILD  │
  (165 源)         │                        │           │     │
                   │      FEEDBACK ←── GitHub Issues     │     │
                   │                                     ↓     │
                   │   HEAL (故障自愈) ←── any error   PUBLISH │
                   │                                   ↙    ↘  │
                   │                            D1 API    飞书  │
                   │                                      群   │
                   └─────────────────────────────────────────┘

 Cloudflare Worker + D1 ──→ 首页 / 归档 / 受保护写入 API
```

### 信息源覆盖

165 个源，覆盖 12 个类别：

| 类别 | 数量 | 示例 |
|------|------|------|
| 科技媒体 | 25 | The Verge, TechCrunch, 36Kr |
| 社交媒体 | 23 | Twitter/X KOL watchlist |
| AI 公司 | 21 | OpenAI, Anthropic, Google DeepMind |
| 学术 | 19 | arXiv, Hugging Face Papers |
| Reddit | 19 | r/MachineLearning, r/LocalLLaMA |
| 开发者 | 10 | Hacker News, Dev.to |
| 其他 | 48 | GitHub Trending, Product Hunt, YouTube |

### 混合采集架构

| 环境 | 采集范围 | 触发 |
|------|---------|------|
| GitHub Actions | RSS/API 源 (cloud) | cron 08:00 / 18:00 UTC |
| 本地 Mac (launchd) | cookie 源 ~30 个 (opencli) | 07:50 / 17:50 |
| Agent 调度 | 全量合并 + 生成 + 发布 | 08:15 / 18:15 |

## Scripts

| 命令 | 说明 |
|------|------|
| `npm run collect` | 数据采集（默认全量） |
| `npm run collect:cloud` | 仅 cloud 源 |
| `npm run collect:local` | 仅本地 cookie 源 |
| `npm run summarize` | AI 摘要生成 (Claude API) |
| `npm run sync-sources` | 从飞书多维表格同步信息源配置 |
| `npm run pipeline:auto` | sync → collect → summarize |
| `npm run d1:sync-api` | 通过受保护 API 将本地历史数据同步到 D1 |
| `npm run dev:web` | 启动 Next/Cloudflare Web 本地开发 |
| `npm run build:web` | 构建 Next Web 应用 |
| `npm run build:web:cloudflare` | 构建 Cloudflare Worker 产物 |
| `npm run build:site` | 旧 Astro 回退路径：构建静态网站（含翻译） |
| `npm run build:site-no-translate` | 旧 Astro 回退路径：构建静态网站（跳过翻译） |
| `npm run publish:lark` | 推送日报到飞书群 |
| `npm test` | 运行测试 (Vitest) |

## Runtime Data

```
data/
├── 2026/04/07/
│   ├── morning/
│   │   ├── raw.json       # 全量采集数据
│   │   └── digest.md      # AI 精选日报
│   └── evening/
│       └── ...
├── latest-digest.md       # 最新一期日报（快捷访问）
└── ops-state.json         # Agent 运营状态
```

`data/` 和 `site/src/data/*.json` 现在是本地运行缓存/历史回填输入，已从 Git 跟踪中移除并由 `.gitignore` 忽略。生产数据源是 Cloudflare D1；采集、摘要和 ops-state 回填通过 `/api/ingest`、`/api/digest`、`/api/ops-state` 这些受保护 API 入库。

## Site

生产站点基于 `apps/web` 的 Next/OpenNext 应用，部署到 Cloudflare Worker，内容从 D1 读取。

- 中文 + 英文双语（翻译由 SiliconFlow Qwen3-8B 完成）
- 首页展示最新日报并支持分页，归档页按日期分页浏览
- 受保护 API 支持采集、摘要和 ops-state 写入
- OG 图片自动抓取

旧 `site/` Astro 项目保留为短期回退/应急重建路径，不再是生产主路径。

## Agent 运营

本项目设计为 **Agent 自主运营**。任何 AI Agent 只需读 `ONBOARD.md` 即可完成入职并开始工作。

运营协议定义在 `AGENT-PROTOCOL.md`，包含 9 个阶段：

| Phase | 名称 | 类型 | 说明 |
|-------|------|------|------|
| 1 | RESTORE | 机械 | 读取上次运营状态 |
| 2 | COLLECT | 机械 | 调用 reado CLI 采集 |
| 3 | ANALYZE | 决策 | 源健康检查 + 覆盖度分析 |
| 4 | FEEDBACK | 决策 | 处理 GitHub Issues 反馈 |
| 5 | GENERATE | 创作 | 生成结构化日报 |
| 6 | BUILD | 机械 | 构建网站数据 |
| 7 | PERSIST | 机械 | 持久化运营状态 |
| 8 | PUBLISH | 机械 | 写入 D1/API + 飞书群 |
| 9 | HEAL | 决策 | 故障诊断与自愈 |

配套 7 个 Agent Skills 在 `skills/` 目录下，覆盖各阶段的专业能力。

## Toolchain

| 工具 | 职责 | 必需 |
|------|------|------|
| [reado](https://github.com/dolphin-molt/reado) | 信息源采集 CLI | Yes |
| [gh](https://cli.github.com) | GitHub 运维 | Yes |
| [lark-cli](https://github.com/nicepkg/lark-cli) | 飞书运营 | No |
| [opencli](https://github.com/nicepkg/opencli) | 社交平台采集 | No |

## CI/CD

| Workflow | 触发 | 说明 |
|----------|------|------|
| `collect.yml` | cron + manual | 云端数据采集，并通过 D1 API 入库 |
| `deploy-web-cloudflare.yml` | push + manual | 验证并部署 Cloudflare Worker |
| `deploy-site.yml` | manual / legacy paths | 旧 GitHub Pages 回退部署 |
| `on-feedback.yml` | Issue 打标 `agent-todo` | 通知 Agent 处理用户反馈 |

## License

MIT
