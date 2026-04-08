# AI 日报 · 2026-04-08

> 采集时间 00:24 | 信息源: 42 | 条目: 264

## 重大新闻

### Anthropic 发布 Claude Mythos Preview：发现所有主流操作系统和浏览器的零日漏洞，暂不公开

**来源**:
- 官方: [Anthropic Twitter](https://x.com/i/status/2041578392852517128) · [Anthropic Twitter](https://x.com/i/status/2041578403686498506) · [Anthropic Twitter](https://x.com/i/status/2041578395515953487)
- 媒体: [Wired](https://www.wired.com/story/anthropic-mythos-preview-project-glasswing/) · [The Verge](https://www.theverge.com/ai-artificial-intelligence/908114/anthropic-project-glasswing-cybersecurity) · [TechCrunch](https://techcrunch.com/2026/04/07/anthropic-mythos-ai-model-preview-security/) · [虎嗅](https://news.google.com/rss/articles/CBMiU0FVX3lxTE9qM1VCUEpKaXFpNlIyYXl4VXhWLThBd0plY2pldTQyTi1NcXVpZGRsM2lTekhkZjUwVGRnamxZUVFMTEpPVk9BZ2lneXI3ZVdkNkhn?oc=5) · [Kevin Roose/New York Times](http://www.techmeme.com/260407/p41#a260407p41)
- 社区: [Ethan Mollick](https://x.com/i/status/2041599677204750439) · [Simon Willison](https://simonwillison.net/2026/Apr/7/project-glasswing/) · [Lobsters](https://lobste.rs/s/aw2jr4/assessing_claude_mythos_preview_s)

**官方公告**: Anthropic 发布 Project Glasswing，这是一个紧急网络安全计划，由最新前沿模型 Claude Mythos Preview 提供支持。该模型已在所有主流操作系统和浏览器中发现数千个高危漏洞。Anthropic 不会公开发布 Mythos Preview，将向合作伙伴（AWS、Apple、Broadcom、Cisco、CrowdStrike、Google、JPMorganChase、Linux Foundation、Microsoft、NVIDIA、Palo Alto Networks 等）提供最高 1 亿美元的积分额度。

**媒体报道**: TechCrunch 指出，该模型将被少数高知名度公司用于防御性网络安全工作。Kevin Roose 在 NYT 采访中了解到，Anthropic 高管将 Mythos Preview 的发布描述为网络安全领域的"清算时刻"。The Verge 补充：该项目与 Nvidia、Google、AWS、Apple、Microsoft 等公司合作，利用 AI 模型测试并提升软件安全性。Wired 报道，Project Glasswing 将把包括 Apple、Google 在内的 45 个以上组织联合起来，共同使用 Claude Mythos Preview 测试 AI 安全能力。

**社区反应**: Ethan Mollick 指出，Mythos 的红队报告值得一读，且 Mythos 仍保留了 Claude 的一些特征，在多轮对话中"less philosophical"；Simon Willison 认为这一限制发布策略"听起来是必要的"；Lobsters 开发者社区就 Mythos 的网络安全能力展开讨论。

> 影响评估: AI 安全攻防博弈进入新阶段——头部 AI 实验室开始主动限制最强模型的能力，行业合作成为安全可控部署的关键路径。

---

### Z.ai 发布 GLM-5.1：754B 参数 MIT 许可开源模型，超越 GPT-5.4 与 Claude Opus 4.6

**来源**:
- 官方: [Z.ai Twitter](https://x.com/i/status/2041550153354519022)
- 媒体: [VentureBeat via Techmeme](http://www.techmeme.com/260407/p49#a260407p49) · [虎嗅](https://news.google.com/rss/articles/CBMiU0FVX3lxTE4xb21XeWk5MnhpcUNaN2lTYlNHSWJDMTNTZDdhNnZXbE1ReWhEQVZ3SnlBOTI4d1I5dlVjQUhsalBxcjZnS3dPcFB0LW5JRmFBaC1j?oc=5)
- 社区: [Clément Delangue](https://x.com/i/status/2041554501539103014) · [Simon Willison](https://simonwillison.net/2026/Apr/7/glm-51/#atom-everything)

**官方公告**: Z.ai 发布 GLM-5.1，754B 参数，采用 MIT 许可证开源。在 SWE-bench Pro 上以 58.4% 的得分排名第一（超过 GPT-5.4 和 Claude Opus 4.6），Vector-DB-Bench 中达到 21.5k QPS（6 倍性能提升），自主运行 8 小时完成 Linux Desktop 环境构建。

**媒体报道**: VentureBeat 报道，这是中国 AI 模型在 SWE-bench Pro 上的最佳成绩，也是当前开源模型在全球榜单上的最高排名。虎嗅同步报道，并指出该模型已上线 OpenRouter、Vercel、Requesty 等平台。

**社区反应**: HuggingFace CEO Clément Delangue 确认 GLM-5.1 在 HuggingFace 平台上已超越其他开源模型位居第一，并表示支持开源 AI 生态；Simon Willison 详细评测了 GLM-5.1，称其为"1.51TB 的庞然大物"。

> 影响评估: 中国开源大模型正式站上全球 Agentic 能力最高点，MIT 许可进一步扫清了商业应用障碍。

---

### Anthropic ARR 达 300 亿美元，牵手 Google 与 Broadcom 签署多千兆瓦 TPU 协议

**来源**:
- 媒体: [TechCrunch](https://techcrunch.com/2026/04/07/anthropic-compute-deal-google-broadcom-tpus/) · [Stratechery](https://stratechery.com/2026/anthropics-new-tpu-deal-anthropics-computing-crunch-the-anthropic-google-alliance/) · [虎嗅](https://news.google.com/rss/articles/CBMiU0FVX3lxTE9QbGdxMmJjcFFVcXhaQWpqNFpzMVBoemRIRGFkdzJBTklvUTZWY1pZbm02M1dTUXNPUHkzNEtwTFZHZ0pLY0hlZXF5OWpjWl9aTDVV?oc=5)

**官方公告**: Anthropic 宣布与 Google 和 Broadcom 签署多千兆瓦规模的新一代 TPU 容量协议，容量将于 2027 年上线。

**媒体报道**: TechCrunch 报道，Anthropic 的年化收入（ARR）已飙升至 300 亿美元，增速惊人。Stratechery 深度分析认为，Anthropic 需要算力，Google 有算力——这是一个天然的合作关系，Stratechery 创始人 Ben Thompson 更评论 Anthropic 的扩张是"AI 计算需求的缩影"。

**补充**: Anthropic 同时任命前微软 AI 平台负责人 Eric Boyd 为基础设施负责人，Eric Boyd 在微软工作 16 年，曾负责微软 AI 平台业务。

> 影响评估: Anthropic 商业化速度超预期，与 Google 的深度绑定反映 AI 基础设施竞争的格局已从"谁能做"升级为"谁能供"。

---

## 公司动态

### 英特尔加入 Elon Musk 的 Terafab AI 芯片项目

**来源**: [The Verge](https://www.theverge.com/transportation/907976/elon-musk-terafab-intel-ai-chip-spacex-tesla)

Elon Musk 的 Terafab AI 芯片项目获得关键新伙伴：英特尔正式宣布加入，与 SpaceX、xAI、特斯拉共同设计并建设位于德克萨斯州奥斯汀的超大规模 AI 芯片工厂。英特尔CEO陈福义表示，这将是英特尔参与的最具雄心的 AI 基础设施项目之一。

---

### Sam Altman 宣布 Codex 达 300 万周活用户，限额重置

**来源**: [Sam Altman Twitter](https://x.com/i/status/2041658719839383945)

Sam Altman 宣布 ChatGPT 生产力工具 Codex 达到 300 万周活跃用户里程碑，并宣布重置使用限额，每增长 100 万用户将重置一次，上限 1000 万用户。Altman 表示"祝大家创作愉快（Happy building!）"。

---

### Bing 发布 Harrier 开源嵌入模型，夺得多语言 MTEB-v2 榜首

**来源**: [Mustafa Suleyman Twitter](https://x.com/i/status/2041552243019980929) · [虎嗅](https://news.google.com/rss/articles/CBMiU0FVX3lxTFBBTl9kaUhCRDBwVVlDTXZ2emw2RE5fdVVxamNMS05YeDVHWHhQNGlKSTJ0OGoxSHdJRlNHYVNLMVhfb2xualZHOW5uZW9lMjk5OHVF?oc=5)

Microsoft Bing 团队发布 Harrier 开源嵌入模型，在行业标准多语言 MTEB-v2 基准测试中排名第一。Mustafa Suleyman 表示，嵌入是模型准确性的无名英雄，是搜索、检索、组织和连接信息的核心层，Bing 的网络检索已为目前几乎所有主流 AI 聊天机器人提供支持，Harrier 将进一步升级 Agent 时代的能力。

---

### Claude Code v2.1.94：默认 effort 升级为 high，支持 Bedrock Mantle

**来源**: [GitHub Release](https://github.com/anthropics/claude-code/releases/tag/v2.1.94)

Claude Code 发布 v2.1.94 版本：新增对 Amazon Bedrock Mantle 的支持（设置 CLAUDE_CODE_USE_MANTLE=1），API-key、Bedrock/Vertex/Foundry、Team 和 Enterprise 版本的默认 effort 级别从 medium 升级为 high。

---

### 美团、京东收紧外部 AI 使用权限

**来源**: [虎嗅](https://news.google.com/rss/articles/CBMiUEFVX3lxTFBZaUszaFItSlZjckI2YkdiMnBGLU5vcGVaMzJoVUFrT2t4dUowNC1FMEQ5YUo0RzQySkh0TUVaTkNMaEEtWl9hdHJtWUpFa3V1?oc=5) · [钛媒体](https://www.tmtpost.com/7944317.html)

钛媒体报道，美团、京东开始收紧员工使用外部 AI 工具的权限，禁止将内部数据上传至外部 AI 平台。这是继多家大型企业之后，又两家中国互联网巨头跟进 AI 数据安全政策。

---

### Uber 扩大 AWS 合约，转向亚马逊自研 AI 芯片

**来源**: [TechCrunch](https://techcrunch.com/2026/04/07/uber-is-the-latest-to-be-won-over-by-amazons-ai-chips/)

Uber 扩大与 AWS 的合同，将更多共享出行功能迁移到亚马逊自研芯片上。这一举动被视为对 Oracle 和 Google 的"不信任投票"，也是亚马逊 AI 芯片获得头部客户认可的重要信号。

---

### 中国日均词元调用量突破 140 万亿，国家数据局发布 Token 经济报告

**来源**: [虎嗅](https://news.google.com/rss/articles/CBMiVEFVX3lxTE5yVFpmSXZncVFGczRKeHZHcHo4X1AtWF94WXBQYklCSEtrbXVLclM4M0NIWS1WVXRkVlZfNmFqcm9UV0F1Z3hyQjRXSUNkQndrY3lVVA?oc=5)

国家数据局发布报告，中国日均 AI 词元调用量已突破 140 万亿，标志着 AI 计算资源消耗进入前所未有的规模。报告同时指出，AI 行业正面临 Token 经济学的挑战，成本优化和推理效率成为行业核心议题。

---

### Google Photos 在 Android 全球上线 AI 增强功能

**来源**: [TechCrunch](https://techcrunch.com/2026/04/07/google-maps-can-now-write-captions-for-your-photos-using-ai/) · [虎嗅](https://news.google.com/rss/articles/CBMiU0FVX3lxTFBBTl9kaUhCRDBwVVlDTXZ2emw2RE5fdVVxamNMS05YeDVHWHhQNGlKSTJ0OGoxSHdJRlNHYVNLMVhfb2xualZHOW5uZW9lMjk5OHVF?oc=5)

Google 在全球 Android 平台推出 Photos AI 增强功能，Gemini 可自动为照片生成描述文字，支持自动光线和对比度调整，以及视频播放速度控制。

---

## Twitter/X 精选

### Sam Altman（OpenAI CEO）

**链接**: [原推](https://x.com/i/status/2041658719839383945) ❤️5290

宣布 ChatGPT Codex 达到 300 万周活跃用户里程碑，同时宣布重置使用限额，每增长 100 万用户将再次重置，上限至 1000 万用户。"Happy building!"

---

### Anthropic 官方账号

**链接**: [原推1](https://x.com/i/status/2041578392852517128) ❤️21307 · [原推2](https://x.com/i/status/2041578395515953487) ❤️3294 · [原推3](https://x.com/i/status/2041578403686498506) ❤️3257

正式发布 Project Glasswing，Claude Mythos Preview 已发现所有主流操作系统和浏览器中的数千个高危漏洞。Anthropic 不会公开发布该模型，将向 40 多个组织提供 1 亿美元积分额度，合作名单包括 Apple、Google、Microsoft、NVIDIA、AWS 等。

---

### Z.ai 官方（@zai_org）

**链接**: [原推1](https://x.com/i/status/2041550153354519022) ❤️7877 · [原推2](https://x.com/i/status/2041550166201663909) ❤️785 · [原推3](https://x.com/i/status/2041550161462116604) ❤️755

宣布 GLM-5.1 开源，在 SWE-Bench Pro 排名第一（58.4%），6 倍 Vector-DB 性能提升，8 小时自主构建 Linux Desktop 环境。已上线 OpenRouter、Vercel 等平台。

---

### Mustafa Suleyman（Microsoft AI CEO）

**链接**: [原推1](https://x.com/i/status/2041552243019980929) ❤️221 · [原推2](https://x.com/i/status/2041552245012189680) ❤️24

发布 Bing Harrier 开源嵌入模型，在 MTEB-v2 多语言基准测试中排名第一，并预告 Harrier 将为代理时代提供更好的信息检索能力。

---

### Ethan Mollick（Wharton 教授）

**链接**: [原推1](https://x.com/i/status/2041599213050450272) ❤️285 · [原推2](https://x.com/i/status/2041578945531830695) ❤️514 · [原推3](https://x.com/i/status/2041600435320959330) ❤️1022

关于 Claude Mythos 的多个观察：Mythos 仍保留了 Claude 的部分特征，多轮对话中两个版本的 Mythos 相互对话时"less philosophical"；详细分析了 Mythos 的红队报告和系统卡；分享了"On the Folly of Rewarding A, While Hoping for B"的经典管理悖论文章。

---

### Clément Delangue（HuggingFace CEO）

**链接**: [原推1](https://x.com/i/status/2041554501539103014) ❤️459 · [原推2](https://x.com/i/status/2041576063575212379) ❤️153

确认 GLM-5.1 是 HuggingFace 平台上当前表现最佳的开源模型；分享了 NousResearch 使用 Kimi-K2.5 和 GLM-5.1 进行 1.5 亿 Token 追踪的开源记录。

---

## 论文与开源

### ClawArena: AI Agent 在动态信息环境中的评测基准

**来源**: HuggingFace Papers
**链接**: [arxiv.org/abs/2604.04202](https://arxiv.org/abs/2604.04202)
**热度**: ↑26

提出 ClawArena 基准，用于评估 AI Agent 在不断变化的信息环境中的适应能力和决策质量。这一评测框架填补了传统静态评测无法覆盖 Agent 真实场景的空白，对 Agentic AI 的实际部署能力评估具有重要参考价值。

---

### NousResearch/hermes-agent — "随用户成长的 Agent"

**来源**: GitHub Trending (Python)
**链接**: [github.com/NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent)
**语言**: Python | **新增 Star**: +3009

NousResearch 发布 Hermes Agent，定位为"随用户成长的智能体"，支持持续学习和个性化适应。基于 Nous 自研的 Hermes 模型系列，聚焦于用户行为模式的学习和记忆。

---

### abhigyanpatwari/GitNexus — 浏览器内代码知识图谱引擎

**来源**: GitHub Trending
**链接**: [github.com/abhigyanpatwari/GitNexus](https://github.com/abhigyanpatwari/GitNexus)
**语言**: TypeScript | **新增 Star**: +1195

GitNexus 是一款完全在浏览器内运行的零服务器代码智能引擎。上传 GitHub 仓库或 ZIP 文件，即可获得交互式知识图谱，内置 Graph RAG Agent，零配置代码探索体验。

---

### NVIDIA/personaplex

**来源**: GitHub Trending
**链接**: [github.com/NVIDIA/personaplex](https://github.com/NVIDIA/personaplex)
**语言**: Python | **新增 Star**: +662

NVIDIA 发布 PersonaPlex 代码库，探索大模型的多人格角色系统（Persona），用于提升 AI 对话的多样性和一致性。

---

### tobi/qmd — 本地文档语义搜索 CLI

**来源**: GitHub Trending
**链接**: [github.com/tobi/qmd](https://github.com/tobi/qmd)
**语言**: TypeScript | **新增 Star**: +859

qmd 是一个极简 CLI 搜索引擎，支持对文档、知识库、会议记录等进行本地语义搜索。追踪当前 SOTA 方法，同时完全离线运行，注重隐私保护。

---

### Selective Forgetting for Large Reasoning Models

**来源**: arXiv
**链接**: [arxiv.org/abs/2604.03571](https://arxiv.org/abs/2604.03571)
**分类**: cs.AI

大型推理模型（LRM）生成结构化思维链后再输出最终答案，使其特别容易暴露训练数据中的敏感知识。论文提出"选择性遗忘"方法，可在不损害核心能力的前提下移除有害或隐私相关内容，对 LRM 的安全部署具有重要意义。

---

### Agentic-MME: Agentic 能力在多模态评测中的实际价值

**来源**: HuggingFace Papers
**链接**: [arxiv.org/abs/2604.03016](https://arxiv.org/abs/2604.03016)
**热度**: ↑26

系统评估了 Agentic 能力对多模态大型语言模型的实际贡献，发现 Agentic 框架（规划、工具使用、多步推理）可显著提升模型在复杂任务中的表现，但并非所有场景都需要完整 Agentic 能力，任务复杂度与能力匹配度是关键因素。

---

## 社区热点

### Lobsters 热文：微软的"陨落与 Enshittification"（2026 版）

**来源**: [Lobsters](https://lobste.rs/s/jxw4nj/downfall_enshittification_microsoft) · ↑98

一篇深度分析文章指出微软正在经历系统性衰落，从操作系统霸主到 Copilot 时代的被动跟进，作者用"Enshittification"框架分析微软如何从用户信任走向平台侵蚀。引发 Lobsters 社区热烈讨论。

---

### Lobsters：多 Agent 软件开发是分布式系统问题（AGI 救不了你）

**来源**: [Lobsters](https://lobste.rs/s/vjcymq/multi_agentic_software_development_is) · ↑12 · 💬10

开发者探讨多 Agent 软件开发的架构挑战：Agentic 框架虽然强大，但无法绕过分布式系统的基础问题——一致性、延迟、错误处理。AGI 本身并不能解决这些工程层面的根本挑战。

---

### DEV.to: 4000 行 Agent Skill 而非 npm 包

**来源**: [DEV.to](https://dev.to/_a9b502091e5f4cba28f13/why-i-built-a-4000-line-agent-skill-instead-of-another-npm-package-51la)

开发者分享了为什么选择构建一个 4000 行的 Agent Skill 而非发布一个 npm 包。核心观点：相比通用工具，针对特定工作流的深度定制 Agent Skill 在实际使用中的价值远超可复用但泛化的包。

---

## 采集统计

| 指标 | 数值 |
|------|------|
| 信息源总数 | 81 |
| 成功采集 | 42 |
| 条目总数 | 264 |
| 去重移除 | 2 |
