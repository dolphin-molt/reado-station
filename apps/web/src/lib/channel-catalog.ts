import { localizedPath, type Lang } from '@/lib/i18n'

export type MarketChannelType = 'x' | 'rss'
export type MarketDomain = 'ai' | 'finance'

export interface MarketChannel {
  id: string
  domain: MarketDomain
  type: MarketChannelType
  name: string
  value: string
  role: Record<Lang, string>
  description: Record<Lang, string>
  samples: Record<Lang, string[]>
  why: Record<Lang, string>
  suitableFor: Record<Lang, string>
  tags: Record<Lang, string[]>
  cadence: Record<Lang, string>
}

export interface ChannelPack {
  id: string
  domain: MarketDomain
  title: Record<Lang, string>
  description: Record<Lang, string>
  channelIds: string[]
}

export const marketChannels: MarketChannel[] = [
  {
    id: 'x-karpathy',
    domain: 'ai',
    type: 'x',
    name: 'Andrej Karpathy',
    value: 'karpathy',
    role: { zh: 'AI 研究者 / 教育者', en: 'AI researcher / educator' },
    description: {
      zh: '长期分享模型、学习和工程构建的观察。',
      en: 'Shares observations on models, learning, and engineering systems.',
    },
    samples: {
      zh: ['从零训练小型语言模型的工程笔记', '神经网络直觉、token、embedding 的解释', 'AI Agent 产品为什么很难被做好'],
      en: ['Engineering notes on training small language models', 'Intuitions for tokens, embeddings, and neural nets', 'Why AI agent products are hard to get right'],
    },
    why: {
      zh: '适合理解 AI 系统怎么被真正构建，信号密度高但不追短期噪声。',
      en: 'Useful for understanding how AI systems are built without chasing every short-term spike.',
    },
    suitableFor: { zh: 'AI 工程、产品判断、技术学习', en: 'AI engineering, product judgment, technical learning' },
    tags: { zh: ['模型', '工程', '教育'], en: ['Models', 'Engineering', 'Education'] },
    cadence: { zh: '中频，高信号', en: 'Medium frequency, high signal' },
  },
  {
    id: 'x-simonw',
    domain: 'ai',
    type: 'x',
    name: 'Simon Willison',
    value: 'simonw',
    role: { zh: '独立开发者', en: 'Independent developer' },
    description: {
      zh: '持续记录 LLM、数据工具和产品工程实践。',
      en: 'Documents LLM, data tooling, and product engineering practice.',
    },
    samples: {
      zh: ['新模型发布后的本地实验记录', '用 SQLite、Datasette 和 LLM 做数据工作流', '提示词、工具调用和评测的实践细节'],
      en: ['Local experiments after a new model release', 'Data workflows with SQLite, Datasette, and LLMs', 'Practical notes on prompts, tool calls, and evals'],
    },
    why: {
      zh: '适合把 AI 工具变化转成可执行的工程判断。',
      en: 'Turns AI tooling changes into practical engineering judgment.',
    },
    suitableFor: { zh: '开发者、技术负责人、AI 工具用户', en: 'Developers, technical leads, AI tool users' },
    tags: { zh: ['LLM', '数据工具', '工程实践'], en: ['LLM', 'Data tools', 'Engineering'] },
    cadence: { zh: '高频，实践导向', en: 'High frequency, practice-led' },
  },
  {
    id: 'x-swyx',
    domain: 'ai',
    type: 'x',
    name: 'Shawn Wang',
    value: 'swyx',
    role: { zh: '开发者生态观察者', en: 'Developer ecosystem observer' },
    description: {
      zh: '关注 AI 工具、创业公司和应用层机会。',
      en: 'Covers AI tools, startups, and application-layer opportunities.',
    },
    samples: {
      zh: ['AI 工程师生态里的新工具和新公司', '应用层产品机会和开发者工作流变化', '开源模型、Agent 框架和社区讨论'],
      en: ['New tools and companies in the AI engineer ecosystem', 'Application-layer opportunities and developer workflow shifts', 'Open models, agent frameworks, and community debates'],
    },
    why: {
      zh: '适合发现 AI 应用和开发者生态里的新机会。',
      en: 'Good for spotting opportunities in AI applications and developer ecosystems.',
    },
    suitableFor: { zh: '创业者、产品经理、开发者关系', en: 'Founders, PMs, developer relations' },
    tags: { zh: ['创业', '应用层', '开发者生态'], en: ['Startups', 'Applications', 'Developer ecosystem'] },
    cadence: { zh: '高频，机会导向', en: 'High frequency, opportunity-led' },
  },
  {
    id: 'rss-openai-blog',
    domain: 'ai',
    type: 'rss',
    name: 'OpenAI Blog',
    value: 'https://openai.com/news/rss.xml',
    role: { zh: '官方源', en: 'Official source' },
    description: {
      zh: 'OpenAI 官方产品、研究与公司公告。',
      en: 'Official OpenAI product, research, and company updates.',
    },
    samples: {
      zh: ['模型、API 和产品能力更新', '研究发布和安全系统说明', '开发者平台、企业产品和公司公告'],
      en: ['Model, API, and product capability updates', 'Research releases and safety system notes', 'Developer platform, enterprise product, and company announcements'],
    },
    why: {
      zh: '适合作为 AI 产品和平台变化的基础校准源。',
      en: 'A baseline source for product and platform changes.',
    },
    suitableFor: { zh: 'AI 产品、平台生态、投资观察', en: 'AI product, platform ecosystem, investment tracking' },
    tags: { zh: ['官方发布', '平台', '研究'], en: ['Official', 'Platform', 'Research'] },
    cadence: { zh: '低频，权威', en: 'Low frequency, authoritative' },
  },
  {
    id: 'rss-anthropic-news',
    domain: 'ai',
    type: 'rss',
    name: 'Anthropic News',
    value: 'https://www.anthropic.com/news/rss.xml',
    role: { zh: '官方源', en: 'Official source' },
    description: {
      zh: 'Anthropic 官方模型、安全与产品动态。',
      en: 'Official Anthropic model, safety, and product updates.',
    },
    samples: {
      zh: ['Claude 模型和产品更新', '模型安全、对齐和评估说明', '企业 API、团队功能和客户案例'],
      en: ['Claude model and product updates', 'Model safety, alignment, and evaluation notes', 'Enterprise API, team features, and customer stories'],
    },
    why: {
      zh: '适合跟踪 Claude、模型安全和企业产品发布。',
      en: 'Useful for tracking Claude, model safety, and enterprise product releases.',
    },
    suitableFor: { zh: '企业 AI、模型安全、产品战略', en: 'Enterprise AI, model safety, product strategy' },
    tags: { zh: ['Claude', '安全', '企业'], en: ['Claude', 'Safety', 'Enterprise'] },
    cadence: { zh: '低频，权威', en: 'Low frequency, authoritative' },
  },
  {
    id: 'rss-fed-news',
    domain: 'finance',
    type: 'rss',
    name: 'Federal Reserve News',
    value: 'https://www.federalreserve.gov/feeds/press_all.xml',
    role: { zh: '宏观政策官方源', en: 'Official macro policy source' },
    description: {
      zh: '美联储新闻、政策声明和监管更新。',
      en: 'Federal Reserve news, policy statements, and regulatory updates.',
    },
    samples: {
      zh: ['FOMC 利率声明和会议纪要', '主席讲话、监管声明和银行系统更新', '经济预测、资产负债表和政策工具变化'],
      en: ['FOMC rate statements and meeting minutes', 'Chair speeches, regulatory statements, and banking updates', 'Economic projections, balance sheet, and policy tool changes'],
    },
    why: {
      zh: '适合把市场讨论校准到一手政策文本。',
      en: 'Grounds market discussion in first-party policy text.',
    },
    suitableFor: { zh: '金融从业者、宏观研究、投资观察', en: 'Finance professionals, macro research, investment tracking' },
    tags: { zh: ['宏观', '利率', '政策'], en: ['Macro', 'Rates', 'Policy'] },
    cadence: { zh: '低频，关键事件', en: 'Low frequency, event-driven' },
  },
  {
    id: 'rss-sec-press',
    domain: 'finance',
    type: 'rss',
    name: 'SEC Press Releases',
    value: 'https://www.sec.gov/news/pressreleases.rss',
    role: { zh: '监管官方源', en: 'Official regulatory source' },
    description: {
      zh: '美国 SEC 新闻稿和监管动态。',
      en: 'SEC press releases and regulatory updates.',
    },
    samples: {
      zh: ['执法行动、和解和处罚公告', '新规、征求意见和市场结构更新', '上市公司披露、交易平台和加密监管动态'],
      en: ['Enforcement actions, settlements, and penalties', 'Rulemaking, comment requests, and market structure updates', 'Disclosure, trading venue, and crypto regulation news'],
    },
    why: {
      zh: '适合跟踪监管变化、执法事件和资本市场规则信号。',
      en: 'Useful for tracking regulatory changes, enforcement, and capital-market signals.',
    },
    suitableFor: { zh: '金融合规、投资研究、市场观察', en: 'Compliance, investment research, market watching' },
    tags: { zh: ['监管', '资本市场', '合规'], en: ['Regulation', 'Capital markets', 'Compliance'] },
    cadence: { zh: '中频，事件驱动', en: 'Medium frequency, event-driven' },
  },
  {
    id: 'rss-financial-times',
    domain: 'finance',
    type: 'rss',
    name: 'Financial Times',
    value: 'https://www.ft.com/rss/home',
    role: { zh: '财经媒体', en: 'Financial media' },
    description: {
      zh: '全球商业、金融市场和宏观新闻。',
      en: 'Global business, financial markets, and macro news.',
    },
    samples: {
      zh: ['全球市场、央行和地缘政治事件', '公司、行业和资本市场深度报道', '宏观经济、货币政策和投资者情绪'],
      en: ['Global markets, central banks, and geopolitics', 'Company, industry, and capital market reporting', 'Macro economy, monetary policy, and investor sentiment'],
    },
    why: {
      zh: '适合作为金融行业每日输入的广谱媒体源。',
      en: 'A broad daily input source for finance and business context.',
    },
    suitableFor: { zh: '金融行业、商业分析、宏观观察', en: 'Finance, business analysis, macro tracking' },
    tags: { zh: ['市场', '商业', '宏观'], en: ['Markets', 'Business', 'Macro'] },
    cadence: { zh: '高频，综合', en: 'High frequency, broad' },
  },
]

