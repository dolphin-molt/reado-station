---
name: station-publish
description: |
  reado-station Phase 8 PUBLISH — 推送到 GitHub + 飞书群。
  构建完成后加载。
---

# Phase 8: PUBLISH — 发布

## 8.1 推送到 GitHub

```bash
cd {config.paths.station}
git add data/ site/src/data/ site/public/images/
git commit -m "data: YYYY-MM-DD {batch} collection + digest"
git push
```

GitHub Actions 会自动触发网站部署。

## 8.2 推送日报到飞书群

将 digest.md 推送到飞书群，让用户被动接收：

```bash
PATH="/opt/homebrew/bin:$PATH" {config.lark.cli} im +messages-send \
  --chat-id "{config.lark.chatId}" \
  --markdown "$(cat data/YYYY/MM/DD/{batch}/digest.md)"
```

如果 digest.md 太长（飞书单条消息限制约 4000 字），截取"重大新闻"部分发送，末尾附：

```
📡 完整日报: {config.github.siteUrl}
```

## 8.3 故障告警

当本次运行产生了 `escalated` 或 `recurring` 级别故障时，发送告警（详见 station-heal 技能）。

## 前置条件

- `lark-cli` 已安装且已认证（`lark-cli auth status`）
- 如果 lark-cli 不可用 → 跳过飞书推送，只做 GitHub push，不报错
