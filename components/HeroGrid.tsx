'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getHeroImages } from '@/lib/getHeroImages'

interface HeroGridProps {
  images: string[]
  fallback: string[]
}

function normalizePool(images: string[], fallback: string[]) {
  const pool = images.length > 0 ? images : fallback
  return pool.filter(Boolean)
}

function pick3(pool: string[], exclude: string[], fallback: string[]): string[] {
  if (pool.length < 3) return fallback
  const available = pool.filter(src => !exclude.includes(src))
  const source = available.length >= 3 ? available : pool
  const shuffled = [...source].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 3)
}

export default function HeroGrid({ images, fallback }: HeroGridProps) {
  const [loadedImages, setLoadedImages] = useState<string[]>(images)
  const pool = useMemo(() => normalizePool(loadedImages, fallback), [loadedImages, fallback])
  const [current, setCurrent] = useState<string[]>(fallback)
  const [pending, setPending] = useState<string[]>(fallback)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    let mounted = true

    getHeroImages()
      .then(nextImages => {
        if (mounted) setLoadedImages(nextImages)
      })
      .catch(() => {
        if (mounted) setLoadedImages(fallback)
      })

    return () => {
      mounted = false
    }
  }, [fallback])

  useEffect(() => {
    const initial = pool.length >= 3 ? pick3(pool, [], fallback) : fallback
    setCurrent(initial)
    setPending(initial)
  }, [pool, fallback])

  const rotate = useCallback(() => {
    const next = pick3(pool, current, fallback)
    setPending(next)
    setFading(true)
    window.setTimeout(() => {
      setCurrent(next)
      setFading(false)
    }, 650)
  }, [current, pool, fallback])

  useEffect(() => {
    if (pool.length < 3) return
    const id = window.setInterval(rotate, 4500)
    return () => window.clearInterval(id)
  }, [rotate, pool.length])

  const imgStyle = (show: boolean): React.CSSProperties => ({
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    opacity: show ? 1 : 0,
    transition: 'opacity 600ms ease-in-out',
  })

  return (
    <>
      <div className="bo-hero-mosaic">
        <div
          className="animate-fade-up relative overflow-hidden"
          style={{ background: '#1A9E9E', animationDelay: '200ms' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current[0]} alt="" aria-hidden="true" style={imgStyle(!fading)} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pending[0]} alt="" aria-hidden="true" style={imgStyle(fading)} />
          <div className="absolute inset-0" style={{ background: 'rgba(26,158,158,0.55)' }} />
        </div>

        <div
          className="animate-fade-up relative overflow-hidden"
          style={{ background: '#C46D63', gridRow: 'span 2', animationDelay: '300ms' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current[1]} alt="" aria-hidden="true" style={imgStyle(!fading)} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pending[1]} alt="" aria-hidden="true" style={imgStyle(fading)} />
          <div className="absolute inset-0" style={{ background: 'rgba(196,109,99,0.45)' }} />
        </div>

        <div
          className="animate-fade-up flex items-center justify-center"
          style={{ background: '#2F2F2D', animationDelay: '350ms' }}
        >
          <span
            className="font-display"
            style={{ color: '#F8F7F3', fontSize: '0.85rem', letterSpacing: '0.15em' }}
          >
            EST. 2014
          </span>
        </div>

        <div
          className="animate-fade-up relative overflow-hidden"
          style={{ background: '#F8F7F3', animationDelay: '400ms' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current[2]} alt="" aria-hidden="true" style={imgStyle(!fading)} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pending[2]} alt="" aria-hidden="true" style={imgStyle(fading)} />
          <div className="absolute inset-0" style={{ background: 'rgba(248,247,243,0.45)' }} />
        </div>

        <div
          className="animate-fade-up flex items-center justify-center"
          style={{ background: '#0F6E6E', animationDelay: '450ms' }}
        >
          <span
            className="font-display"
            style={{ color: 'rgba(248,247,243,0.85)', fontSize: '0.7rem', letterSpacing: '0.2em' }}
          >
            MIAMI, FL
          </span>
        </div>
      </div>

      <style>{`
        .bo-hero-mosaic {
          width: 100%;
          height: 100%;
          min-height: 560px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: 1fr 1fr 1fr;
          gap: 3px;
        }

        @media (max-width: 767px) {
          .bo-hero-mosaic {
            aspect-ratio: 16 / 13;
            min-height: 0;
            height: auto;
          }
        }
      `}</style>
    </>
  )
}
