---
name: ai-daily
description: |
  AI 日报生成。从 165+ 信息源采集 AI 资讯，生成结构化日报。
  触发词：AI日报、生成日报、今日AI、AI早报、AI简报、帮我生成日报、今天AI有什么新鲜事、ai daily report
---

# AI Daily Report — reado-station

从 165+ 信息源采集 AI 领域资讯，由执行 Agent 自身生成结构化 Markdown 日报。

## Prerequisites

### Required: reado CLI

```bash
npm install -g reado
```

### Optional: opencli (Twitter/社交平台)

```bash
npm install -g opencli
```

Twitter 部分需要 opencli + Chrome 登录 x.com。未安装则跳过 Twitter。

---

## Workflow

### Step 1: 数据采集

在 `reado-station/` 目录下运行采集脚本：

```bash
npx tsx scripts/collect.ts --mode all
```

模式说明：
- `--mode all` — 本地全量采集（默认，推荐）
- `--mode cloud` — 仅 RSS/API 源（无需 opencli）
- `--mode local` — 仅 cookie 源（Twitter 等）

脚本会自动：
1. 调用 `reado search --bundle ai` 采集 66 个 AI 信息源
2. 调用 `reado hackernews top` 采集 HN 热门
3. 调用 `reado search -s github-trending` 采集 GitHub Trending
4. （如有 opencli）调用 `reado twitter timeline` 采集 Twitter
5. 合并、去重，输出 `data/YYYY/MM/DD/{batch}/raw.json`

### Step 2: 读取数据

采集完成后，读取 raw.json 文件。路径格式：

```
data/YYYY/MM/DD/morning/raw.json   （14:00 前）
data/YYYY/MM/DD/evening/raw.json   （14:00 后）
```

JSON 结构：
```json
{
  "fetchedAt": "ISO-8601",
  "stats": { "totalSources", "successSources", "failedSources", "totalItems", "deduplicatedItems" },
  "items": [
    { "title", "url", "summary", "publishedAt", "source", "sourceName" }
  ]
}
```

### Step 3: 生成日报

**由你（执行此 skill 的 Agent）直接生成日报**，不调用外部 API。

按以下顺序读取 prompt 文件，遵循其中的格式和规则：

1. `prompts/digest-intro.md` — 日报整体结构、板块顺序、去重规则
2. `prompts/summarize-news.md` — 新闻/公司动态的多源聚合格式
3. `prompts/summarize-tweets.md` — Twitter 摘要格式
4. `prompts/summarize-opensource.md` — 开源项目/论文格式

**处理流程：**

1. **分类** — 按 source 字段分配板块：
   - `tw-*` / `twitter` → Twitter/X 精选
   - `github-trending*` / `arxiv*` / `hf-*` → 论文与开源
   - `hackernews` / `reddit*` / `v2ex` / `lobsters` → 社区热点
   - 其余 → 新闻/公司动态

2. **选重大新闻** — 从全部数据中选出当天最重要的 3-5 个事件，使用多源聚合格式

3. **去重** — 重大新闻中已覆盖的事件，不在其他板块重复

4. **按板块生成摘要**：
   - 重大新闻（多源聚合格式）
   - 公司动态（单源格式）
   - Twitter/X 精选
   - 论文与开源
   - 社区热点

5. **组装** — 按 `digest-intro.md` 的格式组装完整日报

### Step 4: 输出

1. 在终端完整打印日报
2. 保存到 `data/YYYY/MM/DD/{batch}/digest.md`
3. 保存到 `~/ai-daily/YYYY-MM-DD.md`

### Step 5: 提交（可选）

如果用户要求提交：

```bash
cd /path/to/reado-station
git add data/
git commit -m "data: YYYY-MM-DD {batch} collection + digest"
git push
```

---

## Constraints

1. **reado 是唯一的数据采集工具** — 不直接调用 RSS、web_fetch 等
2. **不调用外部 LLM API** — 摘要由执行 Agent 自身生成
3. **每条必须有来源 URL** — 不编造链接
4. **不编造内容** — 所有信息必须来自 raw.json
5. **时间窗口** — 默认 24h
