# 信息源配置参考

## SourceConfig 字段

```typescript
{
  id: string              // 唯一标识
  name: string            // 显示名
  adapter: AdapterType    // 适配器
  url: string             // RSS URL / 主页
  hours: number           // 时间窗口（小时）
  topics: string[]        // 关键词，[] = 不过滤
  enabled: boolean        // 是否启用
  category?: string       // 分类
  googleNewsQuery?: string  // rss 专用：Google News 搜索词
  command?: string[]        // opencli 专用：命令参数
  strategy?: 'api' | 'cookie' | 'rss'  // opencli 策略
  searchable?: boolean      // 是否支持搜索
  searchCommand?: string[]  // 搜索命令模板
}
```

## 适配器

| adapter | 说明 | 例 |
|---------|------|----|
| `rss` | RSS/Atom | OpenAI, TechCrunch, arXiv |
| `hackernews` | HN API | hackernews |
| `reddit` | Reddit | reddit-ml |
| `github-trending` | GitHub Trending | github-trending |
| `twitter` | Nitter RSS | tw-karpathy |
| `telegram` | TG 频道 | tg-aibrief |
| `opencli` | opencli 透传 | weibo-hot, zhihu-hot |

## 各类配置示例

### RSS
```json
{ "id": "openai", "name": "OpenAI Blog", "adapter": "rss", "url": "https://openai.com/news/rss.xml", "hours": 24, "topics": ["GPT", "Agent"], "enabled": true, "category": "AI公司" }
```

### Google News RSS（无直接 RSS）
```json
{ "id": "anthropic", "name": "Anthropic", "adapter": "rss", "url": "https://news.google.com/rss/search?q=site:anthropic.com&hl=en&gl=US&ceid=US:en", "hours": 168, "topics": [], "enabled": true, "category": "AI公司", "googleNewsQuery": "site:anthropic.com" }
```

### Twitter
```json
{ "id": "tw-karpathy", "name": "@karpathy", "adapter": "twitter", "url": "https://x.com/karpathy", "hours": 24, "topics": [], "enabled": true, "category": "社交媒体" }
```
同时添加到 `~/.reado/twitter-watchlist.txt`

### Reddit
```json
{ "id": "reddit-ml", "name": "r/MachineLearning", "adapter": "reddit", "url": "https://www.reddit.com/r/MachineLearning", "hours": 24, "topics": [], "enabled": true, "category": "社区" }
```

### GitHub Release
```json
{ "id": "dify-release", "name": "Dify Release", "adapter": "rss", "url": "https://github.com/langgenius/dify/releases.atom", "hours": 168, "topics": [], "enabled": true, "category": "开发者" }
```

### opencli (cookie)
```json
{ "id": "weibo-hot", "name": "微博热搜", "adapter": "opencli", "url": "", "command": ["weibo", "hot", "--limit", "30"], "strategy": "cookie", "hours": 6, "topics": [], "enabled": true, "category": "社交媒体" }
```

### opencli (api)
```json
{ "id": "producthunt", "name": "Product Hunt", "adapter": "opencli", "url": "", "command": ["producthunt", "hot", "--limit", "20"], "strategy": "api", "hours": 24, "topics": [], "enabled": true, "category": "产品发现" }
```

## ID 命名

| 平台 | 前缀 | 例 |
|------|------|----|
| Twitter | `tw-` | `tw-sama` |
| Reddit | `reddit-` | `reddit-locallama` |
| YouTube | `yt-` | `yt-lex-fridman` |
| Telegram | `tg-` | `tg-aigclink` |
| arXiv | `arxiv-` | `arxiv-cs-ai` |
| Release | `*-release` | `claude-code-release` |
| AI 公司 | 公司名 | `openai`, `deepseek` |

## Bundle

新增 AI 领域源后，加入 `config/bundles.json` 的 `ai` bundle 的 sources 数组。
