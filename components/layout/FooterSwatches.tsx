'use client'

import { useCallback, useEffect, useState } from 'react'
import { getHeroImages } from '@/lib/getHeroImages'

type Swatch = {
  color: string
  label: string
}

interface FooterSwatchesProps {
  swatches: Swatch[]
}

export default function FooterSwatches({ swatches }: FooterSwatchesProps) {
  const [images, setImages] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    getHeroImages()
      .then(nextImages => {
        if (mounted) setImages(nextImages)
      })
      .catch(() => {
        if (mounted) setImages([])
      })

    return () => {
      mounted = false
    }
  }, [])

  const openRandomImage = useCallback(() => {
    if (images.length === 0) return
    const next = images[Math.floor(Math.random() * images.length)]
    setSelected(next)
  }, [images])

  const close = useCallback(() => setSelected(null), [])

  useEffect(() => {
    if (!selected) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [close, selected])

  return (
    <>
      <div className="flex gap-2 mt-2" aria-label="Brand palette">
        {swatches.map(({ color, label }) => (
          <button
            key={label}
            type="button"
            title={label}
            aria-label={`Open ${label} archive image`}
            onClick={openRandomImage}
            disabled={images.length === 0}
            style={{ background: color, width: 14, height: 14, display: 'block', flexShrink: 0 }}
            className="transition-transform duration-200 hover:scale-125 disabled:cursor-default"
          />
        ))}
      </div>

      {selected ? (
        <button
          type="button"
          aria-label="Close image"
          onClick={close}
          className="fixed inset-0 z-[70] flex items-center justify-center p-5"
          style={{ background: 'rgba(47,47,45,0.86)' }}
        >
          <span
            className="relative block w-full max-w-5xl overflow-hidden"
            style={{
              aspectRatio: '16 / 13',
              background: '#2F2F2D',
              borderTop: '4px solid #1A9E9E',
              boxShadow: '0 24px 80px rgba(47,47,45,0.55)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selected}
              alt=""
              className="h-full w-full"
              style={{ objectFit: 'contain', background: '#2F2F2D' }}
            />
          </span>
        </button>
      ) : null}
    </>
  )
}
