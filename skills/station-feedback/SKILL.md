---
name: station-feedback
description: |
  reado-station Phase 4 FEEDBACK — 处理 GitHub Issues 中的用户反馈。
  当存在 label 为 agent-todo 的 open Issue 时加载。
---

# Phase 4: FEEDBACK — 处理用户反馈

## 查询待处理 Issue

```bash
gh issue list --repo {config.github.repo} --label {config.github.feedbackLabel} --state open --json number,title,body,labels,createdAt
```

如果返回空数组 → 跳过本阶段。

---

## 第一步：分级

先判断每个 Issue 的**紧急程度**和**处理类型**：

### 紧急程度

| 级别 | 判断条件 | 响应时间 |
|------|---------|---------|
| 🔴 紧急 | 采集完全中断 / 日报没发出 / 网站挂了 / 数据丢失 | 立即处理 |
| 🟡 重要 | 某个源采集失败 / 日报内容有误 / 翻译出错 | 当次循环内处理 |
| 🟢 普通 | 建议加源 / 功能建议 / 改进意见 | 记录，按优先级排队 |

### 处理类型

| 类型 | 判断依据 | 处理方式 |
|------|---------|---------|
| **可自主完成** | 加信息源、修 config、禁用异常源、修正数据 | 直接做，做完评论 |
| **需要改代码** | 修 scripts、改 prompts、改网站模板、改工作流 | 走审批流程（见下） |
| **需要人工介入** | 需要外部账号权限、第三方服务配置、付费决策 | 标记等待，说明原因 |

---

## 第二步：按类型处理

### source-request（信息源请求）→ 可自主完成

1. 搜索该信息源的 RSS/API 地址
2. 测试能否正常采集（`reado search --source xxx --limit 3`）
3. 能 → 添加到 `config/sources.json`，git commit + push
4. 不能 → 说明原因（无 RSS、需要登录、地区限制等）
5. 评论处理结果 → 关闭 Issue

### bug（问题报告）→ 分级处理

**🔴 紧急 bug**（采集中断、日报未发、网站挂）：
1. 立即诊断：检查日志、ops-state.json、最近 commit
2. 能自己修（config 问题、已知 pattern）→ 直接修 + 评论
3. 需要改代码 → **走审批流程**
4. **不关闭 Issue**，直到确认修复

**🟡 重要 bug**（单源失败、内容有误）：
1. 定位问题源
2. config 层面能修 → 直接修（禁用源、修 URL、调参数）
3. 评论具体做了什么
4. 如果是数据错误 → 修正当期数据，评论修正内容

**🟢 普通 bug**：
1. 记录到 ops-state.json 的 incidents
2. 评论"已记录，排期处理"
3. 不关闭

### enhancement / suggestion（功能建议）→ 评估后决定

1. **评估影响范围**：
   - 只需改 config → 可自主完成
   - 需要改 scripts/prompts/site → 走审批流程
   - 超出能力范围 → 标记需人工介入

2. **评估可行性**：
   - 与现有架构是否兼容
   - 工作量评估（小/中/大）
   - 有无副作用

3. 评论评估结果

---

## 第三步：审批流程（需要改代码时）

**当判断需要改代码时，不要直接改。** 执行以下流程：

### 3.1 在飞书群里发起审批

用 lark-cli 在群里发消息，格式：

```
📋 需求评估 — Issue #{N}

来源：{提交者姓名}（{邮箱}）
类型：{source-request / bug / enhancement}
内容：{一句话概括}

📊 我的评估：
- 影响范围：{涉及哪些文件/模块}
- 工作量：{小/中/大}
- 风险：{低/中/高}
- 方案：{具体打算怎么改，1-3 条}

⚠️ 需要你确认后我才开始改。回复「可以」我就动手。
```

### 3.2 等待确认

在 Issue 上评论：

```
📋 已完成评估，方案已发到飞书群等待审批。
```

给 Issue 加上 `awaiting-approval` label：

```bash
gh issue edit {N} --repo {config.github.repo} --add-label "awaiting-approval"
```

移除 `agent-todo` label（避免重复处理）：

```bash
gh issue edit {N} --repo {config.github.repo} --remove-label "agent-todo"
```

### 3.3 收到确认后执行

当 dolphin 在群里回复确认后：
1. 按方案修改代码
2. git commit + push
3. 如有 CI → 等 CI 通过
4. 在 Issue 上评论具体改了什么
5. 关闭 Issue
6. 移除 `awaiting-approval` label

---

## 评论规范

每个 Issue 处理后**必须**评论，格式：

**自主完成的：**
```
✅ 已处理

{具体做了什么}

---
🤖 由 reado-station agent 自动处理
```

**需要审批的：**
```
📋 已完成评估，方案已发到飞书群等待审批。

**评估摘要：**
- 影响范围：{xxx}
- 方案：{xxx}
- 预计工作量：{小/中/大}

---
🤖 由 reado-station agent 自动处理
```

**无法处理的：**
```
⏸️ 需要人工介入

原因：{为什么无法自动处理}
建议：{人工应该做什么}

---
🤖 由 reado-station agent 自动处理
```

---

## 关闭规则

| 情况 | 是否关闭 |
|------|---------|
| source-request 已加源 | ✅ 关闭 |
| source-request 无法加（无 RSS 等） | ✅ 关闭（评论说明原因） |
| bug 已修复确认 | ✅ 关闭 |
| bug 未修复 | ❌ 不关闭 |
| enhancement 已完成 | ✅ 关闭 |
| enhancement 等待审批 | ❌ 不关闭 |
| 需要人工介入 | ❌ 不关闭 |

---

## 记录

处理完的 Issue 记录到 `ops-state.json`：

```json
{
  "feedbackProcessed": [{
    "issueNumber": 42,
    "severity": "normal",
    "action": "添加了 xxx 信息源",
    "type": "source-request",
    "requiresApproval": false,
    "processedAt": "ISO-8601"
  }]
}
```

更新 `stats.issuesProcessed += 1`。

---

## 飞书群汇报

处理完所有 Issue 后，在飞书群发一条汇总：

```
📬 反馈处理完成

- ✅ 已处理 {N} 条
- 📋 等待审批 {N} 条
- ⏸️ 需人工介入 {N} 条

{每条的简要说明}
```
