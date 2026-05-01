import Link from 'next/link'

import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { DailyObservations } from '@/components/news/DailyObservations'
import { KeyStories } from '@/components/news/KeyStories'
import { NewsCard } from '@/components/news/NewsCard'
import { XReaderPage } from '@/components/pages/XReaderPage'
import { Pagination } from '@/components/ui/Pagination'
import { getCurrentAuthSession } from '@/lib/auth'
import { getD1Binding } from '@/lib/cloudflare'
import { getHomePageData } from '@/lib/content'
import { localizedPath, t, type Lang } from '@/lib/i18n'
import { loadRadioEpisode } from '@/lib/radio'
import { getWorkspaceSourceCount, getDefaultWorkspaceForUser } from '@/lib/workspaces'

function ItemsPanel({
  data,
  lang,
  title,
}: {
  data: Awaited<ReturnType<typeof getHomePageData>>
  lang: Lang
  title: string
}) {
  return (
    <main className="container reader-feed-desk">
      <section className="panel reader-feed-panel">
        <div className="panel__header">
          <h2>{title}</h2>
          {data.date && (
            <p>
              {data.pagination.totalItems} {t(lang, 'allItems.items')}
            </p>
          )}
        </div>

        {data.items.length > 0 ? (
          <div className="news-grid">
            {data.items.map((item) => (
              <NewsCard item={item} key={item.id} lang={lang} />
            ))}
          </div>
        ) : (
          <div className="empty-state">{t(lang, 'allItems.empty')}</div>
        )}

        <Pagination
          lang={lang}
          pagination={data.pagination}
          query={data.activeCategory ? { category: data.activeCategory } : undefined}
        />
      </section>
    </main>
  )
}

function DigestPending({ lang }: { lang: Lang }) {
  return (
    <main className="container reader-empty-wrap">
      <section className="reader-empty-brief">
        <div>
          <span>{lang === 'zh' ? '今日简报' : 'Today Brief'}</span>
          <h2>{t(lang, 'home.digestPending')}</h2>
          <p>
            {lang === 'zh'
              ? '你可以先添加关注的信息源。reado 会在内容准备好后，把新的更新整理成一份更短、更容易读的日报。'
              : 'Add the sources you care about first. reado will turn new updates into a shorter daily brief when the digest is ready.'}
          </p>
        </div>
        <Link href={localizedPath(lang, 'sources/new')}>{lang === 'zh' ? '添加信息源' : 'Add sources'}</Link>
      </section>
    </main>
  )
}

function OnboardingPrompt({ lang }: { lang: Lang }) {
  return (
    <main className="container reader-empty-wrap">
      <section className="reader-empty-brief onboarding-panel">
        <div>
          <span>{lang === 'zh' ? '建立你的输入台' : 'Build your input station'}</span>
          <h2>{lang === 'zh' ? '先告诉 reado 你每天想听什么信号' : 'Tell reado what signals you want every day'}</h2>
          <p>{lang === 'zh'
            ? '选择行业、目标和主题后，reado 会推荐 AI + 金融频道包。你也可以跳过，直接去频道发现。'
            : 'Choose your industry, goals, and topics. reado will recommend AI + finance starter packs. You can skip this and go straight to channels.'}</p>
        </div>
        <form action="/api/onboarding" className="onboarding-form" method="post">
          <input name="lang" type="hidden" value={lang} />
          <input name="next" type="hidden" value={localizedPath(lang, 'channels')} />
          <label>
            <span>{lang === 'zh' ? '行业' : 'Industry'}</span>
            <select name="industry" defaultValue="finance">
              <option value="finance">{lang === 'zh' ? '金融 / 投资' : 'Finance / investing'}</option>
              <option value="ai-builder">{lang === 'zh' ? 'AI 产品 / 工程' : 'AI product / engineering'}</option>
              <option value="founder">{lang === 'zh' ? '创业 / 商业' : 'Startup / business'}</option>
            </select>
          </label>
          <label><input name="goal" type="checkbox" value="daily-brief" defaultChecked /> {lang === 'zh' ? '每天快速了解重要变化' : 'Catch important changes daily'}</label>
          <label><input name="goal" type="checkbox" value="work-insight" defaultChecked /> {lang === 'zh' ? '为工作判断提供洞察' : 'Support work decisions'}</label>
          <label><input name="topic" type="checkbox" value="ai" defaultChecked /> AI</label>
          <label><input name="topic" type="checkbox" value="finance" defaultChecked /> {lang === 'zh' ? '金融 / 宏观' : 'Finance / macro'}</label>
          <div className="admin-actions">
            <button className="nav-button" type="submit">{lang === 'zh' ? '生成推荐频道' : 'Recommend channels'}</button>
            <button className="table-link" name="skip" type="submit" value="1">{lang === 'zh' ? '跳过' : 'Skip'}</button>
          </div>
        </form>
      </section>
    </main>
  )
}

