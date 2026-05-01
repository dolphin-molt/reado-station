'use client'

import type { MouseEvent, ReactNode } from 'react'

type ExternalBlankLinkProps = {
  ariaLabel?: string
  children: ReactNode
  className?: string
  href: string
}

export function ExternalBlankLink({ ariaLabel, children, className, href }: ExternalBlankLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

    event.preventDefault()
    const opened = window.open(href, '_blank', 'noopener,noreferrer')
    if (!opened) {
      window.location.assign(href)
    }
  }

  return (
    <a aria-label={ariaLabel} className={className} href={href} onClick={handleClick} rel="noreferrer" target="_blank">
      {children}
    </a>
  )
}
