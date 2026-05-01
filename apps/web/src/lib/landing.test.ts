import { describe, expect, it } from 'vitest'

import { landingContact, landingCtas, landingNav, landingSteps, pricingPlans, scrollChapters } from './landing'

describe('landing content', () => {
  it('routes primary and sample actions to the expected public paths', () => {
    expect(landingCtas.primary.href).toBe('/login?next=/today')
    expect(landingCtas.primary.label).toBe('Start tuning')
    expect(landingCtas.secondary.href).toBe('#sample-brief')
  })

  it('keeps the signal-station hero copy aligned with the approved concept', () => {
    expect(landingCtas.secondary.label).toBe('Hear a sample brief')
    expect(scrollChapters[0].pageTitle).toBe('Private signal station')
    expect(scrollChapters[0].pageNote).toBe('Tuned. Personal. Yours.')
    expect(landingNav.map((item) => item.label)).toEqual(['Private signal station', 'How it works', 'Pricing'])
  })

  it('keeps the product story in tune, filter, brief order', () => {
    expect(landingSteps.map((step) => step.title)).toEqual([
      'Tune your channels.',
      'Filter the noise.',
      'Receive the brief.',
    ])
  })

  it('links pricing navigation to a real pricing section', () => {
    expect(landingNav.find((item) => item.label === 'Pricing')?.href).toBe('#pricing')
  })

  it('defines scroll chapters that can present three workspace states', () => {
    expect(scrollChapters.map((chapter) => chapter.state)).toEqual(['tune', 'scan', 'brief'])
    expect(scrollChapters[0].marks).toContain('92.4 X')
  })

  it('uses the four public product plans and hides the payment test plan', () => {
    expect(pricingPlans.map((plan) => [plan.name, plan.price])).toEqual([
      ['Free', '$0'],
      ['Pro', '$12'],
      ['Power', '$29'],
      ['Team', '$99'],
    ])
  })

  it('exposes a product contact for feedback and daily brief interest', () => {
    expect(landingContact.email).toMatch(/@/)
    expect(landingContact.feedbackSubject).toContain('Feedback')
    expect(landingContact.digestSubject).toContain('daily brief')
    expect(landingContact.interests).toContain('Daily brief trial')
  })
})
