'use client'

import { useState, useEffect, useCallback } from 'react'

interface HeroGridProps {
  images:   string[]  // full pool from getHeroImages()
  fallback: string[]  // exactly 3 static paths
}

function pick3(pool: string[], exclude: string[], fallback: string[]): string[] {
  if (pool.length < 3) return fallback
  const available = pool.filter(s => !exclude.includes(s))
  const source = available.length >= 3 ? available : pool
  const shuffled = [...source].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 3)
}

export default function HeroGrid({ images, fallback }: HeroGridProps) {
  const [current, setCurrent] = useState<string[]>(() =>
    images.length >= 3 ? pick3(images, [], fallback) : fallback
  )
  const [pending, setPending] = useState<string[]>(current)
  const [fading,  setFading]  = useState(false)

  const rotate = useCallback(() => {
    const next = pick3(images, current, fallback)
    setPending(next)
    setFading(true)
    setTimeout(() => {
      setCurrent(next)
      setFading(false)
    }, 650)
  }, [current, images, fallback])

  useEffect(() => {
    if (images.length < 3) return
    const id = setInterval(rotate, 8000)
    return () => clearInterval(id)
  }, [rotate, images.length])

  const imgStyle = (show: boolean): React.CSSProperties => ({
    position:   'absolute',
    inset:      0,
    width:      '100%',
    height:     '100%',
    objectFit:  'cover',
    opacity:    show ? 1 : 0,
    transition: 'opacity 600ms ease-in-out',
  })

  return (
    <div
      style={{
        width:               '100%',
        height:              '100%',
        minHeight:           '560px',
        display:             'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows:    '1fr 1fr 1fr',
        gap:                 '3px',
      }}
    >
      {/* Cell 1 — teal */}
      <div
        className="animate-fade-up relative overflow-hidden"
        style={{ background: '#2A9D9D', animationDelay: '200ms' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current[0]} alt="" aria-hidden="true" style={imgStyle(!fading)} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pending[0]} alt="" aria-hidden="true" style={imgStyle(fading)} />
        <div className="absolute inset-0" style={{ background: 'rgba(42,157,157,0.55)' }} />
      </div>

      {/* Cell 2 — coral, spans 2 rows */}
      <div
        className="animate-fade-up relative overflow-hidden"
        style={{ background: '#D9685A', gridRow: 'span 2', animationDelay: '300ms' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current[1]} alt="" aria-hidden="true" style={imgStyle(!fading)} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pending[1]} alt="" aria-hidden="true" style={imgStyle(fading)} />
        <div className="absolute inset-0" style={{ background: 'rgba(217,104,90,0.45)' }} />
      </div>

      {/* Cell 3 — charcoal, EST. 2014 — static */}
      <div
        className="animate-fade-up flex items-center justify-center"
        style={{ background: '#2E2E2E', animationDelay: '350ms' }}
      >
        <span
          className="font-display"
          style={{ color: 'white', fontSize: '0.85rem', letterSpacing: '0.15em' }}
        >
          EST. 2014
        </span>
      </div>

      {/* Cell 4 — coral-pale */}
      <div
        className="animate-fade-up relative overflow-hidden"
        style={{ background: '#F2C4BB', animationDelay: '400ms' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current[2]} alt="" aria-hidden="true" style={imgStyle(!fading)} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pending[2]} alt="" aria-hidden="true" style={imgStyle(fading)} />
        <div className="absolute inset-0" style={{ background: 'rgba(242,196,187,0.55)' }} />
      </div>

      {/* Cell 5 — teal-deep, MIAMI FL — static */}
      <div
        className="animate-fade-up flex items-center justify-center"
        style={{ background: '#1A7070', animationDelay: '450ms' }}
      >
        <span
          className="font-display"
          style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.7rem', letterSpacing: '0.2em' }}
        >
          MIAMI, FL
        </span>
      </div>
    </div>
  )
}
