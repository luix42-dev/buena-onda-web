'use client'

import { useState, useCallback, useEffect } from 'react'
import type { ItemImage } from '@/types'

interface GalleryImage {
  id:       string
  url:      string
  alt_text: string | null
}

interface Props {
  images:           ItemImage[]
  fallbackCoverUrl: string | null
  title:            string
  isSold:           boolean
}

export default function ImageGallery({ images, fallbackCoverUrl, title, isSold }: Props) {
  // item_images is the source of truth (cover = sort_order 1).
  // Fall back to cover_image_url only for legacy items with no item_images rows.
  const ordered: GalleryImage[] = []

  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order)
  for (const img of sorted) {
    ordered.push({ id: img.id, url: img.url, alt_text: img.alt_text })
  }

  // Legacy fallback — no item_images rows, use cover_image_url as single image
  if (ordered.length === 0 && fallbackCoverUrl) {
    ordered.push({ id: '__cover', url: fallbackCoverUrl, alt_text: title })
  }

  const [selected, setSelected]         = useState(0)
  const [isLightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxZoom, setLightboxZoom]  = useState(1)

  const hero = ordered[selected] ?? ordered[0]
  const hasMultiple = ordered.length > 1

  const goPrev = useCallback(() => {
    setSelected(i => (i - 1 + ordered.length) % ordered.length)
  }, [ordered.length])

  const goNext = useCallback(() => {
    setSelected(i => (i + 1) % ordered.length)
  }, [ordered.length])

  const openLightbox = () => {
    setLightboxZoom(1)
    setLightboxOpen(true)
  }

  const closeLightbox = () => {
    setLightboxOpen(false)
    setLightboxZoom(1)
  }

  const toggleZoom = () => setLightboxZoom(z => z === 1 ? 1.8 : 1)

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!isLightboxOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  goPrev()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'Escape')     closeLightbox()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isLightboxOpen, goPrev, goNext])

  if (ordered.length === 0) {
    return (
      <div className="aspect-[3/4] bg-cream flex items-center justify-center">
        <span className="catalog-ordinal text-stone-grey">No image</span>
      </div>
    )
  }

  const arrowBase =
    'absolute top-1/2 -translate-y-1/2 bg-cream/80 hover:bg-cream text-near-black ' +
    'w-9 h-9 flex items-center justify-center transition-colors z-10 ' +
    'font-mono text-base leading-none select-none'

  return (
    <>
      {/* Hero image */}
      <div className="relative aspect-[3/4] bg-cream overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={hero.url}
          alt={hero.alt_text ?? title}
          onClick={openLightbox}
          className="w-full h-full object-contain transition-opacity duration-300 cursor-zoom-in"
        />

        {/* Prev / Next arrows */}
        {hasMultiple && (
          <>
            <button type="button" onClick={goPrev} className={`${arrowBase} left-2`} aria-label="Previous image">
              &#8592;
            </button>
            <button type="button" onClick={goNext} className={`${arrowBase} right-2`} aria-label="Next image">
              &#8594;
            </button>
          </>
        )}

        {/* Sold stamp */}
        {isSold && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="border-4 border-rose-magenta px-6 py-2 rotate-[-20deg]
                         bg-white/10 backdrop-blur-[1px]"
            >
              <span
                className="font-display text-rose-magenta tracking-[0.35em] select-none"
                style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)' }}
              >
                SOLD
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {hasMultiple && (
        <div className="grid grid-cols-4 gap-2 mt-2">
          {ordered.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setSelected(i)}
              className={[
                'aspect-square bg-cream overflow-hidden transition-all duration-200',
                selected === i ? 'opacity-100' : 'opacity-50 hover:opacity-80',
              ].join(' ')}
              style={selected === i ? { outline: '2px solid #2EC4B6', outlineOffset: '1px' } : {}}
              aria-label={`View image ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.alt_text ?? title}
                className="w-full h-full object-contain"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox modal */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Image wrapper — stop propagation so clicking image doesn't close */}
          <div
            className="relative flex items-center justify-center"
            onClick={e => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={hero.url}
              alt={hero.alt_text ?? title}
              onClick={toggleZoom}
              className={`object-contain max-h-[85vh] max-w-[85vw] transition-transform duration-200 ${
                lightboxZoom > 1 ? 'cursor-zoom-out' : 'cursor-zoom-in'
              }`}
              style={{ transform: `scale(${lightboxZoom})` }}
            />
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white/80 hover:text-white
                       font-mono text-2xl w-10 h-10 flex items-center justify-center
                       transition-colors z-10"
            aria-label="Close lightbox"
          >
            &#215;
          </button>

          {/* Zoom toggle */}
          <button
            type="button"
            onClick={e => { e.stopPropagation(); toggleZoom() }}
            className="absolute bottom-4 right-4 text-white/70 hover:text-white
                       font-mono text-xl w-10 h-10 flex items-center justify-center
                       border border-white/30 hover:border-white/60 transition-colors z-10"
            aria-label={lightboxZoom > 1 ? 'Zoom out' : 'Zoom in'}
          >
            {lightboxZoom > 1 ? '−' : '+'}
          </button>

          {/* Modal prev/next arrows */}
          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); goPrev() }}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white
                           font-mono text-2xl w-12 h-12 flex items-center justify-center
                           border border-white/30 hover:border-white/60 transition-colors z-10"
                aria-label="Previous image"
              >
                &#8592;
              </button>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); goNext() }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white
                           font-mono text-2xl w-12 h-12 flex items-center justify-center
                           border border-white/30 hover:border-white/60 transition-colors z-10"
                aria-label="Next image"
              >
                &#8594;
              </button>
            </>
          )}

          {/* Image counter */}
          {hasMultiple && (
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-xs
                          text-white/50 tracking-widest z-10">
              {selected + 1} / {ordered.length}
            </p>
          )}
        </div>
      )}
    </>
  )
}
