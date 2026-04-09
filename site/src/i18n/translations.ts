export type Lang = 'zh' | 'en';

const translations: Record<Lang, Record<string, string>> = {
  zh: {
    // Header
    'tagline': 'Read Less. Know More.',
    'header.sources': '信息源',
    'header.items': '条资讯',

    // Nav
    'nav.today': '今日',
    'nav.archive': '归档',
    'nav.about': '关于',

    // Stats bar
    'stats.items': '总计',
    'stats.news': '新闻',
    'stats.opensource': '开源',
    'stats.community': '社区',
    'stats.twitter': '推特',

    // Section headers
    'section.news': '新闻 & 公司',
    'section.opensource': '开源 & 论文',
    'section.community': '社区',
    'section.twitter': 'Twitter / X',

    // Category labels
    'category.ai-company': 'AI 公司',
    'category.tech-media': '科技媒体',
    'category.opensource': '开源',
    'category.academic': '学术',
    'category.community': '社区',
    'category.twitter': 'Twitter',
    'category.china-media': '中文媒体',

    // Observations
    'observations.title': '今日观察',

    // Briefing
    'briefing.title': '今日速览',

    // Footer
    'footer.slogan': '一个人读不完世界，一群人可以。Read Less. Know More.',
    'footer.feedback': '反馈',

    // Archive
    'archive.title': '归档',
    'archive.items': '条',

    // About
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

    // Feedback
    'feedback.title': '反馈',
    'feedback.description': '发现缺少的信息源？信息有误？有好的建议？告诉我们，AI Agent 会自动处理你的反馈。',
    'feedback.name': '你的名字',
    'feedback.email': '邮箱',
    'feedback.type.source': '缺少信息源',
    'feedback.type.bug': '信息有误',
    'feedback.type.suggestion': '建议 / 其他',
    'feedback.message': '请描述你的反馈...',
    'feedback.submit': '提交',
    'feedback.success': '已提交，感谢你的反馈！',

    // Language
    'lang.switch': 'EN',
  },

  en: {
    // Header
    'tagline': 'Read Less. Know More.',
    'header.sources': 'sources',
    'header.items': 'items',

    // Nav
    'nav.today': 'Today',
    'nav.archive': 'Archive',
    'nav.about': 'About',

    // Stats bar
    'stats.items': 'Items',
    'stats.news': 'News',
    'stats.opensource': 'Open Source',
    'stats.community': 'Community',
    'stats.twitter': 'Twitter',

    // Section headers
    'section.news': 'News & Company',
    'section.opensource': 'Open Source & Papers',
    'section.community': 'Community',
    'section.twitter': 'Twitter / X',

    // Category labels
    'category.ai-company': 'AI Company',
    'category.tech-media': 'Tech Media',
    'category.opensource': 'Open Source',
    'category.academic': 'Academic',
    'category.community': 'Community',
    'category.twitter': 'Twitter',
    'category.china-media': 'Chinese Media',

    // Observations
    'observations.title': 'Daily Observations',

    // Briefing
    'briefing.title': 'Daily Briefing',

    // Footer
    'footer.slogan': 'One person can\'t read the world. Together, we can. Read Less. Know More.',
    'footer.feedback': 'Feedback',

    // Archive
    'archive.title': 'Archive',
    'archive.items': 'items',

    // About
    'about.title': 'About reado',
    'about.subtitle': 'AI Intelligence Station — Bridging the Information Gap',
    'about.description': 'reado is an AI-driven information aggregation platform that automatically collects AI news from 165+ sources, generates structured daily reports, and helps you stay on top of global AI developments.',
    'about.vision.title': 'Vision',
    'about.vision.text': 'One person can\'t read the world, but together we can. We believe information should be accessible to everyone — no walls, no barriers.',
    'about.sources.title': 'Sources',
    'about.sources.text': 'Covering 165+ sources including AI company blogs, tech media, academic papers, open source projects, social media, and developer communities. Auto-collected twice daily.',
    'about.how.title': 'How It Works',
    'about.how.text': 'reado CLI auto-collects → AI curates & summarizes → static site + Feishu group push. Fully automated, zero manual effort.',
    'about.join.title': 'Join Us',
    'about.join.text': 'Join our Feishu group for daily updates, or contribute on GitHub.',

    // Feedback
    'feedback.title': 'Feedback',
    'feedback.description': 'Missing a source? Found an error? Have a suggestion? Let us know — the AI Agent will process your feedback automatically.',
    'feedback.name': 'Your name',
    'feedback.email': 'Email',
    'feedback.type.source': 'Missing source',
    'feedback.type.bug': 'Report error',
    'feedback.type.suggestion': 'Suggestion / Other',
    'feedback.message': 'Describe your feedback...',
    'feedback.submit': 'Submit',
    'feedback.success': 'Submitted, thanks for your feedback!',

    // Language
    'lang.switch': '中文',
  },
};

export function t(lang: Lang, key: string): string {
  return translations[lang]?.[key] ?? translations['en']?.[key] ?? key;
}

export function getDateLocale(lang: Lang): string {
  return lang === 'zh' ? 'zh-CN' : 'en-US';
}

/**
 * Build a localized path. Chinese = root, English = /en/ prefix.
 */
export function localePath(base: string, lang: Lang, path: string = ''): string {
  const b = base.endsWith('/') ? base : base + '/';
  const p = path.startsWith('/') ? path.slice(1) : path;
  if (lang === 'zh') return `${b}${p}`;
  return `${b}en/${p}`;
}

/**
 * Get the alternate language URL for the language switcher.
 */
export function altLangUrl(base: string, lang: Lang, currentPath: string): string {
  const b = base.endsWith('/') ? base : base + '/';
  const enPrefix = `${b}en/`;

  if (lang === 'zh') {
    // Currently Chinese → link to English
    const relative = currentPath.startsWith(b) ? currentPath.slice(b.length) : '';
    return `${enPrefix}${relative}`;
  } else {
    // Currently English → link to Chinese
    const relative = currentPath.startsWith(enPrefix) ? currentPath.slice(enPrefix.length) : '';
    return `${b}${relative}`;
  }
}
