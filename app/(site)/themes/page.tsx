import type { Metadata } from 'next'
import Link from 'next/link'
import ScanReveal from '@/components/ui/ScanReveal'
import { createClient } from '@/lib/supabase/server'
import type { Theme } from '@/types'

export const metadata: Metadata = {
  title: 'Themes',
  description: 'Browse the Buena Onda catalog by theme — curated editorial spreads of objects and ideas.',
}

export default async function ThemesPage() {
  let themes: Theme[] = []

  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('themes')
      .select('*, items(id)')
      .eq('published', true)
      .order('sort_order')
      .order('created_at', { ascending: false })

    themes = (data ?? []) as Theme[]
  } catch { /* Supabase not configured */ }

  return (
    <>
      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="pt-32 pb-16 bg-cream">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <ScanReveal>
            <span className="section-label">Catalog</span>
            <h1
              className="font-display text-near-black mt-2"
              style={{ fontSize: 'clamp(2.8rem, 7vw, 5rem)' }}
            >
              Themes.
            </h1>
          </ScanReveal>
          <ScanReveal delay={100}>
            <p className="editorial-body mt-4" style={{ maxWidth: '42ch' }}>
              Each theme is a curated editorial spread — objects gathered around
              a feeling, a material, or a moment in time.
            </p>
          </ScanReveal>
        </div>
      </div>

      {/* ── Editorial stacked list ─────────────────────────────────────────── */}
      <section className="bg-cream pb-32">
        <div className="max-w-site mx-auto px-5 md:px-10">

          {themes.length === 0 ? (
            <>
              <div className="editorial-rule" />
              <ScanReveal>
                <div className="py-32 text-center">
                  <p className="catalog-ordinal">
                    The catalog is taking shape. Check back soon.
                  </p>
                </div>
              </ScanReveal>
              <div className="editorial-rule" />
            </>
          ) : (
            themes.map((theme, i) => {
              const count = (theme.items as unknown[] | undefined)?.length ?? 0
              const isEven = i % 2 === 0

              return (
                <ScanReveal key={theme.id} delay={i * 60}>
                  <div className="editorial-rule" />

                  <div className="grid md:grid-cols-2 gap-0">
                    {/* ── Portrait image — alternates sides ─────────────── */}
                    <div className={isEven ? 'md:order-1' : 'md:order-2'}>
                      <Link href={`/themes/${theme.slug}`} className="block group">
                        <div className="aspect-[3/4] overflow-hidden bg-sand-bg">
                          {theme.cover_image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={theme.cover_image}
                              alt={theme.title}
                              className="w-full h-full object-cover grayscale
                                         group-hover:grayscale-0 transition-all duration-700"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span
                                className="font-display text-warm-sand/40 tracking-[0.25em]"
                                style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}
                              >
                                {theme.code}
                              </span>
                            </div>
                          )}
                        </div>
                      </Link>
                    </div>

                    {/* ── Editorial text ─────────────────────────────────── */}
                    <div
                      className={`${isEven ? 'md:order-2' : 'md:order-1'} flex flex-col justify-center py-16 md:px-16`}
                    >
                      {/* Archive ordinal */}
                      <span className="catalog-ordinal block mb-8">
                        {String(i + 1).padStart(2, '0')} — {theme.code}
                      </span>

                      {/* Theme title */}
                      <h2
                        className="font-display text-near-black mb-6 text-balance"
                        style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', lineHeight: 1.0 }}
                      >
                        {theme.title}
                      </h2>

                      {/* Description */}
                      {theme.description && (
                        <p className="editorial-body mb-10" style={{ maxWidth: '36ch' }}>
                          {theme.description}
                        </p>
                      )}

                      {/* CTA row */}
                      <div className="flex items-baseline gap-8 flex-wrap">
                        <Link href={`/themes/${theme.slug}`} className="text-cta">
                          Enter spread →
                        </Link>
                        {count > 0 && (
                          <span className="catalog-ordinal">
                            {count} {count === 1 ? 'object' : 'objects'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </ScanReveal>
              )
            })
          )}

          {themes.length > 0 && <div className="editorial-rule" />}
        </div>
      </section>
    </>
  )
}
