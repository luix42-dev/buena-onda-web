'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Item, Theme } from '@/types'

type ThemeStub = Pick<Theme, 'id' | 'title' | 'code' | 'slug'>
type ItemWithTheme = Item & { theme: ThemeStub | null }

interface Props {
  items:  ItemWithTheme[]
  themes: ThemeStub[]
}

export default function CatalogGrid({ items, themes }: Props) {
  const [activeTheme, setActiveTheme] = useState<string | null>(null)

  const filtered = activeTheme
    ? items.filter(item => item.theme?.id === activeTheme)
    : items

  return (
    <>
      {/* ── Theme filter pills ──────────────────────────────────────────────── */}
      {themes.length > 0 && (
        <div className="px-5 md:px-10 py-6 border-b border-black/5 bg-warm-page">
          <div className="max-w-site mx-auto flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTheme(null)}
              className={`font-mono text-xs px-3 py-1.5 border transition-colors ${
                activeTheme === null
                  ? 'border-charcoal bg-charcoal text-warm-white'
                  : 'border-pale-stone text-stone-grey hover:border-teal hover:text-teal'
              }`}
            >
              All
            </button>
            {themes.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTheme(t.id === activeTheme ? null : t.id)}
                className={`font-mono text-xs px-3 py-1.5 border transition-colors ${
                  activeTheme === t.id
                    ? 'border-teal bg-teal text-white'
                    : 'border-pale-stone text-stone-grey hover:border-teal hover:text-teal'
                }`}
              >
                {t.code} — {t.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Item count ─────────────────────────────────────────────────────── */}
      <div className="px-5 md:px-10 pt-10 pb-2 bg-warm-page">
        <div className="max-w-site mx-auto">
          <span className="font-mono text-[0.6rem] tracking-[0.3em] uppercase text-stone-grey">
            {filtered.length} {filtered.length === 1 ? 'object' : 'objects'}
            {activeTheme ? ` — ${themes.find(t => t.id === activeTheme)?.title ?? ''}` : ''}
          </span>
        </div>
      </div>

      {/* ── Item grid ──────────────────────────────────────────────────────── */}
      <section className="bg-warm-page pb-24 px-5 md:px-10">
        <div className="max-w-site mx-auto">
          {filtered.length === 0 ? (
            <div className="py-24 text-center border border-pale-stone border-dashed mt-8">
              <p className="font-mono text-sm text-stone-grey">
                No objects in this collection yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 md:gap-10 pt-8">
              {filtered.map((item, i) => (
                <Link
                  key={item.id}
                  href={`/items/${item.slug}`}
                  className={[
                    'group block',
                    item.availability === 'sold'
                      ? 'opacity-50 hover:opacity-75 transition-opacity'
                      : i % 2 === 0
                        ? 'hover:ring-1 hover:ring-neon-blue/40 hover:shadow-[0_0_12px_rgba(0,212,255,0.12)]'
                        : 'hover:ring-1 hover:ring-neon-pink/40 hover:shadow-[0_0_12px_rgba(255,60,142,0.12)]',
                  ].join(' ')}
                >
                  {/* Image */}
                  <div className="aspect-square overflow-hidden mb-3 relative bg-cream">
                    {item.cover_image_url ? (
                      <Image
                        src={item.cover_image_url}
                        alt={item.title}
                        fill
                        loading="lazy"
                        sizes="(max-width: 639px) calc(100vw - 2.5rem), (max-width: 1023px) calc((100vw - 6rem) / 2), (max-width: 1279px) calc((100vw - 8rem) / 3), calc((100vw - 10rem) / 4)"
                        className="absolute inset-0 w-full h-full object-contain group-hover:scale-105 transition-transform duration-700"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-mono text-[0.55rem] tracking-[0.3em] uppercase text-stone-grey">
                          {item.catalog_number ?? item.title.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                    )}

                    {/* Sold tombstone banner */}
                    {item.availability === 'sold' && (
                      <div className="absolute bottom-0 left-0 right-0 bg-near-black/80 py-1.5 px-3">
                        <span className="font-mono text-[0.55rem] tracking-[0.35em] uppercase text-warm-white/70">
                          Found its home
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="px-0.5">
                    {item.theme && (
                      <p className="text-[0.48rem] tracking-[0.4em] uppercase text-stone-grey mb-1">
                        {item.theme.title}
                      </p>
                    )}
                    <h3 className="font-display text-[1.15rem] leading-none text-near-black mb-1.5
                                   group-hover:text-teal transition-colors">
                      {item.title}
                    </h3>
                    <p className="font-mono text-xs text-charcoal">
                      {item.price != null ? `$${item.price.toFixed(0)}` : '—'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
