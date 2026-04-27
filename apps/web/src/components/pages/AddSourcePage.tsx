import Link from 'next/link'

import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { localizedPath, type Lang } from '@/lib/i18n'

interface AddSourcePageProps {
  error?: string
  intent?: string
  lang: Lang
  query?: string
  type?: string
}

interface SuggestedXAccount {
  description: Record<Lang, string>
  name: string
  username: string
}

interface SuggestedRssSource {
  description: Record<Lang, string>
  name: string
  url: string
}

const suggestedXAccounts: SuggestedXAccount[] = [
  {
    name: 'OpenAI',
    username: 'OpenAI',
    description: {
      zh: '官方产品与平台发布，适合作为 AI 公司基础源。',
      en: 'Official product and platform updates for the core AI company feed.',
    },
  },
  {
    name: 'Anthropic',
    username: 'AnthropicAI',
    description: {
      zh: '模型发布、安全研究和团队动态。',
      en: 'Model launches, safety research, and team updates.',
    },
  },
  {
    name: 'Andrej Karpathy',
    username: 'karpathy',
    description: {
      zh: '高信号工程与模型思考，适合个人观察列表。',
      en: 'High-signal engineering and model thinking for personal watchlists.',
    },
  },
  {
    name: 'Shawn Wang',
    username: 'swyx',
    description: {
      zh: '开发者视角的 AI 产品、工作流和社区讨论。',
      en: 'AI product, workflow, and community discussions from a builder perspective.',
    },
  },
]

const suggestedRssSources: SuggestedRssSource[] = [
  {
    name: 'OpenAI Blog',
    url: 'https://openai.com/news/rss.xml',
    description: {
      zh: 'OpenAI 官方产品、研究与公司公告。',
      en: 'Official OpenAI product, research, and company updates.',
    },
  },
  {
    name: 'Anthropic News',
    url: 'https://www.anthropic.com/news/rss.xml',
    description: {
      zh: 'Anthropic 官方模型、安全与产品动态。',
      en: 'Official Anthropic model, safety, and product updates.',
    },
  },
  {
    name: 'Google DeepMind',
    url: 'https://deepmind.google/discover/blog/rss.xml',
    description: {
      zh: 'Google DeepMind 研究和产品进展。',
      en: 'Google DeepMind research and product progress.',
    },
  },
  {
    name: 'Hugging Face Blog',
    url: 'https://huggingface.co/blog/feed.xml',
    description: {
      zh: '模型、数据集、开源工具和社区实践。',
      en: 'Models, datasets, open source tooling, and community practice.',
    },
  },
]

interface AddSourceCopy {
  kicker: string
  title: string
  subtitle: string
  sourceTypes: Array<{ id: 'x' | 'rss'; title: string; detail: string }>
  xLabel: string
  xPlaceholder: string
  xHint: string
  xSubmit: string
  xNotice: string
  rssLabel: string
  rssPlaceholder: string
  rssHint: string
  rssSubmit: string
  visibilityLabel: string
  privateLabel: string
  publicLabel: string
  backfillLabel: string
  backfillOptions: Record<string, string>
  recommendedTitle: string
  recommendedSubtitle: string
  fillHandle: string
  useSource: string
  noSuggested: string
  errorMessages: Record<string, string>
}

