---
name: station-publish
description: |
  reado-station Phase 8 PUBLISH — 确认 D1 写入 + 飞书群推送。
  构建完成后加载。
---

# Phase 8: PUBLISH — 发布

## 8.1 仓库不再发布运行数据

`data/` 和 `site/src/data/*.json` 是本地缓存/回填源，不能再提交到仓库。

采集和摘要应通过受保护 API 入库：

- collection → `/api/ingest`
- digest → `/api/digest`
- ops-state → `/api/ops-state`

机械脚本已禁用数据提交：

```bash
npx tsx scripts/ops-runner.ts publish
```

预期输出是 `status: "skip"`，表示运行数据发布走 D1，不走 Git。

## 8.2 确认 D1 和线上站点

发飞书前先确认生产站能读到 D1：

```bash
curl -fsS https://reado-station-web.cing-self.workers.dev/api/health
```

如果 health 不是 `status: ok` 或 `contentSource: d1`，记录故障并加载 `station-heal`。

## 8.3 推送日报到飞书群

将 digest.md 推送到飞书群，让用户被动接收：

```bash
{config.lark.cli} im +messages-send --as bot \
  --chat-id "{config.lark.chatId}" \
  --markdown "$(cat data/YYYY/MM/DD/{batch}/digest.md)"
```

如果 digest.md 太长（飞书单条消息限制约 4000 字），截取"重大新闻"部分发送，末尾附：

```
📡 完整日报: {config.github.siteUrl}
```

## 8.4 故障告警

当本次运行产生了 `escalated` 或 `recurring` 级别故障时，发送告警（详见 station-heal 技能）。

## 前置条件

- `lark-cli` 已安装且已认证（`lark-cli auth status`）
- 如果 lark-cli 不可用 → 跳过飞书推送，不要尝试把运行数据提交到 Git
