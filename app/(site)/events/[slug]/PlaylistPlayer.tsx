'use client'

import { useMemo, useState } from 'react'

type PlaylistVideo = {
  url: string
  label?: string
}

type Props = {
  playlistEmbed: string
  videos: PlaylistVideo[]
  playlistId: string
  thumbnailUrl?: string
}

function getVideoEmbedUrl(urlString: string, playlistId: string) {
  const input = urlString.trim()
  if (!input) return ''

  try {
    const url = new URL(input)
    let videoId = url.searchParams.get('v') ?? ''

    if (url.hostname.includes('youtu.be')) {
      videoId = url.pathname.split('/').filter(Boolean)[0] ?? ''
    }

    if (url.pathname.startsWith('/embed/')) {
      videoId = url.pathname.split('/').filter(Boolean)[1] ?? videoId
    }

    if (!videoId) return ''

    const embed = new URL(`https://www.youtube.com/embed/${encodeURIComponent(videoId)}`)
    if (playlistId) embed.searchParams.set('list', playlistId)
    return embed.toString()
  } catch {
    return ''
  }
}

export default function PlaylistPlayer({ playlistEmbed, videos, playlistId, thumbnailUrl }: Props) {
  const playableVideos = useMemo(() => (
    videos
      .map((video, index) => ({
        ...video,
        title: video.label?.trim() || `Video ${index + 1}`,
        embed: getVideoEmbedUrl(video.url, playlistId),
      }))
      .filter(video => video.embed)
  ), [playlistId, videos])

  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const activeVideo = activeIndex == null ? null : playableVideos[activeIndex]
  const activeSrc = activeVideo?.embed || playlistEmbed
  const activeTitle = activeVideo?.title || 'Full playlist'
  const playlistUrl = playlistId ? `https://www.youtube.com/playlist?list=${playlistId}` : ''

  if (!activeSrc && !(thumbnailUrl && playlistUrl)) return null

  return (
    <div className='mt-10'>
      <p className='archive-label text-[0.58rem] mb-3'>Full playlist</p>
      <div className='aspect-video bg-near-black overflow-hidden rounded-[3px]' style={{ position: 'relative' }}>
        {thumbnailUrl && playlistUrl ? (
          <a
            href={playlistUrl}
            target='_blank'
            rel='noopener noreferrer'
            aria-label='Watch full playlist on YouTube'
          >
            <img src={thumbnailUrl} alt={activeTitle} className='w-full h-full object-cover' />
            <span
              aria-hidden='true'
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '64px',
                height: '64px',
                borderRadius: '9999px',
                background: 'rgba(0, 0, 0, 0.55)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                lineHeight: 1,
              }}
            >
              ▶
            </span>
          </a>
        ) : (
          <iframe
            src={activeSrc}
            title={activeTitle}
            className='w-full h-full'
            allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
            allowFullScreen
          />
        )}
      </div>

      {playlistUrl ? (
        <a
          href={playlistUrl}
          target='_blank'
          rel='noopener noreferrer'
          style={{
            display: 'inline-block',
            marginTop: '12px',
            fontSize: '1rem',
            fontWeight: 600,
            color: '#1A9E9E',
            textDecoration: 'underline',
            textDecorationColor: '#1A9E9E',
          }}
        >
          Watch full playlist on YouTube →
        </a>
      ) : null}

      {playableVideos.length > 0 ? (
        <div className='mt-6 border-t border-pale-stone'>
          {playableVideos.map((video, index) => {
            const isActive = index === activeIndex
            return (
              <button
                key={video.url + '-' + index}
                type='button'
                onClick={() => setActiveIndex(index)}
                className='w-full grid grid-cols-[3rem_1fr_2rem] items-center gap-4 py-4 text-left border-b border-pale-stone transition-colors'
                style={{
                  borderLeft: isActive ? '3px solid #1A9E9E' : '3px solid transparent',
                  color: isActive ? '#1A9E9E' : '#1f1b18',
                  background: 'transparent',
                  paddingLeft: isActive ? '13px' : '16px',
                }}
              >
                <span className='font-mono text-xs'>{String(index + 1).padStart(2, '0')}</span>
                <span className='font-display text-xl leading-none'>{video.title}</span>
                <span className='font-mono text-right' aria-hidden='true'>▶</span>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
