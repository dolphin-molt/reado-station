# AI 日报 · 2026-04-10

> 采集时间 00:32 UTC | 信息源: 36 | 条目: 278

## 今日观察

今天 AI 领域最核心的张力，是安全边界与商业扩张之间的拔河。Anthropic 公开限制 Mythos 模型发布，理由是其在安全漏洞利用方面的能力过于强大——这是一个罕见的"我们造出来了但不敢发布"的公开声明，同时配套了 Project Glasswing 开源关键软件安全项目。与此同时，OpenAI 推出 $100/月的中间档 Pro 订阅，将价格从 $20 直接跳升到 $200 之间的空缺填上，意在争夺愿意付费的重度用户群体。Meta 的 Muse Spark 发布是另一个关键信号：这家曾经因开源路线和 LLaMA 系列被视为 AI 民主化代表的公司，如今成立了独立的 Meta Superintelligence Labs，砸 143 亿美元押注私有模型研发。在基础设施层，Visa 为 AI Agent 构建跨网络支付平台、AWS 推出 Agent Registry、Anthropic Claude Cowork 全面铺开——Agent 时代正从概念跑向落地。监管侧也在加速：Florida AG 以公共安全为由调查 OpenAI，xAI 起诉科罗拉多州 AI 反歧视法，AI 法律风险正式进入司法层面。

---

## 重大新闻

### Anthropic 限制发布 Mythos 模型：安全漏洞利用能力超出警戒线