export const channelPacks: ChannelPack[] = [
  {
    id: 'ai-builder-starter',
    domain: 'ai',
    title: { zh: 'AI 产品/工程启动包', en: 'AI builder starter pack' },
    description: {
      zh: '适合每天跟踪 AI 工具、模型和工程实践。',
      en: 'For tracking AI tools, models, and engineering practice every day.',
    },
    channelIds: ['x-karpathy', 'x-simonw', 'x-swyx', 'rss-openai-blog', 'rss-anthropic-news'],
  },
  {
    id: 'finance-macro-starter',
    domain: 'finance',
    title: { zh: '金融宏观雷达', en: 'Finance macro radar' },
    description: {
      zh: '适合金融从业者跟踪政策、监管和市场信号。',
      en: 'For finance professionals tracking policy, regulation, and market signals.',
    },
    channelIds: ['rss-fed-news', 'rss-sec-press', 'rss-financial-times'],
  },
]

export function findMarketChannel(id: string): MarketChannel | null {
  return marketChannels.find((channel) => channel.id === id) ?? null
}

export function expandChannelSelection(channelIds: string[], packIds: string[]): string[] {
  const expanded = [...channelIds]
  for (const packId of packIds) {
    const pack = channelPacks.find((entry) => entry.id === packId)
    if (pack) expanded.push(...pack.channelIds)
  }
  return [...new Set(expanded)]
}

export function channelKey(channel: Pick<MarketChannel, 'type' | 'value'>): string {
  return `${channel.type}:${channel.value}`
}

export function sourceHref(lang: Lang, channel: Pick<MarketChannel, 'id'>): string {
  return `${localizedPath(lang, 'channels')}/${encodeURIComponent(channel.id)}`
}

export function manualSourceHref(lang: Lang, channel: Pick<MarketChannel, 'type' | 'value'>): string {
  return `${localizedPath(lang, 'sources/new')}?type=${channel.type}&q=${encodeURIComponent(channel.value)}&intent=add`
}

export function channelSubtitle(channel: Pick<MarketChannel, 'type' | 'value'>): string {
  if (channel.type === 'x') return `@${channel.value}`
  try {
    return new URL(channel.value).hostname.replace(/^www\./, '')
  } catch {
    return channel.value
  }
}
