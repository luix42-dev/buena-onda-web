'use client'

import { useCallback, useEffect, useState } from 'react'
import ScanReveal from '@/components/ui/ScanReveal'

type GalleryItem = { image?: string; caption?: string }

function galleryClass(index: number) {
  if (index === 0) return 'col-span-2 row-span-2 md:col-span-3 md:row-span-2'
  if (index === 1) return 'col-span-1 row-span-1 md:col-span-2'
  if (index === 2) return 'col-span-1 row-span-1 md:col-span-1'
  if (index % 5 === 3) return 'col-span-2 row-span-1 md:col-span-3'
  if (index % 5 === 4) return 'col-span-1 row-span-1 md:col-span-2'
  return 'col-span-1 row-span-1 md:col-span-2'
}

export default function GalleryGrid({ gallery, eventName }: { gallery: GalleryItem[]; eventName: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const close = useCallback(() => setOpenIndex(null), [])

  useEffect(() => {
    if (openIndex === null) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openIndex, close])

  const openItem = openIndex !== null ? gallery[openIndex] : null

  return (
    <>
      <div className='grid grid-cols-2 md:grid-cols-6 auto-rows-[160px] gap-3 md:gap-4'>
        {gallery.map((item, i) => (
          <ScanReveal key={(item.image ?? 'image') + '-' + i} delay={i * 45} className={galleryClass(i)}>
            <figure
              className='relative h-full overflow-hidden rounded-[3px] bg-near-black cursor-pointer'
              onClick={() => setOpenIndex(i)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.image} alt={item.caption ?? eventName} className='w-full h-full object-cover' />
              {item.caption ? (
                <figcaption className='absolute left-3 bottom-3 max-w-[80%] font-mono text-[0.58rem] uppercase tracking-[0.16em] text-white/75'>
                  {item.caption}
                </figcaption>
              ) : null}
            </figure>
          </ScanReveal>
        ))}
      </div>

      {openItem ? (
        <div
          role='dialog'
          aria-modal='true'
          onClick={close}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <button
            type='button'
            onClick={close}
            aria-label='Close lightbox'
            style={{
              position: 'absolute',
              top: 20,
              right: 24,
              color: '#fff',
              fontSize: '1.75rem',
              lineHeight: 1,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              opacity: 0.85,
            }}
          >
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={openItem.image}
            alt={openItem.caption ?? eventName}
            onClick={e => e.stopPropagation()}
            style={{ maxHeight: '90vh', maxWidth: '90vw', objectFit: 'contain', display: 'block' }}
          />
          {openItem.caption ? (
            <p
              onClick={e => e.stopPropagation()}
              style={{
                position: 'absolute',
                bottom: 24,
                left: '50%',
                transform: 'translateX(-50%)',
                color: 'rgba(255,255,255,0.65)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}
            >
              {openItem.caption}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  )
}
