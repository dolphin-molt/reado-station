import Link from 'next/link'

import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { localizedPath, type Lang } from '@/lib/i18n'

type PlanId = 'free' | 'test' | 'pro' | 'power' | 'team'

interface SubscriptionPlan {
  id: PlanId
  name: string
  price: string
  cadence: string
  description: string
  features: string[]
  cta: string
  highlighted?: boolean
}

interface SubscriptionCopy {
  eyebrow: string
  title: string
  subtitle: string
  plans: SubscriptionPlan[]
  manageBilling: string
  addSource: string
  backHome: string
  checkoutMessages: Record<string, string>
  portalMessages: Record<string, string>
  billingErrors: Record<string, string>
}

const copy: Record<Lang, SubscriptionCopy> = {
  zh: {
    eyebrow: 'Billing',
    title: '订阅',
    subtitle: '选择信息源数量和历史回溯范围。',
    plans: [
      {
        id: 'free',
        name: 'Free',
        price: '$0',
        cadence: '入门体验',
        description: '体验公共信息流和基础阅读。',
        features: ['3 个信息源', '24h 回溯', 'X/RSS 订阅', '基础阅读体验'],
        cta: '当前可用',
      },
      {
        id: 'test',
        name: 'Test',
        price: '$0.01',
        cadence: '/ 月',
        description: '验证支付链路。',
        features: ['测试支付链路', '测试 webhook', '不影响正式定价'],
        cta: '测试支付',
      },
      {
        id: 'pro',
        name: 'Pro',
        price: '$12',
        cadence: '/ 月',
        description: '每天跟进 AI、产品和技术信息。',
        features: ['20 个信息源', '7 天回溯', '共享源订阅', 'Customer Portal 管理订阅'],
        cta: '升级 Pro',
        highlighted: true,
      },
      {
        id: 'power',
        name: 'Power',
        price: '$29',
        cadence: '/ 月',
        description: '重度信息消费、研究和创作。',
        features: ['100 个信息源', '30 天回溯', '高级筛选和主题追踪', '适合高频回溯'],
        cta: '升级 Power',
      },
      {
        id: 'team',
        name: 'Team',
        price: '$99',
        cadence: '/ 月起',
        description: '团队共同维护信息源和知识库。',
        features: ['5 seats 起', '团队共享源池', '100 个信息源', '30 天回溯'],
        cta: '升级 Team',
      },
    ],
    manageBilling: '管理账单',
    addSource: '添加信息源',
    backHome: '返回首页',
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
    eyebrow: 'Billing',
    title: 'Subscription',
    subtitle: 'Choose source capacity and history range.',
    plans: [
      {
        id: 'free',
        name: 'Free',
        price: '$0',
        cadence: 'starter',
        description: 'Try the public feed and basic reading.',
        features: ['3 sources', '24h backfill', 'X/RSS subscriptions', 'Basic reading experience'],
        cta: 'Available now',
      },
      {
        id: 'test',
        name: 'Test',
        price: '$0.01',
        cadence: '/ month',
        description: 'Validate the payment flow.',
        features: ['Test checkout flow', 'Test webhooks', 'Does not affect pricing'],
        cta: 'Test payment',
      },
      {
        id: 'pro',
        name: 'Pro',
        price: '$12',
        cadence: '/ month',
        description: 'Follow AI, product, and technical signals daily.',
        features: ['20 sources', '7d backfill', 'Shared source subscriptions', 'Customer Portal billing'],
        cta: 'Upgrade Pro',
        highlighted: true,
      },
      {
        id: 'power',
        name: 'Power',
        price: '$29',
        cadence: '/ month',
        description: 'For heavy readers, researchers, and creators.',
        features: ['100 sources', '30d backfill', 'Advanced filters and topic tracking', 'Built for frequent backfills'],
        cta: 'Upgrade Power',
      },
      {
        id: 'team',
        name: 'Team',
        price: '$99',
        cadence: '/ month+',
        description: 'For teams maintaining shared sources and knowledge.',
        features: ['Starts with 5 seats', 'Team shared source pool', '100 sources', '30d backfill'],
        cta: 'Upgrade Team',
      },
    ],
    manageBilling: 'Manage billing',
    addSource: 'Add source',
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

  return (
    <div className="page-shell">
      <Header lang={lang} active="subscription" path="subscription" />

      <main className="container section-stack subscription-page">
        <section className="subscription-header">
          <div>
            <span>{text.eyebrow}</span>
            <h1>{text.title}</h1>
            <p>{text.subtitle}</p>
          </div>
          <div className="subscription-actions subscription-actions--header">
            <form action="/api/billing/portal" method="post">
              <button className="secondary-button" type="submit">
                {text.manageBilling}
              </button>
            </form>
            <Link className="cta-button" href={localizedPath(lang, 'sources/new')}>
              {text.addSource}
            </Link>
          </div>
          {checkoutMessage && <p className="auth-message">{checkoutMessage}</p>}
          {portalMessage && <p className="auth-message">{portalMessage}</p>}
          {billingErrorMessage && <p className="auth-message auth-message--error">{billingErrorMessage}</p>}
          {trace && <p className="auth-card__intro">Trace: <code>{trace}</code></p>}
        </section>

        <section className="subscription-plans" aria-label={lang === 'zh' ? '套餐' : 'Plans'}>
          {text.plans.map((plan) => (
            <article className="subscription-plan" data-highlighted={plan.highlighted ?? false} key={plan.id}>
              <div className="subscription-plan__head">
                <h2>{plan.name}</h2>
                <p>{plan.description}</p>
              </div>
              <div className="subscription-plan__price">
                <strong>{plan.price}</strong>
                <span>{plan.cadence}</span>
              </div>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              {plan.id === 'free' ? (
                <button className="subscription-plan__button" disabled type="button">
                  {plan.cta}
                </button>
              ) : (
                <form action="/api/billing/checkout" method="post">
                  <input name="plan" type="hidden" value={plan.id} />
                  <button className="subscription-plan__button" type="submit">
                    {plan.cta}
                  </button>
                </form>
              )}
            </article>
          ))}
        </section>

        <div className="subscription-actions">
          <Link className="table-link" href={localizedPath(lang)}>
            {text.backHome}
          </Link>
        </div>
      </main>

      <Footer lang={lang} />
    </div>
  )
}