function RadioPanel({ episode, lang }: { episode: Awaited<ReturnType<typeof loadRadioEpisode>>; lang: Lang }) {
  return (
    <section className="panel reader-radio-panel">
      <div className="panel__header">
        <div>
          <h2>{lang === 'zh' ? '每日总电台' : 'Daily radio'}</h2>
          <p>{lang === 'zh' ? '把今天的输入转成一集可收听简报。' : 'Turn today’s inputs into a listenable brief.'}</p>
        </div>
        <form action="/api/radio/episodes" method="post">
          <button className="nav-button" type="submit">
            {episode ? (lang === 'zh' ? '重新生成' : 'Regenerate') : (lang === 'zh' ? '生成电台' : 'Generate radio')}
          </button>
        </form>
      </div>
      {episode?.status === 'ready' && episode.r2Key ? (
        <audio controls src={`/api/radio/episodes/${encodeURIComponent(episode.id)}/audio`} />
      ) : episode ? (
        <p className="source-intake__notice">
          {lang === 'zh' ? '电台状态' : 'Radio status'}: {episode.status} · {episode.creditsEstimated} credits
        </p>
      ) : (
        <p>{lang === 'zh' ? '生成前会按 MiniMax 模型成本预估 credits。' : 'Credits are estimated from MiniMax model cost before generation.'}</p>
      )}
    </section>
  )
}

async function shouldShowOnboarding(): Promise<boolean> {
  const session = await getCurrentAuthSession().catch(() => null)
  if (!session) return false
  const db = await getD1Binding().catch(() => null)
  if (!db) return false
  const workspace = await getDefaultWorkspaceForUser(db, session.userId, session.username)
  const sourceCount = await getWorkspaceSourceCount(db, workspace.id)
  if (sourceCount > 0) return false
  const profile = await db.prepare('SELECT user_id AS userId FROM user_interest_profiles WHERE user_id = ? LIMIT 1').bind(session.userId).first<{ userId: string }>()
  return !profile
}

async function loadTodayRadio(date: string | null): Promise<Awaited<ReturnType<typeof loadRadioEpisode>>> {
  if (!date) return null
  const session = await getCurrentAuthSession().catch(() => null)
  if (!session) return null
  const db = await getD1Binding().catch(() => null)
  if (!db) return null
  const workspace = await getDefaultWorkspaceForUser(db, session.userId, session.username)
  return loadRadioEpisode(db, workspace.id, date)
}

async function loadCurrentWorkspaceId(): Promise<string | null> {
  const session = await getCurrentAuthSession().catch(() => null)
  if (!session) return null
  const db = await getD1Binding().catch(() => null)
  if (!db) return null
  const workspace = await getDefaultWorkspaceForUser(db, session.userId, session.username)
  return workspace.id
}

export async function HomePage({
  account = null,
  category = null,
  lang,
  page = 1,
  subscribed = false,
}: {
  account?: string | null
  category?: string | null
  lang: Lang
  page?: number
  subscribed?: boolean
}) {
  if (category === 'twitter') {
    return (
      <div className="page-shell reader-shell">
        <Header active="home" activeCategory={category} lang={lang} showSourceFilter />
        <XReaderPage account={account} lang={lang} subscribed={subscribed} />
        <Footer lang={lang} />
      </div>
    )
  }

  const workspaceId = await loadCurrentWorkspaceId()
  const data = await getHomePageData(lang, page, category, workspaceId)
  const hasDigest = Boolean(data.observationText || data.keyStories.length > 0)
  const showOnboarding = !category && await shouldShowOnboarding()
  const radioEpisode = !category && hasDigest ? await loadTodayRadio(data.date) : null

  return (
    <div className="page-shell reader-shell">
      <Header
        lang={lang}
        active="home"
        date={data.date}
        itemCount={data.totalItems}
        sourceCount={data.sourceCount}
        activeCategory={data.activeCategory}
        categories={data.categories}
        showSourceFilter
      />

      {showOnboarding ? (
        <OnboardingPrompt lang={lang} />
      ) : !data.activeCategory ? (
        hasDigest ? (
          <main className="container reader-brief-desk" aria-label={t(lang, 'home.briefTitle')}>
            <RadioPanel episode={radioEpisode} lang={lang} />
            <DailyObservations lang={lang} observationText={data.observationText} />
            <KeyStories lang={lang} stories={data.keyStories} />
          </main>
        ) : (
          <DigestPending lang={lang} />
        )
      ) : (
        <ItemsPanel data={data} lang={lang} title={t(lang, 'allItems.title')} />
      )}

      <Footer lang={lang} />
    </div>
  )
}
