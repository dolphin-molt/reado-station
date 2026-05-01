'use client'

import { useCallback, useEffect, useState } from 'react'

import type { Lang } from '@/lib/i18n'

interface MarketSectionTab {
  count: Record<Lang, string>
  id: string
  title: Record<Lang, string>
}

interface MarketSectionSnapshot {
  bottom: number
  id: string
  top: number
}

export function selectActiveMarketSection(sections: MarketSectionSnapshot[], threshold: number) {
  if (sections.length === 0) {
    return null
  }

  const currentSection = sections.find((section) => section.top <= threshold && section.bottom > threshold)
  if (currentSection) {
    return currentSection.id
  }

  for (let index = sections.length - 1; index >= 0; index -= 1) {
    if (sections[index].top <= threshold) {
      return sections[index].id
    }
  }

  return sections[0].id
}

function getStickyThreshold() {
  const tabs = document.querySelector('.channel-directory__section-tabs')
  if (tabs instanceof HTMLElement) {
    return tabs.getBoundingClientRect().bottom + 16
  }

  return Math.min(140, window.innerHeight * 0.3)
}

function getHashSectionId(sections: MarketSectionTab[]) {
  const hashId = decodeURIComponent(window.location.hash.replace(/^#/, ''))
  return sections.some((section) => section.id === hashId) ? hashId : null
}

export function ChannelMarketTabs({ lang, sections }: { lang: Lang; sections: MarketSectionTab[] }) {
  const [activeId, setActiveId] = useState(() => sections[0]?.id ?? '')

  const updateActiveSection = useCallback(() => {
    const snapshots = sections
      .map((section) => {
        const element = document.getElementById(section.id)
        if (!element) {
          return null
        }

        const rect = element.getBoundingClientRect()
        return {
          bottom: rect.bottom,
          id: section.id,
          top: rect.top,
        }
      })
      .filter((section): section is MarketSectionSnapshot => section !== null)

    const nextActiveId = selectActiveMarketSection(snapshots, getStickyThreshold())
    if (nextActiveId) {
      setActiveId(nextActiveId)
    }
  }, [sections])

  useEffect(() => {
    const hashSectionId = getHashSectionId(sections)
    if (hashSectionId) {
      setActiveId(hashSectionId)
    } else {
      updateActiveSection()
    }

    let frame = 0
    const scheduleUpdate = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(updateActiveSection)
    }
    const syncHashSection = () => {
      const hashSectionId = getHashSectionId(sections)
      if (hashSectionId) {
        setActiveId(hashSectionId)
      }
      scheduleUpdate()
    }

    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)
    window.addEventListener('hashchange', syncHashSection)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      window.removeEventListener('hashchange', syncHashSection)
    }
  }, [sections, updateActiveSection])

  return (
    <nav aria-label={lang === 'zh' ? '来源类型' : 'Source types'} className="channel-directory__section-tabs">
      {sections.map((section) => {
        const isActive = section.id === activeId

        return (
          <a
            aria-current={isActive ? 'location' : undefined}
            data-active={isActive ? 'true' : undefined}
            href={`#${section.id}`}
            key={section.id}
            onClick={() => setActiveId(section.id)}
          >
            <span>{section.title[lang]}</span>
            <small>{section.count[lang]}</small>
          </a>
        )
      })}
    </nav>
  )
}
