import Link from 'next/link'

import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { readerHomePath, type Lang } from '@/lib/i18n'

type PlanId = 'free' | 'pro' | 'power' | 'team'

interface SubscriptionPlan {
  id: PlanId
  name: string
  price: string
  cadence: string
  description: string
  features: string[]
  signal: string
  quota: string
  cta: string
  highlighted?: boolean
}

interface SubscriptionCopy {
  kicker: string
  title: string
  subtitle: string
  plans: SubscriptionPlan[]
  manageBilling: string
  backHome: string
  checkoutMessages: Record<string, string>
  portalMessages: Record<string, string>
  billingErrors: Record<string, string>
}

const copy: Record<Lang, SubscriptionCopy> = {
  zh: {
    kicker: 'READO PLAN DIAL',
    title: '把每日阅读调到合适档位',
    subtitle: '不同套餐只决定可接入的信息源、回溯窗口和团队协作能力。内容仍然围绕你的每日简报。',
    plans: [
      {
        id: 'free',
        name: 'Free',
        price: '$0',
        cadence: 'starter',
        description: '先把少量频道调进来，确认每日简报是否适合你的阅读节奏。',
        features: ['3 个信息源', '24 小时回溯', 'X / RSS 订阅', '基础阅读体验'],
        signal: '92.4',
        quota: '3 sources',
        cta: '当前档位',
      },
      {
        id: 'pro',
        name: 'Pro',
        price: '$12',
        cadence: '/ 月',
        description: '适合每天跟进 AI、产品和技术信息的人，把固定来源变成短日报。',
        features: ['20 个信息源', '7 天回溯', '共享源订阅', '账单中心管理'],
        signal: '101.7',
        quota: '20 sources',
        cta: '升级 Pro',
        highlighted: true,
      },
      {
        id: 'power',
        name: 'Power',
        price: '$29',
        cadence: '/ 月',
        description: '给重度信息消费、研究和创作使用，保留更宽的回溯和源池。',
        features: ['100 个信息源', '30 天回溯', '高级筛选和主题追踪', '适合高频回溯'],
        signal: '1200',
        quota: '100 sources',
        cta: '升级 Power',
      },
      {
        id: 'team',
        name: 'Team',
        price: '$99',
        cadence: '/ 月起',
        description: '团队一起维护信号源，把每日变化沉淀到共享阅读节奏里。',
        features: ['5 seats 起', '团队共享源池', '100 个信息源', '30 天回溯'],
        signal: '1600',
        quota: 'team pool',
        cta: '升级 Team',
      },
    ],
    manageBilling: '账单中心',
    backHome: '回到今日简报',
    checkoutMessages: {
      success: 'Stripe 已返回成功页。订阅是否生效和 credits 是否发放，以后台支付日志和 Stripe webhook 为准。',
      cancelled: '你取消了本次支付，没有创建新订阅。',
    },
    portalMessages: {
      return: '已从 Stripe Customer Portal 返回订阅页。',
    },
    billingErrors: {
      d1: '订阅管理暂不可用：当前环境没有 D1 数据库绑定。',
      'stripe-config': '订阅创建失败。请到 /admin/billing 查看日志，确认 price、Stripe 密钥、Product/Price 模式和 webhook。',
    },
  },
  en: {
    kicker: 'READO PLAN DIAL',
    title: 'Tune your reading capacity',
    subtitle: 'Plans only change source capacity, backfill range, and collaboration. The product still revolves around your daily brief.',
    plans: [
      {
        id: 'free',
        name: 'Free',
        price: '$0',
        cadence: 'starter',
        description: 'Bring in a few channels first and see whether the daily brief fits your rhythm.',
        features: ['3 sources', '24h backfill', 'X / RSS subscriptions', 'Basic reading experience'],
        signal: '92.4',
        quota: '3 sources',
        cta: 'Current plan',
      },
      {
        id: 'pro',
        name: 'Pro',
        price: '$12',
        cadence: '/ month',
        description: 'For people who track AI, product, and technical signals every day.',
        features: ['20 sources', '7d backfill', 'Shared source subscriptions', 'Billing portal management'],
        signal: '101.7',
        quota: '20 sources',
        cta: 'Upgrade Pro',
        highlighted: true,
      },
      {
        id: 'power',
        name: 'Power',
        price: '$29',
        cadence: '/ month',
        description: 'For heavy readers, researchers, and creators who need a wider source pool.',
        features: ['100 sources', '30d backfill', 'Advanced filters and topic tracking', 'Built for frequent backfills'],
        signal: '1200',
        quota: '100 sources',
        cta: 'Upgrade Power',
      },
      {
        id: 'team',
        name: 'Team',
        price: '$99',
        cadence: '/ month+',
        description: 'For teams maintaining shared signals and a common reading rhythm.',
        features: ['Starts with 5 seats', 'Team shared source pool', '100 sources', '30d backfill'],
        signal: '1600',
        quota: 'team pool',
        cta: 'Upgrade Team',
      },
    ],
    manageBilling: 'Manage billing',
    backHome: 'Back home',
    checkoutMessages: {
      success: 'Stripe returned to the success page. Confirm final subscription state and credit grants in /admin/billing and Stripe webhooks.',
      cancelled: 'You cancelled the checkout, so no new subscription was created.',
    },
    portalMessages: {
      return: 'Returned from the Stripe Customer Portal.',
    },
    billingErrors: {
      d1: 'Billing is unavailable because this environment has no D1 binding.',
      'stripe-config': 'Checkout failed. Inspect /admin/billing for the exact failure and verify the Stripe price, secret key, product mode, and webhook.',
    },
  },
}

