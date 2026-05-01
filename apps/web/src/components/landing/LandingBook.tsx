import Link from 'next/link'
import type { CSSProperties } from 'react'

import { landingCtas, sampleBrief, scrollChapters } from '@/lib/landing'

export function LandingBook() {
  const [tune, scan, brief] = scrollChapters

  return (
    <section className="landing-scroll-story" id="product">
      <section className="landing-scroll-frame landing-scroll-frame--hero" data-state={tune.state}>
        <div className="landing-product-sticky">
          <div className="landing-canvas landing-canvas--hero" aria-label="reado product introduction">
            <div className="landing-canvas__index" aria-hidden="true">
              <span className="is-active">01</span>
              <span>02</span>
              <span>03</span>
            </div>
            <div className="landing-hero-block">
              <h1>
                <span>Read Less.</span>
                <span>Know More<i>.</i></span>
              </h1>
              <p className="landing-hero__copy">
                Subscribe to the signals that matter.
                <br />
                Get a concise daily brief, tuned just for you.
              </p>
              <div className="landing-actions">
                <Link className="landing-button landing-button--primary" href={landingCtas.primary.href}>
                  {landingCtas.primary.label}
                  <span aria-hidden="true">⌁</span>
                </Link>
              </div>
            </div>
            <div className="landing-tuner" aria-hidden="true">
              <div className="landing-brief-note">
                <strong>Today&apos;s brief</strong>
                <span>Technology</span>
                <span>AI</span>
                <span>Startups</span>
                <span>Markets</span>
              </div>
              <div className="landing-mini-note">
                {tune.pageNote}
              </div>
              <div className="landing-hand-note">Your private signal station</div>
            </div>
            <div className="landing-scanline" aria-hidden="true" />
          </div>
        </div>
      </section>

      <section className="landing-scroll-frame" data-state={scan.state} id="sources">
        <div className="landing-product-sticky">
          <div className="landing-canvas landing-canvas--sources" aria-label="Source intake preview">
            <div className="landing-canvas__index" aria-hidden="true">
              <span>01</span>
              <span className="is-active">02</span>
              <span>03</span>
            </div>
            <div className="landing-stage-copy">
              <span>{tune.index} /</span>
              <h2>{tune.title}</h2>
              <p>{tune.body}</p>
            </div>
            <div className="source-river source-river--frequency">
              {tune.marks.map((source, index) => (
                <div className="source-river__line" style={{ '--line-index': index } as CSSProperties} key={source}>
                  <strong>{source}</strong>
                  <span>{sampleBrief.sections[0].items[index % sampleBrief.sections[0].items.length]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="landing-scroll-frame" data-state={brief.state} id="sample-brief">
        <div className="landing-product-sticky">
          <div className="landing-canvas landing-canvas--read" aria-label="Signal reading preview">
            <div className="landing-canvas__index" aria-hidden="true">
              <span>01</span>
              <span>02</span>
              <span className="is-active">03</span>
            </div>
            <div className="landing-stage-copy">
              <span>{brief.index} /</span>
              <h2>{brief.title}</h2>
              <p>{brief.body}</p>
            </div>
            <article className="reading-sheet reading-sheet--transmission">
              <div className="reading-sheet__meta">
                <span>{brief.pageTitle}</span>
                <span>{sampleBrief.readTime}</span>
              </div>
              <h2>{sampleBrief.sections[0].items[0]}</h2>
              <p>{sampleBrief.sections[1].items.join(' ')}</p>
              <ul>
                {sampleBrief.sections[2].items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </section>
    </section>
  )
}
