# AI 日报 · 2026-04-12

> 采集时间 00:31 UTC | 信息源: 36 | 条目: 203

## 今日观察

今天最引人注目的不是某项技术突破，而是 AI 权力格局正在经历的多重震荡。OpenAI CEO 奥特曼家被投掷燃烧弹，他本人随即发文承认历史错误、将 AGI 比作"魔戒"——这一幕罕见地将硅谷权力斗争的抽象张力具象化为现实冲突。与此同时，马斯克与 OpenAI 的千亿诉讼箭在弦上，原本助力"星际之门"计划的三名核心高管转投 Meta，佛罗里达州检察长宣布对 OpenAI 展开调查，多个压力向量在同一天交汇。在技术侧，Anthropic 的 Project Glasswing 和 Claude Code Ultraplan 双双发布，前者聚焦 AI 时代关键软件的安全基础设施，后者将编程任务规划上移至云端；Google 的 Gemma 4 则走向另一端，主打完全本地化的多模态 Agent，无需联网即可调用工具。企业侧传来两个截然相反的信号：TCS 季报超预期且明确表态"AI 未冲击服务需求"，而曾融资 3300 万美元的 AI 评测明星创业公司 Yupp 宣告仅 22 个月后关闭。AI 人才回流中国、日本豪掷 163 亿美元押注芯片自主，产业地缘格局的再分配正在悄然提速。

## 重大新闻

### 奥特曼家遭燃烧弹袭击，本人发文承认错误、自省 AGI 危险性

