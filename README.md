# reado-station

> 一个人读不完世界，一群人可以。Read All. Miss Nothing.

AI 情报站运营平台。从 165+ 信息源自动采集 AI 资讯，生成结构化日报，分发到飞书群和静态网站。

## Quick Start

```bash
# 1. 安装依赖
npm install

# 2. 安装 reado CLI
npm install -g reado

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env，至少填写 ANTHROPIC_API_KEY

# 4. 运行采集 + 摘要
npm run pipeline
```

## Architecture

```
reado CLI (165+ 源) → collect.ts → raw.json → summarize.ts (Claude API) → digest.md
                                                                              ↓
                                                                     飞书群 / 网站
```

### 混合采集

| 环境 | 采集范围 | 时间 |
|------|---------|------|
| 本地 Mac (launchd) | cookie 源 ~30 个 (opencli) | 07:50 / 17:50 |
| 云端 GitHub Actions | RSS/API 源 ~100 个 | 08:00 / 18:00 |

### 工具链

| 工具 | 职责 |
|------|------|
| **reado** | 信息源采集、过滤、格式化 |
| **opencli** | 社交平台采集 (Twitter, 微博等) |
| **Claude API** | 摘要生成、内容精选 |
| **lark-cli** | 飞书运营 (IM, 文档, 多维表格) |
| **gh** | GitHub 运维 |

## Scripts

| 脚本 | 说明 |
|------|------|
| `scripts/sync-sources.ts` | 从飞书多维表格同步信息源配置 |
| `scripts/collect.ts` | 数据采集 (`--mode cloud\|local\|all`) |
| `scripts/summarize.ts` | AI 摘要生成 |
| `scripts/local-collect.sh` | 本地 Mac 定时采集 |

## Data Structure

```
data/
└── 2026/04/03/
    ├── morning/
    │   ├── local.json    # 本地 cookie 源
    │   ├── raw.json      # 全量合并数据
    │   └── digest.md     # AI 精选日报
    └── evening/
        └── ...
```

## License

MIT
