---
name: station-generate
description: |
  reado-station Phase 5 GENERATE — 基于 raw.json 生成结构化日报。
  每次运行的 GENERATE 阶段加载。
---

# Phase 5: GENERATE — 生成日报

## 输入

- `data/YYYY/MM/DD/{batch}/raw.json` — 采集的原始数据
- `prompts/digest-intro.md` — 日报开头模板
- `prompts/summarize-news.md` — 新闻摘要规范
- `prompts/summarize-tweets.md` — Twitter 内容摘要规范
- `prompts/summarize-opensource.md` — 开源项目摘要规范

## 流程

1. 读取上述所有 prompt 文件
2. 读取 raw.json，按 source 类型分组（新闻/Twitter/开源/社区）
3. 按各 prompt 模板的规范，生成对应章节
4. 组装为完整日报

## 输出

保存到两个位置：

```
data/YYYY/MM/DD/{batch}/digest.md          # 项目内归档
{config.paths.dailyOutput}/YYYY-MM-DD{-evening}.md  # 日报输出目录
```

evening 批次文件名加 `-evening` 后缀。

## digest.md 结构要求

```markdown
# AI 日报 · YYYY-MM-DD

> 采集时间 HH:MM UTC | 信息源: N | 条目: N

## 今日观察

一段 150-300 字的连贯文本，综合解读今天 AI 领域最值得关注的趋势和事件。
不分人物、不分小节，不提及任何具体人物名字。
融合安全、商业、技术、产业、开源等多个视角，帮助读者理解新闻背后的脉络。
语气专业但易读，像一位资深科技记者的综述。

---

## 重大新闻
### 新闻标题
**来源**: [Name](url) · [Name](url)
正文摘要...
> 影响评估: 一句话评估

---

## 公司动态
### ...

## 论文与开源
### ...

## 社区热点
### ...

## 采集统计
| 指标 | 数值 |
|------|------|
| ... | ... |
```

**关键**: `## 今日观察` 段必须在 `## 重大新闻` 之前。构建脚本会解析此段生成网站的"今日观察"模块。

## 网站如何消费 digest.md

`build-site-data.ts` 解析 digest.md → `site/src/data/digests.json`，包含：
- `observationText` — 今日观察（一段连贯的综合解读文本）
- `clusters[]` — 话题聚合（重大新闻/公司动态/论文等分组 + 每组的 stories）

网站展示：
- **今日必看**（Hero 轮播）— 从 clusters 取前 8 条重要新闻，支持侧滑
- **今日观察** — 一段综合解读文本
- **全部资讯** — items.json 的分类筛选列表

## 约束

1. **不编造内容** — 所有信息必须来自 raw.json，不凭记忆补充
2. **每条带来源 URL** — 读者可以点击验证
3. **由你自己生成** — 不调外部 LLM API，这是你作为 Agent 的核心产出
4. **中文输出** — 日报面向中文用户
5. **结构清晰** — 今日观察 → 重大新闻 → 公司动态 → 论文与开源 → 社区热点 → 统计
6. **今日观察必须生成** — 这是网站首页的重要模块，不可省略
