'use client'

import { useState } from 'react'

type InlineYouTubePlayerProps = {
  className?: string
  thumbnailUrl: string
  title: string
  url: string
}

function youtubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.hostname.includes('youtu.be')) return parsed.pathname.replace('/', '') || null
    if (parsed.hostname.includes('youtube.com')) return parsed.searchParams.get('v')
  } catch {
    return null
  }
  return null
}

export function InlineYouTubePlayer({ className, thumbnailUrl, title, url }: InlineYouTubePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const videoId = youtubeVideoId(url)
  const embedUrl = videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0` : null

  if (isPlaying && embedUrl) {
    return (
      <div className={className}>
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          src={embedUrl}
          title={title}
        />
      </div>
    )
  }

  return (
    <button aria-label={`播放 ${title}`} className={className} onClick={() => setIsPlaying(true)} type="button">
      <img alt="" src={thumbnailUrl} />
      <span aria-hidden="true">▶</span>
    </button>
  )
}
