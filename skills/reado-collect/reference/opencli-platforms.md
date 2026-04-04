# opencli 平台参考

opencli 提供 30+ 平台数据采集。reado 通过 opencli adapter 调用。

## 安装
```bash
npm install -g opencli
```

## 已支持平台

### 社交媒体（strategy: cookie — 需 Chrome）
| 平台 | 命令 | 说明 |
|------|------|------|
| Twitter | `twitter trending` | 热门话题 |
| 微博 | `weibo hot` / `weibo search {q}` | 热搜 |
| 知乎 | `zhihu hot` / `zhihu search {q}` | 热榜 |
| 抖音 | `douyin hashtag` | 热门话题 |
| TikTok | `tiktok trending` | Trending |
| 小红书 | `xiaohongshu hot` | 热门笔记 |

### 内容平台（strategy: api — 无需浏览器）
| 平台 | 命令 | 说明 |
|------|------|------|
| B站 | `bilibili hot` / `search {q}` | 热门/搜索 |
| Bluesky | `bluesky trending` | 热帖 |
| Medium | `medium feed` | 文章 |
| Product Hunt | `producthunt hot` | 产品 |
| Dev.to | `devto top` | 文章 |
| Lobsters | `lobsters hot` | 链接 |
| V2EX | `v2ex hot` | 话题 |
| 36氪 | `36kr hot` | 新闻 |
| 雪球 | `xueqiu hot` / `hot-stock` | 热帖/热股 |

### Strategy
- `api` — 纯 HTTP，可并发
- `cookie` — 需 Chrome + 登录态，串行
- `rss` — 纯 RSS

### 不支持的平台
如果 opencli 没有对应命令 → 用 RSS 或 Google News RSS 兜底。
