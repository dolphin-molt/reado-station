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

同时检查待办队列中是否有上次遗留的待处理项：

```bash
cat {station}/ops-state.json | jq '.backlog // []'
```

如果两者都为空 → 跳过本阶段。

---

## 第一步：分级

### 紧急程度

| 级别 | 判断条件 | 响应 |
|------|---------|------|
| 🔴 紧急 | 采集完全中断 / 日报没发出 / 网站挂了 / 数据丢失 | 立即处理 |
| 🟡 重要 | 某个源采集失败 / 日报内容有误 / 翻译出错 | 当次循环内处理 |
| 🟢 普通 | 建议加源 / 功能建议 / 改进意见 | 记录到 backlog，按优先级排队 |

---

## 第二步：判断是 bug 还是功能

这个区分决定了后续的处理权限。

### Bug（修复现有功能的缺陷）

**定义**：系统原本应该能做到的事情，但没做到或做错了。

| 例子 | 是 bug |
|------|--------|
| 采集脚本报 TypeError | ✅ |
| 日报生成时某个分类丢失了 | ✅ |
| 翻译结果乱码 | ✅ |
| 网站构建失败 | ✅ |
| RSS 源 URL 过期了 | ✅ |
| 飞书推送消息截断 | ✅ |

### 功能（新增能力或改变现有行为）

**定义**：系统原本就没有这个能力，或者要改变已有行为的方式。

| 例子 | 是功能 |
|------|--------|
| 新增一个信息源分类 | ✅ |
| 改变日报的排版风格 | ✅ |
| 新增一种采集适配器 | ✅ |
| 修改摘要的 prompt 策略 | ✅ |
| 增加用户交互能力 | ✅ |
| 改变发布时间或频率 | ✅ |

---

## 第三步：Bug 的自修权限

Bug 按修复难度再分两档：

### 可自主修复的 bug（直接改，不用审批）

**条件**：满足以下**全部**：
1. 改动范围明确，只涉及 1-2 个文件
2. 修复逻辑显而易见（错字、类型错误、变量名错、路径错、缺少 null check、格式问题）
3. 不改变任何业务逻辑或数据流向
4. 有明确的验证方式（能跑通 = 修好了）

**典型例子**：
- config 里的 URL 过期 → 更新 URL
- 脚本里 `item.title` 应该是 `item.name` → 改过来
- 缺少 `?.` 可选链导致 crash → 加上
- JSON 格式错误 → 修正格式
- import 路径错误 → 修正路径
- 环境变量名拼错 → 改正

### 需要审批的 bug（走审批流程）

**条件**：满足以下**任一**：
1. 需要改变函数签名、数据结构、接口定义
2. 涉及 3 个以上文件的联动修改
3. 修复方案有多种选择，不确定哪种最好
4. 涉及第三方 API 调用方式的改变
5. 可能影响其他功能的正常运行

---

## 第四步：处理流程

### source-request → 自主完成

1. 搜索该信息源的 RSS/API 地址
2. 测试能否正常采集（`reado search --source xxx --limit 3`）
3. 能 → 添加到 reado 仓库的 `config/default-sources.json`（见 reado-collect 技能），git commit + push
4. 不能 → 说明原因
5. 评论处理结果 → 关闭 Issue

### 简单 bug → 自主修复 + 验证

1. 定位问题（读日志、读代码）
2. 修复代码
3. **必须验证**（见验证章节）
4. 验证通过 → commit + push
5. 评论：改了什么、为什么、验证结果
6. 关闭 Issue

### 复杂 bug / 功能 → 审批流程

1. 评估影响范围和方案
2. 在飞书群发审批请求（见审批格式）
3. Issue 加 `awaiting-approval` label，移除 `agent-todo`
4. 等 dolphin 回复确认
5. 确认后：改代码 → **验证** → commit + push → 评论 → 关闭

### 🟢 普通建议 → 进入 backlog

不立即处理，记录到 `ops-state.json` 的 backlog：

```json
{
  "backlog": [{
    "issueNumber": 42,
    "title": "建议增加 xxx 功能",
    "type": "enhancement",
    "severity": "normal",
    "summary": "用户建议...",
    "addedAt": "ISO-8601",
    "status": "queued"
  }]
}
```

评论 Issue：

```
📋 已记录到待办队列，将在后续版本中评估。

优先级：普通
当前队列位置：第 {N} 位

---
🤖 由 reado-station agent 自动处理
```

**不关闭 Issue。**

### backlog 处理时机

每次运营循环的 Phase 4，在处理完新 Issue 后，检查 backlog：
- 如果当前没有紧急/重要任务，取 backlog 中最旧的一条尝试处理
- 每次最多处理 1 条 backlog 项
- 处理完 → 更新 backlog 状态为 `done` 或 `blocked`

