import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Theme } from '@/types'

export const metadata: Metadata = {
  title: 'The Catalog — Buena Onda',
  description: 'Selected works from the Buena Onda catalog — objects, apparel, and editions.',
}

const priceColors = [
  'text-teal-light',
  'text-neon-pink',
  'text-coral-pale',
  'text-teal-light',
  'text-neon-pink',
  'text-coral-pale',
]

export default async function ThemesPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('themes')
    .select('*')
    .eq('published', true)
    .order('sort_order')
    .order('created_at', { ascending: false })

  const themes = (data ?? []) as Theme[]

  return (
    <>
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="px-12 py-20 bg-warm-page border-b border-black/5 pt-32">
        <p className="text-[0.5rem] tracking-[0.7em] uppercase text-teal mb-3">Selected Works</p>
        <h1 className="font-display text-[clamp(3rem,6vw,5rem)] text-charcoal leading-none">THE CATALOG</h1>
      </div>

      {/* ── Card grid ───────────────────────────────────────────────────────── */}
      {themes.length === 0 ? (
        <div className="bg-black min-h-[40vh] flex items-center justify-center">
          <p className="font-mono text-xs text-stone-grey tracking-[0.3em] uppercase">
            The catalog is being assembled.
          </p>
        </div>
      ) : (
        <div className="bg-black grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[3px]">
          {themes.map((theme, i) => (
            <Link
              key={theme.id}
              href={`/themes/${theme.slug}`}
              className={[
                'relative aspect-[3/4] overflow-hidden group cursor-pointer block',
                i % 2 === 0
                  ? 'hover:ring-1 hover:ring-neon-blue/40 hover:shadow-[0_0_14px_rgba(0,212,255,0.15)]'
                  : 'hover:ring-1 hover:ring-neon-pink/40 hover:shadow-[0_0_14px_rgba(255,60,142,0.15)]',
              ].join(' ')}
            >
              {theme.cover_image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={theme.cover_image}
                  alt={theme.title}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-charcoal to-near-black
                                group-hover:scale-105 transition-transform duration-700" />
              )}

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <p className="text-[0.48rem] tracking-[0.5em] uppercase text-white/45 mb-2">
                  {theme.code}
                </p>
                <p className="font-display text-[1.6rem] tracking-[0.06em] text-white mb-1 leading-none">
                  {theme.title.toUpperCase()}
                </p>
                {theme.description && (
                  <p className={`text-[0.72rem] font-medium tracking-[0.1em] ${priceColors[i % priceColors.length]}`}>
                    {theme.description.slice(0, 48)}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