**来源**:
- 官方: [Anthropic - Project Glasswing](https://news.google.com/rss/articles/CBMiS0FVX3lxTFBfQUdtMDZYaEtZV0JMSk1ZSzdqTl9mV3dQTnZYcVEzaHo4cV8yUEl2a25QMWRXenFTYUQ3NF9WakR5WXVwaDRTZC1ZYw)
- 媒体: [TechCrunch](https://techcrunch.com/2026/04/09/is-anthropic-limiting-the-release-of-mythos-to-protect-the-internet-or-anthropic/) · [Ars Technica](https://arstechnica.com/ai/2026/04/why-anthropic-sent-its-claude-ai-to-an-actual-psychiatrist/) · [The Decoder](https://the-decoder.com/openai-reportedly-following-anthropics-lead-in-restricting-access-to-powerful-cybersecurity-ai/)

**官方公告**: Anthropic 宣布 Mythos 模型在安全软件漏洞利用方面能力过强，选择限制发布而非公开推出。同时发布 Project Glasswing，向开源社区提供关键软件安全加固工具。Anthropic 同时给 Claude（Mythos 的底座）安排了 20 小时的精神科访谈，称其为"迄今为止心理状态最稳定的模型"。

**媒体补充**: TechCrunch 指出 Anthropic 的决定引发争议——是真的为了互联网安全，还是为了保护自身商业竞争地位？The Decoder 报道 OpenAI 也在跟进类似策略，正在开发一款只对少数企业开放的高级网络安全 AI 模型。

**社区反应**: OpenAI 向投资者发送备忘录，称其在算力资源上的早期投入使其在与 Anthropic 的竞争中占据关键优势。

> 影响评估: 顶级 AI 实验室开始出现"造出但不发布"的主动约束先例，意味着能力边界管理将成为行业标准。

---

### OpenAI 推出 $100/月 ChatGPT Pro 中间档，重塑订阅价格体系

**来源**:
- 官方: [OpenAI 公告（via TechCrunch）](https://techcrunch.com/2026/04/09/chatgpt-pro-plan-100-month-codex/)
- 媒体: [The Verge](https://www.theverge.com/ai-artificial-intelligence/909599/chatgpt-pro-subscription-new) · [The Decoder](https://the-decoder.com/openai-halves-its-pro-price-to-100-for-heavy-codex-users-undercuts-anthropic-and-google/) · [36氪](https://36kr.com/newsflashes/3760221303374592)

**官方公告**: OpenAI 新增 $100/月 Pro 订阅档，提供比 $20 Plus 档多 5 倍的 Codex 使用量；原 $200/月 Pro 档保留，提供 20 倍使用量。此举填补了 $20 到 $200 之间的价格空白。

**媒体补充**: The Decoder 指出这相当于 OpenAI 将原 $200 Pro 价格腰斩，直接与 Anthropic 和 Google 的定价竞争。TechMeme 汇总显示这是重度 Codex 用户最直接受益的调整。

> 影响评估: AI 订阅价格战正式开打，$100/月可能成为 2026 年的行业标准定价锚点。

---

### Meta Muse Spark 发布：Meta Superintelligence Labs 首个模型亮相

**来源**:
- 媒体: [The Verge](https://www.theverge.com/tech/908769/meta-muse-spark-ai-model-launch-rollout) · [TechCrunch](https://techcrunch.com/2026/04/09/meta-ai-app-climbs-to-no-5-on-the-app-store-after-muse-spark-launch/) · [36氪热榜](https://36kr.com/p/3759262966514182)

**官方公告**: Meta Superintelligence Labs 发布 Muse Spark，这是 Zuckerberg 砸 143 亿美元重组 AI 部门后的首个模型。Muse Spark 现已驱动 Meta AI app 和 Meta Assistant。

**媒体补充**: TechCrunch 报道 Meta AI App 在 Muse Spark 发布后从 App Store 第 57 名蹿升至第 5 名。内部备忘录显示 Meta 正将顶级工程师集中到新成立的 Applied AI Engineering 部门。社区测评显示 Muse Spark 在代码解释器与 `container.visual_grounding` 工具方面表现突出。

> 影响评估: Meta 以"Muse Spark"为切入点正式宣战，开放生态与封闭高性能模型的路线之争进入新阶段。

---

### Florida AG 以公共安全为由正式调查 OpenAI

**来源**:
- 媒体: [The Verge](https://www.theverge.com/policy/909557/openai-florida-investigation) · [TechCrunch](https://techcrunch.com/2026/04/09/florida-ag-investigation-openai-chatgpt-shooting/) · [TechMeme](http://www.techmeme.com/260409/p29#a260409p29)

**官方公告**: 佛罗里达州检察长 James Uthmeier 宣布对 OpenAI 展开调查，理由是 ChatGPT 用户数据可能落入"美国敌国之手"，并援引 2025 年 4 月佛罗里达州立大学枪击案——据报道枪手在计划袭击时使用了 ChatGPT。

**媒体补充**: 受害者家属已宣布将起诉 OpenAI。这是首次有州级检察长基于国家安全和公共安全双重理由对 AI 公司展开正式调查。

> 影响评估: AI 平台的法律责任边界正在通过司法途径被重新划定。

---

### Claude Cowork 向所有付费用户全面开放

**来源**:
- 媒体: [The Decoder](https://the-decoder.com/claude-cowork-expands-to-all-paid-plans-on-macos-and-windows-with-new-org-controls/) · [TechMeme](http://www.techmeme.com/260409/p30#a260409p30)

**官方公告**: Anthropic 将 Claude Cowork 从研究预览扩展至所有付费方案（macOS 和 Windows），新增企业级组织控制功能和 Zoom 集成，以及 6 项企业功能。

> 影响评估: AI 编程助手从个人工具向企业标配演进提速，竞争焦点转向组织级管理能力。

---

## 公司动态

### Google Gemini 新增交互式 3D 模型与可视化生成

**来源**: [The Verge](https://www.theverge.com/tech/909391/google-gemini-ai-3d-models-simulations) · [The Decoder](https://the-decoder.com/google-gemini-now-generates-interactive-visualizations-you-can-tweak-and-explore-right-in-the-chat/)

Google Gemini 更新后支持在对话中直接生成可旋转的 3D 模型和交互式数据可视化，用户需选择 Pro 模型触发。The Decoder 指出这是继 Anthropic Claude 之后，主流 AI 助手在交互式可视化方面的进一步跟进。

### Anthropic 据报正在评估自研芯片可行性

**来源**: [TechMeme（Reuters 报道）](http://www.techmeme.com/260409/p41#a260409p41)

Reuters 援引知情人士称，Anthropic 正在探讨设计自研芯片的可能性，但尚未确定具体方案，也未组建专门团队。在算力成本持续攀升的背景下，垂直整合芯片研发的诱惑日益明显。

### Visa 推出 AI Agent 跨网络支付平台 Intelligent Commerce Connect

**来源**: [TechMeme（Axios）](http://www.techmeme.com/260409/p27#a260409p27) · [虎嗅](https://news.google.com/rss/articles/CBMiU0FVX3lxTE4yaDFxNENrb29menNSaUpaeE5pblNNMHhHTnVoakp2d01VYkZfNDN3MllJMEtpQ1AtZi1aZVNoaTN6TTZXU3FNUlVaazZueXB4UDhj)

Visa 推出 Intelligent Commerce Connect 平台，专为 AI Agent 提供跨卡网络的支付能力，覆盖包括 Visa 竞争对手在内的多个网络。这是支付基础设施为 AI Agent 时代所做的首次系统性适配。

### 字节跳动 Seed 发布全双工语音大模型 Seeduplex

**来源**: [字节 Seed（via 36氪/Google News）](https://news.google.com/rss/articles/CBMi8gFBVV95cUxPRjIxN0xKUkVIWUJmcGJHTHdZUGoySy1zSmR6Wi1YSllZbUtYMHU0RjAzcVdDTWZPazRLY24wc3RPaU9TMHRXYU5QZ0JUYzZCa180NmtFaXNkejhUU2hPb3lydGhmaVpMY3pLLTNXUW85MUo3MVhiQzhXR0o4TVhCYTVqU0pZSFROLWpKVGI1bEtMUHoyWjJISHRfblBkd1VxTE0tcDd4OTJraFZWVlRETmJTQVlFX29DN3JBMWlzRGtjTVlzRjlfVXFTRm9tTDdfVDJYSXVTbUFiREZ5c3JfaDJqM1Y1Y2JOaVpQZUxfc0JYdw)

字节跳动 Seed 团队发布 Seeduplex，一款原生全双工语音大模型，支持实时打断、抗干扰，实现更自然的双向语音交互。淘宝闪购同步上线支持语音搜索的商家端 AI Agent。

### xAI 起诉科罗拉多州 AI 反歧视法，称其违反言论自由

**来源**: [TechMeme（Financial Times）](http://www.techmeme.com/260409/p39#a260409p39)

xAI 向法院提起诉讼，挑战科罗拉多州即将于今年夏天生效的 AI 反歧视法，理由是该法律违反宪法言论自由保护。同一周内，白宫也在向内布拉斯加和田纳西州的 GOP 主导 AI 监管法案施压。

### 阿里领投生数科技 3 亿美元，角逐 AI 视频生成赛道

**来源**: [36氪](https://36kr.com/newsflashes/3760251105411588)

阿里巴巴领投 AI 视频生成公司生数科技一轮 3 亿美元融资。钛媒体同日报道 Sora 因 54 亿美元投入未能达到预期，中国匿名模型以 38 秒视频生成能力引发关注，视频生成竞争轴线已从模型能力转向算力经济与合规壁垒。

### OpenAI 暂停英国星际之门项目，因能源成本和监管问题

**来源**: [BBC Technology](https://www.bbc.com/news/articles/clyd032ej70o) · [钛媒体](https://www.tmtpost.com/7947269.html)

OpenAI 暂停英国境内的"星际之门"数据中心项目，原因是能源成本过高以及当地监管不确定性。该项目原本是英国政府宣称将成为 AI 超级大国承诺的重要组成部分。

### Black Forest Labs：70 人团队成为 AI 图像生成顶级竞争者

**来源**: [Wired](https://www.wired.com/story/black-forest-labs-ai-image-generation/) · [TechMeme（Maxwell Zeff/Wired）](http://www.techmeme.com/260409/p40#a260409p40) · [虎嗅](https://news.google.com/rss/articles/CBMiU0FVX3lxTE1xcGp5LUhzOUVGZE54Zi1aRE5rSnBBdU1VaTk2UTNCa2YtVG9WVzFNQnA4b25nSjhXV2FfUGhGOW1qSWlfR3lrQmkyUm90aVFCU1lz)

Wired 深度报道德国初创公司 Black Forest Labs，70 人规模却在 AI 图像生成领域与硅谷巨头正面竞争。据知情人士透露，该公司最近拒绝了 xAI 的合作邀请。其下一步目标是将能力延伸至物理 AI 领域。

---

## 论文与开源

### NousResearch/hermes-agent — 自适应成长型 AI Agent 框架

**来源**: [GitHub Trending](https://github.com/NousResearch/hermes-agent)
[Python] | +6485 stars

NousResearch 发布 Hermes Agent，定位为"与你一同成长的 Agent"。框架支持动态工具调用，在低端模型上的工具调用效果优于 OpenClaw 框架，同时具备更高的 Token 效率。适合需要在资源受限场景下部署可靠 Agent 的开发者。

### obra/superpowers — 经过验证的 Agentic Skills 开发框架

**来源**: [GitHub Trending](https://github.com/obra/superpowers)
[Shell] | +2299 stars

一套 agentic skills 框架与软件开发方法论，核心主张是让技能体系可复用、可叠加。与同类工具相比更偏向工程实践而非概念框架，在 GitHub Trending 中与本周 Claude Cowork 全面开放的时机重叠，可见 skills-as-primitives 正在成为行业主流范式。

### forrestchang/andrej-karpathy-skills — 单文件 CLAUDE.md，提炼 Karpathy 的 LLM 编码建议

**来源**: [GitHub Trending](https://github.com/forrestchang/andrej-karpathy-skills)
[配置文件] | +1364 stars

一个 CLAUDE.md 文件，将 Andrej Karpathy 对 LLM 编码误区的公开观察整理为 Claude Code 可直接使用的行为规范。轻量且针对性强，适合希望提升 Claude Code 输出质量的工程师直接使用。

### HKUDS/DeepTutor — Agent 原生个性化学习助手

**来源**: [GitHub Trending](https://github.com/HKUDS/DeepTutor)
[Python] | +1310 stars

香港大学数据科学实验室发布 DeepTutor，一款以 Agent 为核心设计的个性化学习助手。区别于传统 RAG 问答系统，DeepTutor 将学习过程设计为多轮自适应任务，动态调整内容难度和知识路径。

### Claude Code v2.1.98 — 新增 Google Vertex AI 交互式设置向导

**来源**: [Claude Code Releases](https://github.com/anthropics/claude-code/releases/tag/v2.1.98)

新版本在登录界面新增"第三方平台"选项，内置 Google Vertex AI 交互式配置向导，引导完成 GCP 认证、项目和区域配置全流程，降低企业用户接入 Vertex AI 的配置门槛。

### RAGEN-2: Reasoning Collapse in Agentic RL

**来源**: [Hugging Face Daily Papers](https://arxiv.org/abs/2604.06268)
↑44 votes

研究发现在 Agent 强化学习训练中存在"推理崩溃"现象——模型在持续 RL 训练过程中推理能力会出现不可逆退化。论文提出诊断方法并探讨缓解策略，对 Agent RL 训练实践具有直接指导意义。

### MegaTrain: 100B+ 参数大模型的全精度训练框架

**来源**: [Hugging Face Daily Papers](https://arxiv.org/abs/2604.05091)
↑38 votes

提出针对超百亿参数模型的全精度（Full Precision）训练方案，在保持训练稳定性的同时降低内存开销。在当前混合精度训练主流的背景下，此工作为需要更高数值精度的科学计算场景提供了新路径。

---

## 社区热点

### 俄亥俄州男子成为《Take It Down Act》首例定罪者

**来源**: [Ars Technica](https://arstechnica.com/tech-policy/2026/04/first-man-convicted-under-take-it-down-act-kept-making-ai-nudes-after-arrest/) · [TechMeme（Ars Technica）](http://www.techmeme.com/260409/p35#a260409p35) · [虎嗅](https://news.google.com/rss/articles/CBMiU0FVX3lxTE1OcjN1ZTI2WFlZbm82bmM0ODN1bDRGRDNfYlY1a0tNak1EaUJDeWh4WWpvbV9zZUxRTVItWlpJbmpUWmU2aUl1QkhPcjZ0UjBaSERj)

俄亥俄州男子对制作和传播 AI 生成及真实受害者不雅图像认罪，成为《Take It Down Act》生效后首位被定罪者，受害者超过 10 人。Ars Technica 报道该男子在逮捕后仍使用超过 100 种 AI 工具持续制作此类内容。

### HN：Maine 即将立法禁止大型新数据中心

**来源**: [Hacker News](https://www.gadgetreview.com/maine-is-about-to-become-the-first-state-to-ban-major-new-data-centers)
↑234 💬331

Maine 正推进立法，或将成为全美首个明确禁止建设大型新数据中心的州，理由涉及能源消耗、水资源和土地使用。HN 社区讨论（331 条评论）争议集中在地方立法能否实质影响 AI 基础设施布局。

### 微信回应"夫妻用AI写公众号年赚200万"，重申禁止自动化创作

**来源**: [虎嗅](https://news.google.com/rss/articles/CBMiUEFVX3lxTE53Si1xWTJDNlltYkhxUnJsWENqNl80SVMyZGFVenF6R3IxWDJWczUxMkFxSjNSVEFFdDEyUW1pMnJTc3FNbVBFbzlhQnRMak9u) · [微博热搜](https://s.weibo.com/weibo?q=%23%E5%BE%AE%E4%BF%A1%E5%9B%9E%E5%BA%94%E5%A4%AB%E5%A6%BB%E7%94%A8AI%E5%86%99%E5%85%AC%E4%BC%97%E5%8F%B7%E5%B9%B4%E8%B5%9A200%E4%B8%87%23)
🔥108万讨论

一对夫妻通过 AI 辅助内容创作在微信公众号实现年收入 200 万元的案例引发全网热议，微博热搜讨论量超 108 万。微信团队回应称明确禁止自动化内容创作，将持续打击非真人 AI 写作。

### Reddit：AI 助力自制 mRNA 疫苗为狗狗治癌

**来源**: [Reddit r/singularity](https://www.reddit.com/r/singularity/comments/)
↑2159 💬275

澳大利亚科技创业者利用 ChatGPT、AlphaFold 和定制 mRNA 疫苗为患癌狗狗进行治疗，并获得多位研究人员协助。该帖获 2159 赞，275 条评论，是本周 Reddit 奇点社区讨论度最高的帖子之一，展示了 AI 工具在个人生物医疗探索中的潜力。

### V2EX：豆包和 DeepSeek 会不会向个人收费？

**来源**: [V2EX](https://www.v2ex.com/t/1204484) · [V2EX](https://www.v2ex.com/t/1204481)
💬88 / 💬84

两个相关话题在 V2EX 同期热议：一是"豆包和 DeepSeek 最终会向个人收费吗"（88 条评论），二是"大家现在订阅哪个模型"（84 条评论）。OpenAI $100/月新订阅档的推出，使得国产免费模型的市场窗口讨论再次升温。

### SpaceX 去年因 xAI 投入亏损近 50 亿美元

**来源**: [36氪](https://36kr.com/newsflashes/3760265708618498)

据两名知情人士透露，SpaceX 2025 年亏损近 50 亿美元，营收超 185 亿美元，亏损主要来自 xAI 相关支出（xAI 已于今年 2 月被 SpaceX 合并）。SpaceX 正准备可能是史上规模最大的 IPO，对财务数据严格保密。

---

## 采集统计

| 指标 | 数值 |
|------|------|
| 信息源总数 | 80 |
| 成功采集 | 36 |
| 条目总数 | 278 |
| 去重移除 | 16 |
| 有效条目 | 262 |
