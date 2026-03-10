import type { Metadata } from 'next'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'The Catalog — Buena Onda',
  description: 'Selected works from the Buena Onda catalog — objects, apparel, and editions.',
}

const products = [
  { id: 'DROP-06', name: 'ANALOG TEE',     price: '$44',  tag: 'Core Collection', img: '/images/products/street-suit.jpg'  },
  { id: 'DROP-05', name: 'FIELD JACKET',   price: '$185', tag: 'Seasonal Drop',   img: '/images/products/vogue-blazer.jpg' },
  { id: 'DROP-04', name: 'FIELD BAG',      price: '$285', tag: 'Objects',         img: '/images/products/power-suit.jpg'   },
  { id: 'DROP-03', name: 'GUAYABERA EDIT', price: '$195', tag: 'Curated Vintage', img: '/images/products/journal.jpg'      },
  { id: 'DROP-02', name: 'RECORD CRATE',   price: '$140', tag: 'Objects',         img: '/images/products/record-crate.jpg' },
  { id: 'DROP-01', name: 'OPEN DECKS CAP', price: '$48',  tag: 'Accessories',     img: '/images/products/analog-clock.jpg' },
]

const priceColors = [
  'text-teal-light',
  'text-neon-pink',
  'text-coral-pale',
  'text-teal-light',
  'text-neon-pink',
  'text-coral-pale',
]

const filters = ['All', 'Core Collection', 'Seasonal Drop', 'Curated Vintage', 'Objects', 'Accessories']

export default function ThemesPage() {
  return (
    <>
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="px-12 py-20 bg-warm-page border-b border-black/5 pt-32">
        <p className="text-[0.5rem] tracking-[0.7em] uppercase text-teal mb-3">Selected Works</p>
        <h1 className="font-display text-[clamp(3rem,6vw,5rem)] text-charcoal leading-none">THE CATALOG</h1>
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────────────── */}
      <div className="flex gap-6 px-12 py-5 bg-warm-page border-b border-black/5 text-[0.55rem] tracking-[0.3em] uppercase overflow-x-auto">
        {filters.map(f => (
          <button key={f} className="text-gray hover:text-teal transition-colors whitespace-nowrap">
            {f}
          </button>
        ))}
      </div>

      {/* ── Card grid ───────────────────────────────────────────────────────── */}
      <div className="bg-black grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[3px]">
        {products.map(({ id, name, price, tag, img }, i) => (
          <div
            key={id}
            className={[
              'relative aspect-[3/4] overflow-hidden group cursor-pointer',
              i % 2 === 0
                ? 'hover:ring-1 hover:ring-neon-blue/40 hover:shadow-[0_0_14px_rgba(0,212,255,0.15)]'
                : 'hover:ring-1 hover:ring-neon-pink/40 hover:shadow-[0_0_14px_rgba(255,60,142,0.15)]',
            ].join(' ')}
          >
            <Image
              src={img}
              alt={name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <p className="text-[0.48rem] tracking-[0.5em] uppercase text-white/45 mb-2">{tag}</p>
              <p className="font-display text-[1.6rem] tracking-[0.06em] text-white mb-1 leading-none">{name}</p>
              <p className={`text-[0.72rem] font-medium tracking-[0.1em] ${priceColors[i]}`}>{price}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