const copy: Record<Lang, AddSourceCopy> = {
  zh: {
    kicker: 'reado 信息源接入',
    title: '添加信息源',
    subtitle: '订阅 X 或 RSS 源，选择私有/公开共享与回溯窗口。提交后系统会建立 workspace 订阅并排队采集。',
    sourceTypes: [
      { id: 'x', title: 'X 账号', detail: '按用户名订阅，缓存账号资料' },
      { id: 'rss', title: 'RSS', detail: '标准订阅源，排队回溯' },
    ],
    xLabel: 'X 用户名或主页链接',
    xPlaceholder: '@OpenAI / https://x.com/OpenAI',
    xHint: 'X 入库信息按 1 item = 1 credit 扣减；如果额度不足，回溯任务会保留已入库内容并标记为部分完成。',
    xSubmit: '订阅账号',
    xNotice: '线索已放入输入框，可以直接发起订阅。',
    rssLabel: 'RSS / Atom URL',
    rssPlaceholder: 'https://example.com/feed.xml',
    rssHint: 'RSS 回溯暂不扣 credits，但会受套餐源数量、回溯窗口与后台 runner 单次最大条数限制。',
    rssSubmit: '订阅 RSS',
    visibilityLabel: '共享设置',
    privateLabel: '私有',
    publicLabel: '公开共享',
    backfillLabel: '回溯窗口',
    backfillOptions: { '24': '24 小时', '168': '7 天', '720': '30 天' },
    recommendedTitle: '推荐先订阅这些账号',
    recommendedSubtitle: '这些账号适合作为 X 入口源，订阅后会在 X 分类里按账号阅读。',
    fillHandle: '填入',
    useSource: '使用',
    noSuggested: '没有匹配的预制源，直接输入也可以。',
    errorMessages: {
      d1: '当前环境没有可用的 D1 数据库，无法保存订阅关系。',
      'invalid-handle': '请输入合法的 X 用户名或账号主页链接。',
      'missing-token': '还没有配置 X API Bearer Token，暂时无法查询账号信息。',
      unauthorized: '当前 X API Bearer Token 无效，或没有读取用户资料的权限。',
      'not-found': '没有找到这个 X 账号，请检查用户名。',
      'api-error': 'X 接口调用失败，请稍后再试。',
      'invalid-source': '请输入合法的 RSS URL。',
      'limit-sources': '当前套餐的信息源数量已达上限。',
      'limit-backfill': '当前套餐不支持这个回溯窗口。',
      'insufficient-credits': '当前 workspace credits 不足，无法发起 X 回溯。',
      unknown: '订阅失败，请稍后再试。',
    },
  },
  en: {
    kicker: 'reado source intake',
    title: 'Add Source',
    subtitle: 'Subscribe to X or RSS, choose privacy and a backfill window, then let the queue collect the history.',
    sourceTypes: [
      { id: 'x', title: 'X account', detail: 'Subscribe by username and cache profile data' },
      { id: 'rss', title: 'RSS', detail: 'Standard feed sources with queued backfill' },
    ],
    xLabel: 'X username or profile URL',
    xPlaceholder: '@OpenAI / https://x.com/OpenAI',
    xHint: 'X items cost 1 credit per stored item. If credits run out, the job keeps what was imported and is marked partial.',
    xSubmit: 'Subscribe account',
    xNotice: 'The handle is in the input. You can subscribe directly.',
    rssLabel: 'RSS / Atom URL',
    rssPlaceholder: 'https://example.com/feed.xml',
    rssHint: 'RSS backfill does not spend credits in V1, but plan source count, backfill window, and runner item caps still apply.',
    rssSubmit: 'Subscribe RSS',
    visibilityLabel: 'Sharing',
    privateLabel: 'Private',
    publicLabel: 'Public shared',
    backfillLabel: 'Backfill window',
    backfillOptions: { '24': '24h', '168': '7d', '720': '30d' },
    recommendedTitle: 'Recommended starter accounts',
    recommendedSubtitle: 'These make a strong X reading foundation. After subscribing, they appear in the X reader.',
    fillHandle: 'Use handle',
    useSource: 'Use',
    noSuggested: 'No matching preset source. You can enter one directly.',
    errorMessages: {
      d1: 'This environment does not have a usable D1 database for subscriptions.',
      'invalid-handle': 'Please enter a valid X username or profile URL.',
      'missing-token': 'X API bearer token is not configured yet.',
      unauthorized: 'The current X API bearer token is invalid or missing permission to read profile data.',
      'not-found': 'This X account could not be found.',
      'api-error': 'X API request failed. Please try again later.',
      'invalid-source': 'Please enter a valid RSS URL.',
      'limit-sources': 'Your current plan has reached the source limit.',
      'limit-backfill': 'Your current plan does not allow this backfill window.',
      'insufficient-credits': 'This workspace needs credits before starting an X backfill.',
      unknown: 'Subscription failed. Please try again later.',
    },
  },
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase()
}

function filterSuggestedAccounts(query: string): SuggestedXAccount[] {
  const normalized = normalizeQuery(query)
  if (!normalized) return suggestedXAccounts

  return suggestedXAccounts.filter((account) =>
    [account.name, account.username, account.description.zh, account.description.en].some((value) => value.toLowerCase().includes(normalized)),
  )
}

function filterSuggestedRssSources(query: string): SuggestedRssSource[] {
  const normalized = normalizeQuery(query)
  if (!normalized) return suggestedRssSources

  return suggestedRssSources.filter((source) =>
    [source.name, source.url, source.description.zh, source.description.en].some((value) => value.toLowerCase().includes(normalized)),
  )
}

