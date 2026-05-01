export const landingCtas = {
  primary: {
    label: 'Start tuning',
    href: '/login?next=/today',
  },
  secondary: {
    label: 'Hear a sample brief',
    href: '#sample-brief',
  },
} as const

export const landingNav = [
  { label: 'Private signal station', href: '#product' },
  { label: 'How it works', href: '#sources' },
  { label: 'Pricing', href: '#pricing' },
] as const

export const landingSteps = [
  {
    index: '01',
    title: 'Tune your channels.',
    body: 'Patch X accounts, RSS feeds, newsletters, and product signals into a station that belongs to you.',
  },
  {
    index: '02',
    title: 'Filter the noise.',
    body: 'reado scans the static, groups repeats, keeps source trails, and lifts the updates worth your attention.',
  },
  {
    index: '03',
    title: 'Receive the brief.',
    body: 'Your daily transmission arrives short, sourced, and ready to continue tomorrow.',
  },
] as const

export const scrollChapters = [
  {
    state: 'tune',
    index: '01',
    title: 'Tune your channels.',
    body: 'Choose the accounts and feeds worth keeping close. reado treats every source like a channel on your private dial.',
    pageTitle: 'Private signal station',
    pageNote: 'Tuned. Personal. Yours.',
    marks: ['92.4 X', '101.7 RSS', '88.1 Labs', '76.3 Briefs'],
  },
  {
    state: 'scan',
    index: '02',
    title: 'Scan the static.',
    body: 'Repeated updates collapse into patterns. The noisy stream becomes a compact signal map you can trust.',
    pageTitle: 'Noise Filter',
    pageNote: 'Repeats collapsed, context kept',
    marks: ['Launches', 'Research', 'Funding', 'Tools'],
  },
  {
    state: 'brief',
    index: '03',
    title: 'Catch the brief.',
    body: 'The final page is not another feed. It is a daily transmission: short, sourced, and easy to act on.',
    pageTitle: 'Daily Transmission',
    pageNote: 'A short reading signal',
    marks: ['Top updates', 'Why it matters', 'Source trail'],
  },
] as const

export const pricingPlans = [
  {
    name: 'Free',
    price: '$0',
    cadence: 'starter',
    note: 'Try the public feed and basic reading.',
    features: ['3 sources', '24h backfill', 'X/RSS subscriptions', 'Basic reading experience'],
    cta: 'Start free',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$12',
    cadence: '/ month',
    note: 'Follow AI, product, and technical signals daily.',
    features: ['20 sources', '7d backfill', 'Shared source subscriptions', 'Customer Portal billing'],
    cta: 'Upgrade Pro',
    highlighted: true,
  },
  {
    name: 'Power',
    price: '$29',
    cadence: '/ month',
    note: 'For heavy readers, researchers, and creators.',
    features: ['100 sources', '30d backfill', 'Advanced filters and topic tracking', 'Built for frequent backfills'],
    cta: 'Upgrade Power',
    highlighted: false,
  },
  {
    name: 'Team',
    price: '$99',
    cadence: '/ month+',
    note: 'For teams maintaining shared sources and knowledge.',
    features: ['Starts with 5 seats', 'Team shared source pool', '100 sources', '30d backfill'],
    cta: 'Talk to us',
    highlighted: false,
  },
] as const

export const landingContact = {
  email: 'hello@reado.ai',
  name: 'Liu Xini',
  feedbackSubject: 'Feedback for reado',
  digestSubject: 'I am interested in the reado daily brief',
  interests: ['Daily brief trial', 'Product feedback', 'Source recommendation', 'Team plan'] as const,
} as const

export const sampleBrief = {
  date: 'Today Brief',
  readTime: '8 min read',
  sources: ['OpenAI', 'GitHub', 'X', 'Hacker News', 'ArXiv'],
  sections: [
    {
      title: 'Top Updates',
      items: ['OpenAI ships a coding workflow update', 'New agent tooling lands across developer platforms', 'A popular model benchmark changes its ranking method'],
    },
    {
      title: 'Research',
      items: ['Memory-augmented systems get a practical reliability note', 'Small models improve on tool-use tasks', 'Evaluation papers converge on better source attribution'],
    },
    {
      title: 'Industry',
      items: ['AI infrastructure pricing keeps moving downward', 'Subscription products add source-level controls', 'Teams shift from chat logs to persistent briefs'],
    },
  ],
} as const
