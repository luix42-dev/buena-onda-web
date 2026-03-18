'use client'

import { useState } from 'react'
import type { ItemImage } from '@/types'

interface GalleryImage {
  id:       string
  url:      string
  alt_text: string | null
}

interface Props {
  images:   ItemImage[]
  coverUrl: string | null
  title:    string
  isSold:   boolean
}

export default function ImageGallery({ images, coverUrl, title, isSold }: Props) {
  // Build ordered array: cover first, then item_images by sort_order, deduplicated
  const ordered: GalleryImage[] = []

  if (coverUrl) {
    ordered.push({ id: '__cover', url: coverUrl, alt_text: title })
  }

  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order)
  for (const img of sorted) {
    if (!ordered.some(o => o.url === img.url)) {
      ordered.push({ id: img.id, url: img.url, alt_text: img.alt_text })
    }
  }

  const [selected, setSelected] = useState(0)
  const hero = ordered[selected] ?? ordered[0]

  if (ordered.length === 0) {
    return (
      <div className="aspect-[3/4] bg-sand-bg flex items-center justify-center">
        <span className="catalog-ordinal text-stone-grey">No image</span>
      </div>
    )
  }

  return (
    <div>
      {/* Hero image */}
      <div className="relative aspect-[3/4] bg-sand-bg overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={hero.url}
          alt={hero.alt_text ?? title}
          className="w-full h-full object-cover transition-opacity duration-300"
        />

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
      {ordered.length > 1 && (
        <div className="grid grid-cols-4 gap-2 mt-2">
          {ordered.slice(0, 4).map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setSelected(i)}
              className={[
                'aspect-square bg-sand-bg overflow-hidden transition-all duration-200',
                selected === i
                  ? 'ring-1 ring-warm-sand opacity-100'
                  : 'opacity-50 hover:opacity-80',
              ].join(' ')}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.alt_text ?? title}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