**来源**:
- 媒体: [The Decoder](https://the-decoder.com/someone-threw-a-molotov-cocktail-at-openai-ceo-sam-altmans-home-in-the-middle-of-the-night/) · [36氪](https://36kr.com/p/3762027785224707?f=rss) · [TechCrunch](https://techcrunch.com/2026/04/11/sam-altman-responds-to-incendiary-new-yorker-article-after-attack-on-his-home/) · [TMTPost](https://www.tmtpost.com/7949710.html)

**事件经过**: 当地时间周五凌晨 3:45，一名 20 岁男子向奥特曼位于旧金山、价值 2700 万美元的豪宅投掷燃烧弹，无人受伤，火势已控制，嫌疑人徒步出逃。此前，《纽约客》刚刚发布对奥特曼可信度的深度质疑报道。

**媒体补充**: 奥特曼随即发布长文博客回应，承认过去犯过错误、做过令自己不满意的事，将 AGI 比作《魔戒》中的力量，称其让人"做出疯狂举动"。The Verge 指出，《纽约客》配图使用了 AI 生成艺术，本身也引发了关于 AI 视觉内容边界的讨论。

> 影响评估: AI 权力集中引发的社会对抗从舆论争议升级为物理冲突，AGI 开发的"民主授权"问题将被进一步放大。

---

### OpenAI 三名 Stargate 核心高管出走，转投 Meta

**来源**:
- 媒体: [Techmeme](http://www.techmeme.com/260410/p33#a260411p33) · [TMTPost](https://www.tmtpost.com/7949632.html)

**事件经过**: 据 Bloomberg，三名参与启动 OpenAI "星际之门"（Stargate）AI 基础设施计划的核心高管同时离开，加盟 Meta。这三人此前负责协调 OpenAI 在全球建设数据中心基础设施的重大工作。

> 影响评估: Meta 借此直接获得 Stargate 项目的内部运作知识，OpenAI 在 AI 基建竞赛中的先发优势受到侵蚀。

---

### Anthropic 发布 Project Glasswing，专注 AI 时代关键软件安全

**来源**:
- 官方: [Anthropic](https://news.google.com/rss/articles/CBMiS0FVX3lxTFBfQUdtMDZYaEtZV0JMSk1ZSzdqTl9mV3dQTnZYcVEzaHo4cV8yUEl2a25QMWRXenFTYUQ3NF9WakR5WXVwaDRTZC1ZYw?oc=5)
- 社区: [Mastodon](https://jforo.com/@yayafa/116388706077356811)

**官方公告**: Anthropic 宣布 Project Glasswing，旨在为 AI 时代的关键软件基础设施提供安全保障，同时发布了关于"可扩展托管 Agent"架构的技术博文，探讨将 Agent "大脑"与"执行手"解耦的架构方案。

> 影响评估: 表明 Anthropic 正将安全能力从模型层向基础设施层延伸，布局更大的安全生态。

---

### Google 发布 Gemma 4：完全本地化多模态 AI，支持 Agent 技能

**来源**:
- 媒体: [The Decoder](https://the-decoder.com/googles-gemma-4-puts-free-agentic-ai-on-your-phone-and-no-data-ever-leaves-the-device/)

**事件概要**: Google 发布新一代开源模型 Gemma 4，支持文本、图片、音频的完全本地处理，无任何数据离开设备。通过 Agent 技能机制，模型可独立调用维基百科、交互地图等工具，适配普通消费级硬件（手机及 PC/Mac）。

> 影响评估: 打破"本地模型=能力弱"的刻板印象，为隐私敏感场景下的 Agent 部署提供可行路径。

---

### OpenAI macOS 应用供应链遭攻击，恶意 Axios 库被植入

**来源**:
- 媒体: [Techmeme](http://www.techmeme.com/260410/p34#a260411p34)

**事件经过**: OpenAI 披露，3 月 31 日一个用于签名 macOS 应用的 GitHub workflow 下载了恶意 Axios 库。OpenAI 称无用户数据或内部系统受到损害，已完成修复。

> 影响评估: AI 公司 CI/CD 管线同样面临供应链攻击风险，安全社区对主流开发工具链的依赖管理将引发新一轮关注。

---

## 公司动态

### Anthropic 商业渗透率快速提升，3 月已覆盖 30.6% 美国企业

**来源**: [Techmeme/FT](http://www.techmeme.com/260411/p4#a260411p4)

据 Ramp 企业支出数据：Anthropic 工具在美国企业的付费渗透率 3 月达 30.6%，较 2 月的 24.4% 显著提升；OpenAI 同期维持约 35% 但环比基本持平。这是近期最直接的企业侧 AI 采用数据，显示 Anthropic 正在快速蚕食企业市场。

---

### AI 创业公司 Yupp 宣布关闭，拿了 3300 万美元种子轮仅运营 22 个月

**来源**: [36氪](https://36kr.com/p/3762088319484419?f=rss) · [虎嗅](https://news.google.com/rss/articles/CBMiVEFVX3lxTE5VX1hDRFA2ck9tT0ZEUm5GR2FTMDRNeHdGZC1tNVlNUTJUaWY3aEYyNG13VjFxSEhLMTFFMzJJRjBPWERNUDRITjdDNEhYdVZzYkU0?oc=5)

Yupp 定位 AI 模型评测平台，商业模式为"免费服务换用户评测数据，再将数据卖给模型厂商"，背后投资方包括 a16z 合伙人、Google 首席科学家。产品上线不足一年宣告关闭，将于 4 月 15 日正式停服。

---

### 日本追加 40 亿美元补贴 Rapidus，AI 芯片总投入升至 163 亿美元

**来源**: [Techmeme/Bloomberg](http://www.techmeme.com/260411/p8#a260411p8) · [36氪](https://36kr.com/newsflashes/3761942487990792?f=rss)

日本经产省批准新增补贴用于 Rapidus 为富士通开展研发，本财年末（2027 年 3 月）政府对 Rapidus 的累计投入将达 2.6 万亿日元（163 亿美元）。外部委员会已核实其北海道芯片工厂的技术进展。

---

### Claude Code 推出 Ultraplan：将代码规划任务上移至云端

**来源**: [The Decoder](https://the-decoder.com/claude-codes-new-ultraplan-feature-moves-task-planning-to-the-cloud/) · [ProductHunt](https://www.producthunt.com/products/claude-code-ultraplan)

Anthropic 为 Claude Code 新增 Ultraplan 功能，将任务规划过程迁移至云端处理，用户可在规划期间继续在本地终端做其他工作。ProductHunt 同步上线，已引发开发者社区关注。

---

### 佛罗里达州检察长对 OpenAI 展开调查，涉及公共安全与国家安全

**来源**: [The Verge](https://www.theverge.com/policy/909557/openai-florida-investigation)

佛罗里达州总检察长 James Uthmeier 宣布对 OpenAI 启动调查，关注点为公共安全和国家安全风险。此举与早先路透社的报道一致，是继马斯克诉讼、联邦审查之后，OpenAI 面临的又一监管压力。

---

### OpenAI 反击马斯克，称其修正诉求为"法律奇袭"

**来源**: [Techmeme/Bloomberg](http://www.techmeme.com/260411/p5#a260411p5) · [36氪](https://36kr.com/newsflashes/3762063409234434?f=rss)

在马斯克于本周修正其对 OpenAI 的诉讼要求后，OpenAI 向法庭提交文件，称相关修正"法律上不当、事实上缺乏依据"，是"刁难被告、扰乱庭审"的策略性动作。该案定于 4 月 27 日开庭。

---

## Twitter/X 精选

### 关于 Claude Mythos 安全事件的 Fediverse 讨论

**来源**: [mastodon-ai](https://mstdn.party/@albert_inkman/116388707344281180) · [mastodon-llm](https://mstdn.social/@faraiwe/116388097410480555)

AI 社区正在热议"Claude Mythos 发现零日漏洞"事件（HN 716 票）。部分观察者认为这是 AI 安全领域最重要的信号——不是因为 Mythos 危险，而是因为此事打破了"高能力模型才有安全风险"的假设前提，令整个监管框架面临重新审视。Bruce Schneier 则指出相关报道存在"营销夸大"成分。

---

### 关于 AI 模型标称参数与实际架构的讨论

**来源**: [mastodon-llm](https://mastodon.social/@firethering/116387882273386102)

讨论者指出阿里巴巴的 Marco MoE 模型（Marco Nano 和 Marco Mini）是"混合专家"架构，实际运行时激活参数远少于标称参数，提醒用户不能简单用参数量对比模型能力。

---

## 论文与开源

### NousResearch/hermes-agent — 会自我成长的 AI Agent 框架

**来源**: GitHub Trending
**链接**: [github.com/NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent)

Hermes Agent 是 Nous Research 于今年 2 月发布的开源 Agent 框架，定位"The agent that grows with you"。核心创新是闭环学习系统：Agent 完成复杂任务后，自动将经验固化为可复用 Skill，下次遇到类似任务直接调用，实现持续迭代进化。[Python] | +6438 stars

---

### microsoft/markitdown — 将各类文件转为 Markdown 的工具

**来源**: GitHub Trending
**链接**: [github.com/microsoft/markitdown](https://github.com/microsoft/markitdown)

Microsoft 出品的 Python 工具，支持将 PDF、Word、Excel、PowerPoint 等各类办公文档及文件格式转换为 Markdown，广泛用于 LLM 的文档预处理管线。[Python] | +3086 stars

---

### multica-ai/multica — 开源托管 Agent 团队协作平台

**来源**: GitHub Trending
**链接**: [github.com/multica-ai/multica](https://github.com/multica-ai/multica)

第一个开源的 Managed Agents 平台，将 AI 编程 Agent 组织为真正的"团队成员"——可分配任务、追踪进度、沉淀技能。支持多 Agent 并行协作，面向需要长期任务管理的复杂开发场景。[TypeScript] | +1948 stars

---

### SkillClaw: Let Skills Evolve Collectively with Agentic Evaluation

**来源**: HuggingFace Papers
**链接**: [arxiv.org/abs/2604.08377](https://arxiv.org/abs/2604.08377)

提出通过 Agent 自主评测驱动 Skill 集合的进化，让 Agent 技能库可以在使用过程中集体迭代更新，而非人工维护。热度 ↑215，是本周最受关注的 Agent 能力研究。

---

### ClawBench: Can AI Agents Complete Everyday Online Tasks?

**来源**: HuggingFace Papers
**链接**: [arxiv.org/abs/2604.08523](https://arxiv.org/abs/2604.08523)

针对 AI Agent 完成日常在线任务能力的基准测试，评估当前主流 Agent 在真实网页交互场景中的实际表现与局限。热度 ↑122。

---

### DMax: Aggressive Parallel Decoding for dLLMs

**来源**: HuggingFace Papers
**链接**: [arxiv.org/abs/2604.08302](https://arxiv.org/abs/2604.08302)

针对扩散式 LLM（dLLMs）的激进并行解码方案，显著提升推理吞吐量。热度 ↑36，关注推理效率优化的读者值得关注。

---

## 社区热点

### HN：韩国推出全民免费基础移动数据接入

**来源**: [Hacker News](https://www.theregister.com/2026/04/10/south_korea_data_access_universal/) ↑302 💬84

韩国宣布推出全民免费基础移动数据计划，被讨论者与 AI 时代数字鸿沟议题关联，认为数据接入正在成为和水、电类似的基础权利。

---

### HN：Cirrus Labs 加入 OpenAI

**来源**: [Hacker News](https://cirruslabs.org/) ↑225 💬113

持续集成/持续交付基础设施公司 Cirrus Labs 宣布并入 OpenAI，评论区讨论 OpenAI 此举背后对 CI/CD 基础设施能力的战略布局。

---

### 知乎热榜：五部门推 AI 进中小学，会否进中考高考？

**来源**: [知乎](https://www.zhihu.com/question/2025885699283382999) 🔥102万热度

教育部等五部门联合发文将 AI 教育纳入地方课程，知乎上形成关于城乡 AI 教育资源差距、考试导向、农村学生公平性的大规模讨论。

---

### 微博热搜：宇树机器人百米冲刺达到 10 米/秒

**来源**: [微博](https://s.weibo.com/weibo?q=%23%E5%AE%87%E6%A0%91%E6%9C%BA%E5%99%A8%E4%BA%BA%E7%99%BE%E7%B1%B3%E5%86%B2%E5%88%BA10%E7%B1%B3%E6%AF%8F%E7%A7%92%23) 🔥453526

宇树科技发布视频显示其人形机器人百米冲刺速度达到 10 米/秒，引发广泛关注，被认为是具身智能硬件性能的里程碑进展。

---

## 采集统计

| 指标 | 数值 |
|------|------|
| 信息源总数 | 80 |
| 成功采集 | 36 |
| 条目总数 | 203 |
| 去重移除 | 53 |
| 有效条目 | 150 |
