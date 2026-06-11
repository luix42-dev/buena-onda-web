'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import useEmblaCarousel from 'embla-carousel-react'
import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/thumbnails.css'
import type { ItemImage } from '@/types'

interface GalleryImage {
  id: string
  url: string
  altText: string
}

interface Props {
  images: ItemImage[]
  fallbackCoverUrl: string | null
  title: string
  isSold: boolean
}

export default function ImageGallery({ images, fallbackCoverUrl, title, isSold }: Props) {
  const ordered = useMemo<GalleryImage[]>(() => {
    const nextImages = [...images]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((image) => ({
        id: image.id,
        url: image.url,
        altText: image.alt_text?.trim() || title,
      }))

    if (nextImages.length === 0 && fallbackCoverUrl) {
      nextImages.push({ id: '__cover', url: fallbackCoverUrl, altText: title })
    }

    return nextImages
  }, [fallbackCoverUrl, images, title])

  const [selected, setSelected] = useState(0)
  const [isLightboxOpen, setLightboxOpen] = useState(false)
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: false,
    loop: false,
  })

  useEffect(() => {
    setSelected((current) => {
      if (ordered.length === 0) return 0
      return Math.min(current, ordered.length - 1)
    })
  }, [ordered.length])

  useEffect(() => {
    if (!emblaApi) return

    const syncSelection = () => setSelected(emblaApi.selectedScrollSnap())

    syncSelection()
    emblaApi.on('select', syncSelection)
    emblaApi.on('reInit', syncSelection)

    return () => {
      emblaApi.off('select', syncSelection)
      emblaApi.off('reInit', syncSelection)
    }
  }, [emblaApi])

  const scrollTo = useCallback((index: number) => {
    if (!emblaApi) return
    emblaApi.scrollTo(index)
  }, [emblaApi])

  const goPrev = useCallback(() => {
    emblaApi?.scrollPrev()
  }, [emblaApi])

  const goNext = useCallback(() => {
    emblaApi?.scrollNext()
  }, [emblaApi])

  const openLightbox = useCallback(() => {
    setLightboxOpen(true)
  }, [])

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false)
  }, [])

  if (ordered.length === 0) {
    return (
      <div className="aspect-square bg-cream flex items-center justify-center">
        <span className="catalog-ordinal text-stone-grey">No image</span>
      </div>
    )
  }

  const hasMultiple = ordered.length > 1
  const activeImage = ordered[selected] ?? ordered[0]
  const inlineSlides = ordered.map((image, index) => (
    <div key={image.id} className="min-w-0 shrink-0 grow-0 basis-full">
      <button
        type="button"
        onClick={openLightbox}
        className="relative block aspect-square w-full overflow-hidden bg-cream"
        aria-label={`Open image ${index + 1} in fullscreen`}
      >
        <Image
          src={image.url}
          alt={image.altText}
          fill
          priority={index === 0}
          loading={index === 0 ? 'eager' : 'lazy'}
          sizes="(max-width: 767px) calc(100vw - 2.5rem), (max-width: 1279px) 54vw, 42vw"
          className="object-contain"
        />
      </button>
    </div>
  ))

  const lightboxSlides = ordered.map((image) => ({
    src: image.url,
    alt: image.altText,
  }))

  const arrowBase =
    'absolute top-1/2 -translate-y-1/2 bg-cream/85 hover:bg-cream text-near-black ' +
    'w-9 h-9 flex items-center justify-center transition-colors z-10 font-mono text-base leading-none select-none'

  return (
    <>
      <div className="relative">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex touch-pan-y">{inlineSlides}</div>
        </div>

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

        {isSold && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="border-4 border-rose-magenta px-6 py-2 rotate-[-20deg] bg-white/10 backdrop-blur-[1px]"
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

      {hasMultiple && (
        <div className="grid grid-cols-4 gap-2 mt-2">
          {ordered.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => scrollTo(index)}
              className={[
                'relative aspect-square overflow-hidden bg-cream transition-opacity duration-200',
                selected === index ? 'opacity-100' : 'opacity-55 hover:opacity-80',
              ].join(' ')}
              style={selected === index ? { outline: '2px solid #1A9E9E', outlineOffset: '1px' } : {}}
              aria-label={`View image ${index + 1}`}
            >
              <Image
                src={image.url}
                alt={image.altText}
                fill
                loading="lazy"
                sizes="(max-width: 767px) calc((100vw - 3rem) / 4), 120px"
                className="object-contain"
              />
            </button>
          ))}
        </div>
      )}

      <Lightbox
        open={isLightboxOpen}
        close={closeLightbox}
        index={selected}
        slides={lightboxSlides}
        plugins={[Zoom, Thumbnails]}
        on={{
          view: ({ index }) => {
            setSelected(index)
            emblaApi?.scrollTo(index)
          },
        }}
        controller={{ closeOnBackdropClick: true }}
        carousel={{ finite: !hasMultiple }}
        zoom={{
          maxZoomPixelRatio: 4,
          doubleTapDelay: 250,
          doubleClickDelay: 250,
          scrollToZoom: true,
        }}
        thumbnails={{
          position: 'bottom',
          width: 88,
          height: 88,
          border: 0,
          borderRadius: 0,
          padding: 4,
          gap: 8,
          vignette: false,
        }}
        render={{
          buttonPrev: hasMultiple ? undefined : () => null,
          buttonNext: hasMultiple ? undefined : () => null,
        }}
      />

      <p className="mt-3 font-mono text-[0.65rem] uppercase tracking-[0.3em] text-stone-grey">
        Tap or click image to zoom
      </p>

      <span className="sr-only">{activeImage.altText}</span>
    </>
  )
}
