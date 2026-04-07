# reado-station

> Read All. Miss Nothing.

AI 情报站自主运营平台。从 165 个信息源自动采集全球 AI/科技资讯，生成结构化日报，发布到[网站](https://reado.theopcapp.com)和飞书群。

全流程由 Agent 自主运营 — 采集、分析、生成、构建、发布、故障自愈，无需人工介入。

## Quick Start

```bash
npm install
npm run pipeline:auto   # 采集 + 摘要一条龙
```

本地开发网站：

```bash
npm run build:site-no-translate
cd site && npx astro dev
```

> Secrets 全部在 GitHub Repository Secrets，本地开发无需 `.env` 文件。详见 `.env.example`。

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
                   │                            GitHub    飞书  │
                   │                            Pages     群   │
                   └─────────────────────────────────────────┘
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
| `npm run build:site` | 构建静态网站（含翻译） |
| `npm run build:site-no-translate` | 构建静态网站（跳过翻译） |
| `npm run publish:lark` | 推送日报到飞书群 |
| `npm test` | 运行测试 (Vitest) |

## Data Structure

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

## Site

基于 [Astro](https://astro.build) 的静态网站，部署在 GitHub Pages。

- 中文 + 英文双语（翻译由 SiliconFlow Qwen3-8B 完成）
- 首页展示最新日报，归档页可按日期浏览
- OG 图片自动抓取

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
| 8 | PUBLISH | 机械 | 推送到 GitHub + 飞书群 |
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
| `collect.yml` | cron + manual | 云端数据采集 |
| `deploy-site.yml` | collect 完成 / push | 构建并部署到 GitHub Pages |
| `on-feedback.yml` | Issue 打标 `agent-todo` | 通知 Agent 处理用户反馈 |

## License

MIT
