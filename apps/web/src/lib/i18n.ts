export type Lang = 'zh' | 'en'

const translations: Record<Lang, Record<string, string>> = {
  zh: {
    tagline: 'Read Less. Know More.',
    'header.sources': '信息源',
    'header.items': '条资讯',
    'nav.today': '首页',
    'nav.channels': '频道发现',
    'nav.archive': '归档',
    'nav.subscription': '订阅',
    'nav.about': '关于',
    'auth.login': '登录',
    'observations.title': '今日观察',
    'keyStories.title': '今日关键',
    'home.fallbackTitle': '最新资讯',
    'home.briefTitle': '今日简报',
    'home.briefSubtitle': '从你关注的来源里，保留今天最值得看的变化。',
    'home.channelTitle': '频道信号',
    'home.channelSubtitle': '',
    'home.signalLabel': '私人阅读台',
    'home.digestPending': 'AI 解读正在生成中。',
    'allItems.title': '全部资讯',
    'allItems.items': '条资讯',
    'allItems.empty': '暂无数据，请先运行采集。',
    'sourceFilter.label': '内容频道',
    'sourceFilter.title': '内容频道',
    'sourceFilter.all': '全部',
    'archive.title': '归档',
    'archive.days': '天',
    'archive.items': '条',
    'archive.empty': '暂无数据，请先运行采集。',
    'archive.digestReady': '含日报',
    'pagination.label': '分页',
    'pagination.previous': '上一页',
    'pagination.next': '下一页',
    'pagination.page': '第',
    'about.title': '关于 reado',
    'about.subtitle': 'AI 情报站 — 抹平信息差',
    'about.description': 'reado 是一个 AI 驱动的信息聚合平台，从 165+ 信息源自动采集 AI 领域资讯，由 AI 生成结构化日报，帮助你高效掌握全球 AI 动态。',
    'about.vision.title': '愿景',
    'about.vision.text': '一个人读不完世界，一群人可以。我们相信信息不应该有壁垒，每个人都应该平等地获取前沿科技资讯。',
    'about.sources.title': '信息源',
    'about.sources.text': '覆盖 AI 公司博客、科技媒体、学术论文、开源项目、社交媒体、开发者社区等 165+ 信息源，每天早晚两次自动采集。',
    'about.how.title': '工作原理',
    'about.how.text': 'reado CLI 自动采集 → AI 精选摘要 → 静态网站 + 飞书群推送，全流程自动化，无需人工干预。',
    'about.join.title': '加入我们',
    'about.join.text': '欢迎加入飞书群获取每日推送，或在 GitHub 贡献代码。',
    'footer.slogan': '一个人读不完世界，一群人可以。Read Less. Know More.',
    'footer.feedback': '反馈',
    'feedback.cta': '提交反馈',
    'category.ai-company': 'AI 公司',
    'category.tech-media': '科技媒体',
    'category.opensource': '开源',
    'category.academic': '学术',
    'category.community': '社区',
    'category.twitter': 'X',
    'category.china-media': '中文媒体',
    'xReader.title': 'X 账号',
    'xReader.subtitle': '',
    'xReader.accounts': '',
    'xReader.addAccount': '添加账号',
    'xReader.detail': '详情',
    'xReader.openProfile': 'X 主页',
    'xReader.items': '条内容',
    'xReader.followers': '关注者',
    'xReader.empty': '你还没有订阅任何 X 账号。',
    'xReader.emptyItemsPrefix': '这个账号还没有采集到内容：',
    'xReader.loginTitle': '登录后查看 X 订阅',
    'xReader.loginText': 'X 账号订阅是用户级能力。登录后可以订阅账号，并在这里按账号阅读内容。',
    'xReader.unavailableTitle': 'X 订阅暂不可用',
    'xReader.unavailableText': '当前环境没有可用的 D1 数据库，无法读取订阅关系。',
    'xReader.subscribedPrefix': '已订阅账号：',
    'lang.switch': 'EN',
  },
  en: {
    tagline: 'Read Less. Know More.',
    'header.sources': 'sources',
    'header.items': 'items',
    'nav.today': 'Home',
    'nav.channels': 'Channels',
    'nav.archive': 'Archive',
    'nav.subscription': 'Subscription',
    'nav.about': 'About',
    'auth.login': 'Sign in',
    'observations.title': 'Daily Observations',
    'keyStories.title': 'Key Stories',
    'home.fallbackTitle': 'Latest Items',
    'home.briefTitle': 'Today Brief',
    'home.briefSubtitle': 'The changes worth keeping from the sources you follow.',
    'home.channelTitle': 'Channel Signals',
    'home.channelSubtitle': '',
    'home.signalLabel': 'Private reading desk',
    'home.digestPending': 'AI digest is being generated.',
    'allItems.title': 'All Items',
    'allItems.items': 'items',
    'allItems.empty': 'No data yet. Run collection first.',
    'sourceFilter.label': 'Content channels',
    'sourceFilter.title': 'Content channels',
    'sourceFilter.all': 'All',
    'archive.title': 'Archive',
    'archive.days': 'days',
    'archive.items': 'items',
    'archive.empty': 'No data yet. Run collection first.',
    'archive.digestReady': 'Digest ready',
    'pagination.label': 'Pagination',
    'pagination.previous': 'Previous',
    'pagination.next': 'Next',
    'pagination.page': 'Page',
    'about.title': 'About reado',
    'about.subtitle': 'AI Intelligence Station — Bridging the Information Gap',
    'about.description': 'reado is an AI-driven information aggregation platform that automatically collects AI news from 165+ sources, generates structured daily reports, and helps you stay on top of global AI developments.',
    'about.vision.title': 'Vision',
    'about.vision.text': 'One person can’t read the world, but together we can. We believe information should be accessible to everyone.',
    'about.sources.title': 'Sources',
    'about.sources.text': 'Covering AI company blogs, tech media, academic papers, open source projects, social media, and developer communities, collected twice a day.',
    'about.how.title': 'How It Works',
    'about.how.text': 'reado CLI auto-collects → AI curates and summarizes → website and Feishu distribution. The loop is designed for autonomous operation.',
    'about.join.title': 'Join Us',
    'about.join.text': 'Join the Feishu group for daily updates, or contribute on GitHub.',
    'footer.slogan': 'One person can’t read the world. Together, we can. Read Less. Know More.',
    'footer.feedback': 'Feedback',
    'feedback.cta': 'Send feedback',
    'category.ai-company': 'AI Company',
    'category.tech-media': 'Tech Media',
    'category.opensource': 'Open Source',
    'category.academic': 'Academic',
    'category.community': 'Community',
    'category.twitter': 'X',
    'category.china-media': 'Chinese Media',
    'xReader.title': 'X accounts',
    'xReader.subtitle': '',
    'xReader.accounts': '',
    'xReader.addAccount': 'Add account',
    'xReader.detail': 'Details',
    'xReader.openProfile': 'X profile',
    'xReader.items': 'items',
    'xReader.followers': 'followers',
    'xReader.empty': 'You have not subscribed to any X account yet.',
    'xReader.emptyItemsPrefix': 'No collected content yet for',
    'xReader.loginTitle': 'Sign in to read X subscriptions',
    'xReader.loginText': 'X subscriptions are user-level. Sign in to subscribe accounts and read them here.',
    'xReader.unavailableTitle': 'X subscriptions are unavailable',
    'xReader.unavailableText': 'This environment does not have a usable D1 database for subscription data.',
    'xReader.subscribedPrefix': 'Subscribed account:',
    'lang.switch': '中文',
  },
}

export function t(lang: Lang, key: string): string {
  return translations[lang][key] ?? translations.en[key] ?? key
}

export function localizedPath(lang: Lang, path: string = ''): string {
  const normalized = path.replace(/^\/+|\/+$/g, '')
  if (lang === 'zh') {
    return normalized ? `/${normalized}` : '/'
  }
  return normalized ? `/en/${normalized}` : '/en'
}

export function readerHomePath(lang: Lang): string {
  return lang === 'zh' ? '/today' : '/en'
}

export function switchPath(lang: Lang, path: string = ''): string {
  return localizedPath(lang === 'zh' ? 'en' : 'zh', path)
}

export function getDateLocale(lang: Lang): string {
  return lang === 'zh' ? 'zh-CN' : 'en-US'
}

export function formatDayLabel(date: string, lang: Lang): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(getDateLocale(lang), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

export function formatPublishedAt(date: string, lang: Lang): string {
  return new Date(date).toLocaleDateString(getDateLocale(lang), {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