---

## 验证机制

**改完代码后必须验证，这是硬性要求。**

### 验证步骤

```bash
# 1. 回归测试（必跑，无论改了什么）
cd {station}
npx vitest run 2>&1

# 2. TypeScript 编译检查
npx tsc --noEmit 2>&1

# 3. 运行受影响的脚本做冒烟测试
#    根据改动的文件决定跑什么：
#    - 改了 collect.ts → npx tsx scripts/collect.ts --dry-run（如果支持）
#    - 改了 summarize.ts → 用小数据集测试
#    - 改了 build-site-data.ts → npx tsx scripts/build-site-data.ts
#    - 改了 config/sources.json → reado sources test

# 4. 如果改了网站相关文件
cd {station}/site && npm run build 2>&1

# 5. git diff 最终确认改动范围
git diff --stat
```

**回归测试是第一步。** 如果回归测试失败，说明改动引入了新问题，必须先修复测试再继续。

**修 bug 时顺手补测试。** 每次修复一个 bug，在对应的 `.test.ts` 中添加一个回归用例，防止同类问题复发。

### 验证结果判定

| 结果 | 动作 |
|------|------|
| 全部通过 | commit + push |
| 编译失败 | 继续修复，直到通过 |
| 冒烟测试失败 | 回滚改动（`git checkout -- .`），标记为需审批 |
| 改动范围超出预期 | 停下来，走审批流程 |

### 验证记录

在 Issue 评论中必须包含验证结果：

```
✅ 已修复

**改动**：修复了 collect.ts 第 42 行的类型错误
**原因**：item.publishedAt 可能为 undefined，缺少空值检查
**验证**：
- ✅ tsc --noEmit 通过
- ✅ collect.ts --dry-run 成功采集 3 条测试数据
- ✅ git diff 确认只改了 1 个文件 1 行

---
🤖 由 reado-station agent 自动处理
```

---

## 审批请求格式

在飞书群发消息：

```
📋 需求评估 — Issue #{N}

来源：{提交者}
类型：{bug / enhancement}
紧急程度：{🔴/🟡/🟢}

📊 评估：
- 影响范围：{涉及哪些文件}
- 工作量：{小(< 30min) / 中(< 2h) / 大(> 2h)}
- 风险：{低(局部改动) / 中(多文件联动) / 高(核心流程变更)}
- 方案：
  1. {具体步骤}
  2. {具体步骤}

⚠️ 需要确认后才动手。回复「可以」我就开始。
```

---

## 评论规范

**自主完成的（含验证结果）：**
```
✅ 已处理

{做了什么}

**验证**：{验证结果}

---
🤖 由 reado-station agent 自动处理
```

**等待审批的：**
```
📋 已完成评估，方案已发到飞书群等待审批。

- 影响：{xxx}
- 方案：{xxx}
- 预计工作量：{小/中/大}

---
🤖 由 reado-station agent 自动处理
```

**进入 backlog 的：**
```
📋 已记录到待办队列。

优先级：普通
队列位置：第 {N} 位

---
🤖 由 reado-station agent 自动处理
```

**无法处理的：**
```
⏸️ 需要人工介入

原因：{为什么}
建议：{人工应该做什么}

---
🤖 由 reado-station agent 自动处理
```

---

## 关闭规则

| 情况 | 关闭？ |
|------|--------|
| source-request 已处理 | ✅ |
| 简单 bug 已修复 + 验证通过 | ✅ |
| 复杂 bug 审批通过 + 修复 + 验证通过 | ✅ |
| 等待审批 | ❌ |
| 进入 backlog | ❌ |
| 需要人工介入 | ❌ |

---

## 记录

```json
{
  "feedbackProcessed": [{
    "issueNumber": 42,
    "severity": "normal",
    "type": "bug",
    "classification": "self-fix",
    "action": "修复了 collect.ts 的类型错误",
    "verified": true,
    "verificationResult": "tsc pass, dry-run pass",
    "processedAt": "ISO-8601"
  }],
  "backlog": [{
    "issueNumber": 43,
    "title": "建议增加 xxx",
    "type": "enhancement",
    "severity": "normal",
    "summary": "...",
    "addedAt": "ISO-8601",
    "status": "queued"
  }]
}
```

---

## 飞书群汇报

处理完所有 Issue 后：

```
📬 反馈处理完成

- ✅ 已处理 {N} 条（含 {M} 条自主修复）
- 📋 等待审批 {N} 条
- 📋 进入待办 {N} 条
- ⏸️ 需人工 {N} 条

{每条简要说明}

待办队列：当前 {N} 项排队中
```
