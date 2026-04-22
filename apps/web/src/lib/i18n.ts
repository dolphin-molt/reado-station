export type Lang = 'zh' | 'en'

const translations: Record<Lang, Record<string, string>> = {
  zh: {
    tagline: 'Read Less. Know More.',
    'header.sources': '信息源',
    'header.items': '条资讯',
    'nav.today': '今日',
    'nav.archive': '归档',
    'nav.about': '关于',
    'observations.title': '今日观察',
    'keyStories.title': '今日关键',
    'allItems.title': '全部资讯',
    'allItems.items': '条资讯',
    'allItems.empty': '暂无数据，请先运行采集。',
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
    'category.twitter': 'Twitter',
    'category.china-media': '中文媒体',
    'lang.switch': 'EN',
  },
  en: {
    tagline: 'Read Less. Know More.',
    'header.sources': 'sources',
    'header.items': 'items',
    'nav.today': 'Today',
    'nav.archive': 'Archive',
    'nav.about': 'About',
    'observations.title': 'Daily Observations',
    'keyStories.title': 'Key Stories',
    'allItems.title': 'All Items',
    'allItems.items': 'items',
    'allItems.empty': 'No data yet. Run collection first.',
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
    'category.twitter': 'Twitter',
    'category.china-media': 'Chinese Media',
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
