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

## 约束

1. **不编造内容** — 所有信息必须来自 raw.json，不凭记忆补充
2. **每条带来源 URL** — 读者可以点击验证
3. **由你自己生成** — 不调外部 LLM API，这是你作为 Agent 的核心产出
4. **中文输出** — 日报面向中文用户
5. **结构清晰** — 重大新闻 → 公司动态 → Twitter 精选 → 开源项目 → 社区热点 → 统计
