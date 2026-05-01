import type { Metadata } from 'next'
import Link from 'next/link'

import { LandingBook } from '@/components/landing/LandingBook'
import { landingContact, landingCtas, landingNav, pricingPlans } from '@/lib/landing'

export const metadata: Metadata = {
  title: 'reado - Read all. Miss nothing.',
  description: 'A personal AI reading desk that turns scattered sources into a focused daily brief.',
}

export default function LandingPage() {
  return (
    <main className="landing-page">
      <nav className="landing-nav" aria-label="Landing navigation">
        <Link className="landing-logo" href="/">
          <span>reado</span>
          <i />
        </Link>
        <div className="landing-nav__links">
          {landingNav.map((item) => (
            <a href={item.href} key={item.href}>
              {item.label}
            </a>
          ))}
        </div>
        <div className="landing-nav__actions">
          <Link className="landing-nav__signin" href="/login?next=/today">
            Sign in
          </Link>
        </div>
      </nav>

      <LandingBook />

      <section className="landing-pricing" id="pricing">
        <div className="landing-pricing__header">
          <h2>Pricing for a signal habit.</h2>
          <p>Start with a few channels, then widen the dial as your daily brief becomes part of how you track the world.</p>
        </div>
        <div className="landing-pricing__plans">
          {pricingPlans.map((plan) => (
            <article className="landing-plan" data-highlighted={plan.highlighted ?? false} key={plan.name}>
              <div className="landing-plan__head">
                <span>{plan.name}</span>
                {plan.highlighted && <em>Most useful</em>}
              </div>
              <div className="landing-plan__price">
                <strong>{plan.price}</strong>
                <small>{plan.cadence}</small>
              </div>
              <p>{plan.note}</p>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <Link href={landingCtas.primary.href}>{plan.cta}</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-closing" id="apply">
        <div className="landing-closing__copy">
          <h2>Leave a signal.</h2>
          <p>
            If you have suggestions, want to follow the product, or prefer a very short daily brief first, write to {landingContact.name}. We can send a compact
            edition before you decide whether reado should tune more channels for you.
          </p>
        </div>
        <form
          action={`mailto:${landingContact.email}?subject=${encodeURIComponent(landingContact.digestSubject)}`}
          className="landing-contact-form"
          encType="text/plain"
          method="post"
        >
          <label className="landing-contact-form__email">
            <span>Your email</span>
            <input autoComplete="email" name="email" placeholder="you@example.com" required type="email" />
          </label>
          <label className="landing-contact-form__interest">
            <span>What are you interested in?</span>
            <select defaultValue={landingContact.interests[0]} name="interest">
              {landingContact.interests.map((interest) => (
                <option key={interest} value={interest}>
                  {interest}
                </option>
              ))}
            </select>
          </label>
          <label className="landing-contact-form__message">
            <span>Anything we should know?</span>
            <textarea name="message" placeholder="Tell us what sources you care about, or leave a suggestion." rows={4} />
          </label>
          <div className="landing-contact-form__actions">
            <button type="submit">Send interest</button>
            <Link href="/login?next=/today">Sign in instead</Link>
          </div>
          <p>Submits through your email client to {landingContact.email}.</p>
        </form>
      </section>
    </main>
  )
}
