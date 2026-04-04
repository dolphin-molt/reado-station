# Agent 入职指南

> **你是一个即将运营 reado-station 的 AI Agent。按本文档完成入职，然后开始工作。**
>
> 本文件公网地址：`https://raw.githubusercontent.com/dolphin-molt/reado-station/main/ONBOARD.md`

---

## 第一步：克隆项目

```bash
git clone https://github.com/dolphin-molt/reado-station.git
cd reado-station
```

如果本地已存在，直接 `cd` 进去并 `git pull`。

---

## 第二步：读取清单

```bash
cat agent.manifest.json
```

这是你的依赖清单，类似 package.json，声明了运营本项目需要的所有工具、技能包和配置文件。

---

## 第三步：安装依赖

### 3.1 项目依赖

```bash
npm install
```

### 3.2 CLI 工具

按 `agent.manifest.json` 的 `tools` 列表逐个安装。对每个工具：

1. 先用 `verify` 命令检查是否已安装
2. 未安装 → 执行 `install` 命令
3. `required: true` 的必须装，`required: false` 的按需（缺失不阻塞运营，功能降级）

快速检查：
```bash
reado --version        # 必须
gh auth status         # 必须
opencli --version      # 可选（社交平台采集）
lark-cli auth status   # 可选（飞书推送）
```

### 3.3 技能包

```bash
bash skills/install.sh
```

技能包安装到 `~/.claude/skills/`，后续会话自动加载。

---

## 第四步：读取配置

```bash
cat agent.config.json
```

所有路径、仓库地址、运行参数都在这里。记住关键路径：

| 配置项 | 含义 |
|--------|------|
| `paths.station` | 本项目根目录 |
| `paths.reado` | reado CLI 项目目录（修改信息源时用） |
| `github.repo` | GitHub 仓库标识 |
| `lark.chatId` | 飞书群 ID |

---

## 第五步：学习运营协议

```bash
cat AGENT-PROTOCOL.md
```

这是你的**工作手册**，定义了 9 个 Phase 的完整运营循环：

```
RESTORE → COLLECT → ANALYZE → FEEDBACK → GENERATE → BUILD → PERSIST → PUBLISH → HEAL
```

每个 Phase 做什么、读什么文件、写什么文件、出错怎么办，全在里面。

---

## 第六步：恢复记忆

```bash
cat data/ops-state.json
```

这是上一任 Agent 留下的交接记录。了解：
- 哪些源最近失败了
- 有没有未处理的待办
- 上次运行的时间和结果

---

## 第七步：开始工作

入职完成。现在按 `AGENT-PROTOCOL.md` 的 Phase 1-9 执行运营循环。

---

## 文件导航

| 文件 | 作用 | 何时读 |
|------|------|--------|
| `ONBOARD.md` | 入职指南（本文件） | 第一次 |
| `agent.manifest.json` | 依赖清单 | 第一次 |
| `agent.config.json` | 运行配置 | 每次 |
| `AGENT-PROTOCOL.md` | 运营协议（工作手册） | 每次 |
| `data/ops-state.json` | 运营状态（记忆） | 每次 |
| `prompts/*.md` | 日报生成模板 | 生成日报时 |

---

## 故障排除

| 问题 | 解法 |
|------|------|
| `reado: command not found` | `npm install -g @dolphin-molt/reado` |
| `gh: not authenticated` | `gh auth login` |
| `lark-cli: permission denied` | `lark-cli auth login --scope "im:message"` |
| `npm install` 报错 | 检查 Node.js >= 18：`node --version` |
| `ops-state.json` 不存在 | 正常，首次运行按空状态处理 |
