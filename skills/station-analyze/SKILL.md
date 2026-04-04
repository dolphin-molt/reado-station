---
name: station-analyze
description: |
  reado-station Phase 3 ANALYZE — 源健康检查 + 覆盖度分析 + 执行待办。
  当采集完成后、raw.json 存在失败源或需要评估覆盖度时加载。
---

# Phase 3: ANALYZE — 分析

采集完成后，分析数据质量并维护信息源生态。

## 3.1 源健康检查

读取 `data/YYYY/MM/DD/{batch}/raw.json` 的 `stats` 字段：

```json
{ "stats": { "totalSources": 4, "successSources": 3, "failedSources": 1, "failedSourceIds": ["tw-karpathy"] } }
```

**规则：**

- `failedSources > 0` → 对每个失败源，更新 `ops-state.json` 的 `sourceHealth[id].consecutiveFailures += 1`，记录 `lastFailure`
- 连续失败 ≥ `{config.sourceHealth.maxConsecutiveFailures}` 次 → 创建 pendingAction：
  ```json
  { "type": "disable-source", "payload": { "sourceId": "tw-karpathy" }, "reason": "连续失败 3 次", "createdAt": "ISO-8601" }
  ```
- 之前失败的源本次成功了 → `consecutiveFailures = 0`，更新 `lastSuccess`

## 3.2 覆盖度分析

扫描 raw.json 的 `items` 数组：

1. **新实体发现**：出现频率 ≥ 3 次但不在当前源配置中的公司/产品/人名 → 创建 pendingAction `add-source`
2. **分类失衡**：某分类条目数 < 总量的 5% 且历史上通常 > 10% → 记录到 `recentGaps`
3. **Twitter KOL**：新出现的高影响力用户（被多人转引）→ pendingAction `add-twitter`

## 3.3 执行待办

逐条处理 `ops-state.json` 的 `pendingActions`：

| type | 操作 |
|------|------|
| `add-source` | 编辑 `{config.paths.reado}/config/default-sources.json`，追加源配置。格式见 reado-collect 技能包。 |
| `add-twitter` | 编辑 `{config.paths.twitterWatchlist}` 添加 handle + default-sources.json 添加 `tw-xxx` |
| `disable-source` | 在 default-sources.json 中设 `"enabled": false` |
| `add-to-bundle` | 编辑 `{config.paths.reado}/config/bundles.json`，把 sourceId 加入对应 bundle 的 sources 数组 |

执行后：
- 成功 → 移到 `completedActions`，`result: "success"`
- 失败 → 移到 `completedActions`，`result: "failed"`，记录原因

如果改了 reado 配置文件：
```bash
cd {config.paths.reado}
git add config/
git commit -m "sources: <描述>"
```