export async function SubscriptionPage({
  billingError = '',
  checkout = '',
  lang,
  portal = '',
  trace = '',
}: {
  billingError?: string
  checkout?: string
  lang: Lang
  portal?: string
  trace?: string
}) {
  const text = copy[lang]
  const billingErrorMessage = billingError ? text.billingErrors[billingError] : ''
  const checkoutMessage = checkout ? text.checkoutMessages[checkout] : ''
  const portalMessage = portal ? text.portalMessages[portal] : ''
  const hasStatus = Boolean(checkoutMessage || portalMessage || billingErrorMessage || trace)

  return (
    <div className="page-shell reader-shell">
      <Header lang={lang} active="subscription" path="subscription" />

      <main className="container subscription-station">
        <section className="subscription-station__hero">
          <div className="subscription-station__copy">
            <span>{text.kicker}</span>
            <h1>{text.title}</h1>
            <p>{text.subtitle}</p>
            <div className="subscription-station__actions">
              <form action="/api/billing/portal" method="post">
                <button className="subscription-station__ghost" type="submit">
                  {text.manageBilling}
                </button>
              </form>
            </div>
          </div>
          <div className="subscription-station__console" aria-hidden="true">
            <div className="subscription-station__dial">
              <span />
            </div>
            <div className="subscription-station__readout">
              <strong>4</strong>
              <small>{lang === 'zh' ? 'PLAN LEVELS' : 'PLAN LEVELS'}</small>
            </div>
            <div className="subscription-station__bars">
              <i />
              <i />
              <i />
            </div>
          </div>
        </section>

        {hasStatus && (
          <section className="subscription-status" aria-live="polite">
            {checkoutMessage && <p className="auth-message">{checkoutMessage}</p>}
            {portalMessage && <p className="auth-message">{portalMessage}</p>}
            {billingErrorMessage && <p className="auth-message auth-message--error">{billingErrorMessage}</p>}
            {trace && (
              <p>
                Trace: <code>{trace}</code>
              </p>
            )}
          </section>
        )}

        <section className="subscription-station__plans" aria-label={lang === 'zh' ? '套餐' : 'Plans'}>
          {text.plans.map((plan) => (
            <article className="subscription-plan-card" data-highlighted={plan.highlighted ?? false} key={plan.id}>
              <div className="subscription-plan-card__signal">{plan.signal}</div>
              <div className="subscription-plan-card__head">
                <div>
                  <h2>{plan.name}</h2>
                  <small>{plan.quota}</small>
                </div>
                {plan.highlighted && <em>{lang === 'zh' ? '推荐档位' : 'Recommended'}</em>}
              </div>
              <p>{plan.description}</p>
              <div className="subscription-plan-card__price">
                <strong>{plan.price}</strong>
                <span>{plan.cadence}</span>
              </div>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              {plan.id === 'free' ? (
                <button className="subscription-plan-card__button" disabled type="button">
                  {plan.cta}
                </button>
              ) : (
                <form action="/api/billing/checkout" method="post">
                  <input name="plan" type="hidden" value={plan.id} />
                  <button className="subscription-plan-card__button" type="submit">
                    {plan.cta}
                  </button>
                </form>
              )}
            </article>
          ))}
        </section>

        <div className="subscription-station__footer">
          <Link href={readerHomePath(lang)}>
            {text.backHome}
          </Link>
        </div>
      </main>

      <Footer lang={lang} />
    </div>
  )
}