export async function AddSourcePage({ error = '', intent = '', lang, query = '', type = 'x' }: AddSourcePageProps) {
  const text = copy[lang]
  const sourceType = type === 'rss' ? 'rss' : 'x'
  const suggestions = sourceType === 'x' ? filterSuggestedAccounts(query) : filterSuggestedRssSources(query)
  const nextPath = sourceType === 'x' ? `${localizedPath(lang)}?category=twitter` : localizedPath(lang)
  const errorMessage = error ? text.errorMessages[error] ?? text.errorMessages.unknown : ''

  return (
    <div className="page-shell">
      <Header lang={lang} active="source-add" path="sources/new" />

      <main className="container section-stack source-intake">
        <section className="panel source-intake__panel">
          <div className="source-intake__heading">
            <span>{text.kicker}</span>
            <h1>{text.title}</h1>
            <p>{text.subtitle}</p>
          </div>

          <div className="source-intake__type-tabs" role="tablist">
            {text.sourceTypes.map((entry) => {
              const active = sourceType === entry.id
              return (
                <Link
                  aria-selected={active}
                  className="source-intake__type-tab"
                  data-active={active}
                  href={`${localizedPath(lang, 'sources/new')}?type=${entry.id}`}
                  key={entry.id}
                  role="tab"
                >
                  <strong>{entry.title}</strong>
                  <small>{entry.detail}</small>
                </Link>
              )
            })}
          </div>

          <form action="/api/workspace-sources" className="source-intake__form" method="post">
              <input name="lang" type="hidden" value={lang} />
              <input name="type" type="hidden" value={sourceType} />
              <input name="next" type="hidden" value={nextPath} />

              <label className="auth-field source-intake__query">
                <span>{sourceType === 'x' ? text.xLabel : text.rssLabel}</span>
                <input
                  defaultValue={query}
                  name="value"
                  placeholder={sourceType === 'x' ? text.xPlaceholder : text.rssPlaceholder}
                  type={sourceType === 'x' ? 'text' : 'url'}
                />
              </label>

              <div className="source-intake__options">
                <label className="auth-field">
                  <span>{text.visibilityLabel}</span>
                  <select name="visibility" defaultValue="private">
                    <option value="private">{text.privateLabel}</option>
                    <option value="public">{text.publicLabel}</option>
                  </select>
                </label>
                <label className="auth-field">
                  <span>{text.backfillLabel}</span>
                  <select name="backfillHours" defaultValue="24">
                    {Object.entries(text.backfillOptions).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <p className="source-intake__hint">{sourceType === 'x' ? text.xHint : text.rssHint}</p>
              {intent === 'add' && query.trim().length > 0 && <p className="source-intake__notice">{text.xNotice}</p>}
              {errorMessage && <p className="auth-message auth-message--error">{errorMessage}</p>}

              <div className="source-intake__controls source-intake__controls--single">
                <button className="auth-submit" type="submit">
                  {sourceType === 'x' ? text.xSubmit : text.rssSubmit}
                </button>
              </div>
            </form>
        </section>

        <section className="source-intake__library">
          <div className="source-intake__section-heading">
            <div>
              <h2>{sourceType === 'x' ? text.recommendedTitle : lang === 'zh' ? '系统预制信息源' : 'Preset sources'}</h2>
              <p>{sourceType === 'x' ? text.recommendedSubtitle : lang === 'zh' ? '这些是系统预制的基础 RSS 源，适合快速建立 AI 资讯入口。' : 'These preset RSS sources are a useful baseline for AI news intake.'}</p>
            </div>
          </div>

          <div className="source-intake__results">
            {suggestions.length > 0 ? (
              suggestions.map((source) => {
                const isX = 'username' in source
                const value = isX ? source.username : source.url
                const href = `${localizedPath(lang, 'sources/new')}?type=${sourceType}&q=${encodeURIComponent(value)}&intent=add`

                return (
                  <article className="source-suggestion" key={value}>
                    <div className="source-suggestion__avatar">{source.name.slice(0, 1)}</div>
                    <div className="source-suggestion__content">
                      <div className="source-suggestion__meta">
                        <span className="status-pill status-pill--ok">{isX ? 'X' : 'RSS'}</span>
                        <span>{isX ? `@${source.username}` : new URL(source.url).hostname.replace(/^www\./, '')}</span>
                      </div>
                      <h2>{source.name}</h2>
                      <p>{source.description[lang]}</p>
                      <code>{isX ? `https://x.com/${source.username}` : source.url}</code>
                    </div>
                    <div className="source-suggestion__actions">
                      <Link className="table-link" href={href}>
                        {isX ? text.fillHandle : text.useSource}
                      </Link>
                    </div>
                  </article>
                )
              })
            ) : (
              <div className="empty-state">{text.noSuggested}</div>
            )}
          </div>
        </section>
      </main>

      <Footer lang={lang} />
    </div>
  )
}
