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
git add data/ site/src/data/ site/src/components/ site/src/styles/ site/public/images/
git commit -m "data: YYYY-MM-DD {batch} collection + digest"
git push
```

GitHub Actions 会自动触发 `deploy-site.yml` 网站部署。

## 8.2 等待部署完成

**push 之后、发飞书之前，必须确认部署成功。**

```bash
# 等待最近一次 deploy-site.yml 完成（最长 10 分钟）
npx tsx scripts/ops-runner.ts wait-deploy
```

如果没有 `wait-deploy` 命令，手动检查：

```bash
# 查最近一次 deploy-site 工作流状态
gh run list --repo {config.github.repo} --workflow deploy-site.yml --limit 1 --json status,conclusion,headBranch

# 或者轮询等待（最多 10 分钟，每 30 秒检查一次）
for i in $(seq 1 20); do
  STATUS=$(gh run list --repo {config.github.repo} --workflow deploy-site.yml --limit 1 --json conclusion -q '.[0].conclusion')
  if [ "$STATUS" = "success" ]; then
    echo "✅ 部署成功"
    break
  elif [ "$STATUS" = "failure" ]; then
    echo "❌ 部署失败"
    break
  fi
  sleep 30
done
```

| 部署结果 | 动作 |
|---------|------|
| success | 继续发飞书 |
| failure | 记录故障，仍然发飞书（告知网站部署失败，日报内容照常推送） |
| 超时 10 分钟 | 记录警告，照常发飞书 |

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
- 如果 lark-cli 不可用 → 跳过飞书推送，只做 GitHub push，不报错
