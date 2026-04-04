---
name: reado-collect
description: |
  AI 情报采集 + 信息源动态维护。使用 reado CLI 从 165+ 信息源采集资讯，动态发现和维护信息源。
  触发词：采集数据、信息采集、AI日报、添加信息源、信息源维护、reado collect、帮我采集
---

# reado-collect — 情报采集技能包

用 reado CLI 采集 AI/科技资讯，并动态维护信息源生态。

**这是一个纯采集技能**，不涉及网站构建、发布、部署。采集到的数据交给下游消费（网站、飞书、邮件等）。

## 前置条件

```bash
# 必须
npm install -g @dolphin-molt/reado

# 可选（Twitter/微博/知乎等社交平台）
npm install -g opencli
```

## 快速采集

```bash
# AI 全量（66 源）
reado search --bundle ai -t 24 --no-cache -f json

# 全平台热榜
reado hot -f json

# Twitter 关注列表
reado twitter timeline -t 24 -f json

# GitHub Trending
reado github trending

# HN 热帖
reado hackernews top -f json
```

## 信息源维护

**核心能力**：信息源是动态增长的。新公司、新 KOL、新平台每天都在出现。

### 发现缺口 → 添加源

当发现某条信息没被覆盖时：

1. **找到源端点**（优先级从高到低）：
   - 直接 RSS：`/rss`、`/feed`、`/atom.xml`
   - Google News RSS：`https://news.google.com/rss/search?q=site:domain.com`
   - opencli 适配器（社交平台）
   - GitHub releases.atom（项目追踪）

2. **添加到配置**：编辑 `{reado项目}/config/default-sources.json`
   ```json
   {
     "id": "new-source",
     "name": "New Source",
     "adapter": "rss",
     "url": "https://example.com/rss.xml",
     "hours": 24,
     "topics": ["AI"],
     "enabled": true,
     "category": "AI公司"
   }
   ```

3. **加入 bundle**：如果是 AI 领域，编辑 `config/bundles.json`

4. **Twitter**：编辑 `~/.reado/twitter-watchlist.txt` + 添加 `tw-xxx` 到 default-sources.json

5. **验证**：`reado sources test new-source`

### 配置格式详见

- `reference/source-config.md` — SourceConfig 完整字段和各类示例
- `reference/opencli-platforms.md` — opencli 30+ 平台命令参考

## reado 命令速查

```bash
# 信息检索
reado search --bundle ai           # AI bundle
reado search -s openai anthropic   # 指定源
reado search --topics "GPT,Claude" # 关键词

# 平台热榜
reado hackernews top / best
reado reddit hot
reado github trending
reado weibo hot
reado zhihu hot

# Twitter 管理
reado twitter watch @username
reado twitter unwatch username
reado twitter watchlist
reado twitter timeline

# 源管理
reado sources list
reado sources test <id>
reado sources enable/disable <id>
reado bundles list / show ai

# 通用选项
# -t 24/48/7d  -f table/json/markdown/html  -l 100  --no-cache
```

## 输出格式

```json
{
  "title": "...",
  "url": "https://...",
  "summary": "...",
  "publishedAt": "ISO-8601",
  "source": "source-id",
  "sourceName": "Source Name"
}
```

## 约束

1. **reado 是唯一的采集工具** — 不直接调 RSS 库或 fetch URL
2. **新增源先测试** — `reado sources test <id>`
3. **修改提交到 reado 仓库** — 不是消费端仓库
4. **ID 命名规范**：`tw-xxx`、`reddit-xxx`、`tg-xxx`、`yt-xxx`、`arxiv-xxx`
