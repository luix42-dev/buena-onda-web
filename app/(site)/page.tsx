import type { Metadata } from 'next'
import Link from 'next/link'
import ScanReveal from '@/components/ui/ScanReveal'
import ContactSheet from '@/components/ui/ContactSheet'
import PullQuote from '@/components/ui/PullQuote'
import NewsletterForm from '@/components/ui/NewsletterForm'
import { createClient } from '@/lib/supabase/server'
import type { Theme, Item } from '@/types'

export const metadata: Metadata = {
  title: 'Buena Onda — An Analog Culture House',
}

// Placeholder contact-sheet images (replace with real Supabase URLs)
const heroFrames = Array.from({ length: 8 }, (_, i) => ({
  src:     '',
  alt:     `Buena Onda frame ${i + 1}`,
  frame:   `${String(i + 1).padStart(2, '0')}A`,
  date:    '2024',
  caption: ['Miami', 'Studio', 'Sound', 'Objects', 'Culture', 'Night', 'Day', 'Life'][i],
}))

const cultureTeaser = [
  {
    label:   'Culture',
    issue:   '001',
    title:   'The Record as Object',
    excerpt: 'Why the 12-inch still matters in an era of algorithmic playlists.',
    href:    '/culture',
  },
  {
    label:   'Radio',
    issue:   'EP·18',
    title:   'Afro-Cuban Jazz at the Source',
    excerpt: 'A two-hour journey through the streets of Havana and Miami.',
    href:    '/radio',
  },
  {
    label:   'Objects',
    issue:   'DROP·04',
    title:   'The Buena Onda Field Bag',
    excerpt: 'Waxed canvas and brass hardware. Made to be used.',
    href:    '/objects',
  },
]

export default async function HomePage() {
  let featuredThemes: Theme[] = []
  let newestItems:    Item[]  = []

  try {
    const supabase = await createClient()
    const [themesRes, itemsRes] = await Promise.all([
      supabase
        .from('themes')
        .select('*')
        .eq('published', true)
        .eq('featured', true)
        .order('sort_order')
        .limit(3),
      supabase
        .from('items')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(4),
    ])
    featuredThemes = (themesRes.data ?? []) as Theme[]
    newestItems    = (itemsRes.data   ?? []) as Item[]
  } catch { /* Supabase not configured yet — ok */ }

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-cream">
        {/* Radial warm light */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 80% 70% at 30% 60%, rgba(192,168,128,0.18) 0%, transparent 70%),' +
              'radial-gradient(ellipse 60% 50% at 80% 30%, rgba(168,192,216,0.10) 0%, transparent 60%)',
          }}
        />

        <div className="relative z-10 text-center px-6 max-w-4xl">
          <p className="section-label mb-6 animate-fade-up" style={{ animationDelay: '200ms' }}>
            Miami · Est. 2019
          </p>

          <h1
            className="font-display text-near-black leading-[0.92] tracking-[-0.035em] mb-6
                       animate-fade-up"
            style={{
              fontSize:       'clamp(3.5rem, 12vw, 8rem)',
              animationDelay: '300ms',
            }}
          >
            Buena<br />Onda
          </h1>

          <p
            className="font-display italic text-charcoal mb-10 animate-fade-up"
            style={{
              fontSize:       'clamp(1rem, 2.5vw, 1.4rem)',
              animationDelay: '450ms',
            }}
          >
            An Analog Culture House
          </p>

          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up"
            style={{ animationDelay: '600ms' }}
          >
            <Link
              href="/culture"
              className="px-7 py-3 bg-near-black text-linen-peach font-mono text-xs tracking-[0.2em]
                         uppercase hover:bg-burnished transition-colors duration-200 paper-hover inline-block"
            >
              Read Culture
            </Link>
            <Link
              href="/radio"
              className="px-7 py-3 border border-warm-sand/50 text-burnished font-mono text-xs
                         tracking-[0.2em] uppercase hover:border-burnished hover:bg-sand-bg
                         transition-all duration-200 inline-block"
            >
              Listen Now
            </Link>
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-pulse-slow">
          <p className="archive-label text-[0.6rem]">↓ scroll</p>
        </div>
      </section>

      {/* ── CONTACT SHEET STRIP ──────────────────────────────────────────── */}
      <section aria-label="Photo archive strip">
        <ContactSheet
          images={heroFrames}
          columns={8}
          className="w-full"
        />
      </section>

      {/* ── MANIFESTO ────────────────────────────────────────────────────── */}
      <section className="py-24 bg-sand-bg">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            <ScanReveal>
              <span className="section-label">Our Philosophy</span>
              <h2
                className="font-display text-near-black mb-6"
                style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}
              >
                Built for the long run.
              </h2>
              <div className="prose-brand">
                <p>
                  We believe that culture lives in objects. In the weight of a record,
                  the grain of aged leather, the warmth of a room where people actually listen.
                </p>
                <p>
                  Buena Onda is not a brand — it's a practice. We make things that last
                  because fast doesn&apos;t interest us. The analog world is not nostalgic.
                  It&apos;s just honest.
                </p>
              </div>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 font-mono text-xs tracking-[0.18em]
                           uppercase text-burnished hover:text-rose-magenta transition-colors mt-8 group"
              >
                Read our story
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </ScanReveal>

            <ScanReveal delay={150}>
              <PullQuote>
                The analog world is not nostalgic. It&apos;s just honest.
              </PullQuote>

              <div className="mt-10 grid grid-cols-3 gap-px bg-pale-stone/50">
                {[
                  { stat: '5,764', label: 'Archive images' },
                  { stat: '18+',   label: 'Radio episodes' },
                  { stat: '04',    label: 'Object drops'   },
                ].map(({ stat, label }) => (
                  <div key={label} className="bg-linen-white px-4 py-5">
                    <p
                      className="font-display text-burnished leading-none mb-1"
                      style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)' }}
                    >
                      {stat}
                    </p>
                    <p className="archive-label text-[0.6rem]">{label}</p>
                  </div>
                ))}
              </div>
            </ScanReveal>
          </div>
        </div>
      </section>

      {/* ── CULTURE TEASER ───────────────────────────────────────────────── */}
      <section className="py-24 bg-cream">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <div className="flex items-end justify-between mb-12">
            <div>
              <span className="section-label">Latest</span>
              <h2
                className="font-display text-near-black"
                style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)' }}
              >
                From the house
              </h2>
            </div>
            <Link
              href="/culture"
              className="font-mono text-xs tracking-[0.18em] uppercase text-stone-grey
                         hover:text-burnished transition-colors hidden sm:block"
            >
              All →
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {cultureTeaser.map(({ label, issue, title, excerpt, href }, i) => (
              <ScanReveal key={title} delay={i * 100}>
                <Link href={href} className="group block paper-hover bg-linen-white p-6 h-full">
                  <div className="flex items-center justify-between mb-4">
                    <span className="archive-label text-[0.6rem]">{label}</span>
                    <span className="archive-label text-[0.6rem] text-warm-sand">{issue}</span>
                  </div>
                  <h3
                    className="font-display text-near-black mb-3 group-hover:text-burnished
                               transition-colors"
                    style={{ fontSize: 'clamp(1.1rem, 2vw, 1.35rem)' }}
                  >
                    {title}
                  </h3>
                  <p className="text-charcoal text-sm leading-relaxed">{excerpt}</p>
                  <p className="font-mono text-xs tracking-wider text-warm-sand mt-6 group-hover:text-terracotta transition-colors">
                    Read →
                  </p>
                </Link>
              </ScanReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── RADIO CTA ─────────────────────────────────────────────────────── */}
      <section className="py-24 bg-near-black text-pale-stone relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 60% 80% at 80% 50%, rgba(190,85,130,0.08) 0%, transparent 70%)',
          }}
        />
        <div className="max-w-site mx-auto px-5 md:px-10 relative z-10">
          <ScanReveal>
            <div className="max-w-2xl">
              <span className="section-label text-stone-grey">Radio / Sound</span>
              <h2
                className="font-display text-linen-peach mt-2 mb-6"
                style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)' }}
              >
                The signal is always on.
              </h2>
              <p className="text-stone-grey text-base leading-relaxed mb-8">
                Curated mixes, live sessions, and field recordings.
                Music the way it was meant to be heard — in sequence, without shuffle.
              </p>
              <Link
                href="/radio"
                className="inline-flex items-center gap-2 px-6 py-3 border border-warm-sand/40
                           text-warm-sand font-mono text-xs tracking-[0.2em] uppercase
                           hover:bg-warm-sand/10 hover:border-warm-sand transition-all duration-200 group"
              >
                Enter the archive
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>
          </ScanReveal>
        </div>
      </section>

      {/* ── FEATURED THEMES ──────────────────────────────────────────────── */}
      <section className="py-24 bg-sand-bg">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <ScanReveal>
            <div className="flex items-end justify-between mb-4">
              <div>
                <span className="section-label">Catalog</span>
                <h2
                  className="font-display text-near-black"
                  style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)' }}
                >
                  Themes.
                </h2>
              </div>
              <Link href="/themes" className="text-cta hidden sm:inline-block">
                All themes →
              </Link>
            </div>
          </ScanReveal>

          {featuredThemes.length > 0 ? (
            /* Typography-led stacked list */
            <div>
              {featuredThemes.map((theme, i) => (
                <ScanReveal key={theme.id} delay={i * 80}>
                  <div className="editorial-rule" />
                  <Link href={`/themes/${theme.slug}`} className="group block">
                    <div className="grid md:grid-cols-[auto_1fr_auto] gap-6 md:gap-10 py-6 items-center">
                      <span className="catalog-ordinal text-warm-sand/60">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div className="flex items-baseline gap-4 flex-wrap">
                        <span className="catalog-ordinal text-stone-grey">{theme.code}</span>
                        <h3
                          className="font-display text-near-black group-hover:text-burnished transition-colors"
                          style={{ fontSize: 'clamp(1.2rem, 2.5vw, 1.7rem)' }}
                        >
                          {theme.title}
                        </h3>
                        {theme.description && (
                          <span className="font-mono text-xs text-stone-grey hidden md:inline">
                            — {theme.description.slice(0, 60)}{theme.description.length > 60 ? '…' : ''}
                          </span>
                        )}
                      </div>
                      <span className="text-cta group-hover:text-rose-magenta transition-colors">
                        Enter →
                      </span>
                    </div>
                  </Link>
                </ScanReveal>
              ))}
              <div className="editorial-rule" />
            </div>
          ) : (
            /* Placeholder when no themes exist yet */
            <div>
              {[
                { code: 'VNL', label: 'Vinyl Revival',    desc: 'The record as material culture.' },
                { code: 'TXT', label: 'Natural Textiles', desc: 'Fibers, weaves, and slow craft.' },
                { code: 'SOD', label: 'Sound Objects',    desc: 'Instruments as design artifacts.' },
              ].map(({ code, label, desc }, i) => (
                <ScanReveal key={code} delay={i * 80}>
                  <div className="editorial-rule" />
                  <Link href="/themes" className="group block">
                    <div className="grid md:grid-cols-[auto_1fr_auto] gap-6 md:gap-10 py-6 items-center">
                      <span className="catalog-ordinal text-warm-sand/40">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div className="flex items-baseline gap-4 flex-wrap">
                        <span className="catalog-ordinal text-stone-grey/50">{code}</span>
                        <h3
                          className="font-display text-near-black/40 group-hover:text-near-black/60 transition-colors"
                          style={{ fontSize: 'clamp(1.2rem, 2.5vw, 1.7rem)' }}
                        >
                          {label}
                        </h3>
                        <span className="font-mono text-xs text-stone-grey/40 hidden md:inline">
                          — {desc}
                        </span>
                      </div>
                      <span className="catalog-ordinal text-stone-grey/30">Coming →</span>
                    </div>
                  </Link>
                </ScanReveal>
              ))}
              <div className="editorial-rule" />
            </div>
          )}
        </div>
      </section>

      {/* ── NEWEST CATALOG ITEMS ─────────────────────────────────────────── */}
      <section className="py-24 bg-cream">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <ScanReveal>
            <div className="flex items-end justify-between mb-4">
              <div>
                <span className="section-label">Objects</span>
                <h2
                  className="font-display text-near-black"
                  style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)' }}
                >
                  Recently listed.
                </h2>
              </div>
              <Link href="/themes" className="text-cta hidden sm:inline-block">
                Full catalog →
              </Link>
            </div>
          </ScanReveal>

          {newestItems.length > 0 ? (
            /* Editorial list with small portrait thumb */
            <div>
              {newestItems.map((item, i) => (
                <ScanReveal key={item.id} delay={i * 60}>
                  <div className="editorial-rule" />
                  <Link href={`/items/${item.slug}`} className="group block">
                    <div className="grid grid-cols-[4.5rem_1fr_auto] md:grid-cols-[6rem_1fr_auto] gap-5 md:gap-10 py-6 items-center">

                      {/* Small portrait thumbnail */}
                      <div className="aspect-[3/4] overflow-hidden bg-sand-bg flex-shrink-0">
                        {item.cover_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.cover_image_url}
                            alt={item.title}
                            className="w-full h-full object-cover grayscale
                                       group-hover:grayscale-0 transition-all duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-linen-white">
                            <span className="catalog-ordinal" style={{ fontSize: '0.45rem' }}>BO</span>
                          </div>
                        )}
                      </div>

                      {/* Title + catalog number */}
                      <div>
                        {item.catalog_number && (
                          <span className="catalog-ordinal text-stone-grey block mb-2">
                            {item.catalog_number}
                          </span>
                        )}
                        <p
                          className="font-display text-near-black group-hover:text-burnished transition-colors"
                          style={{ fontSize: 'clamp(1rem, 2vw, 1.35rem)', lineHeight: 1.1 }}
                        >
                          {item.title}
                        </p>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        {item.price ? (
                          <span className="catalog-ordinal">${item.price.toFixed(2)}</span>
                        ) : (
                          <span className="catalog-ordinal text-stone-grey/30">—</span>
                        )}
                      </div>

                    </div>
                  </Link>
                </ScanReveal>
              ))}
              <div className="editorial-rule" />
            </div>
          ) : (
            /* Placeholder when no items yet */
            <>
              <div className="editorial-rule" />
              <ScanReveal>
                <div className="py-20 text-center">
                  <p className="catalog-ordinal">The catalog is being assembled.</p>
                  <Link href="/themes" className="text-cta mt-6 inline-block">
                    Browse themes →
                  </Link>
                </div>
              </ScanReveal>
              <div className="editorial-rule" />
            </>
          )}
        </div>
      </section>

      {/* ── NEWSLETTER ───────────────────────────────────────────────────── */}
      <section className="py-20 bg-linen-white border-t border-pale-stone">
        <div className="max-w-site mx-auto px-5 md:px-10 text-center">
          <ScanReveal>
            <span className="section-label">Stay close</span>
            <h2
              className="font-display text-near-black mt-2 mb-4"
              style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)' }}
            >
              Slow mail. Good content.
            </h2>
            <p className="text-charcoal text-sm mb-8 max-w-md mx-auto">
              No algorithms. Just culture, drops, and what&apos;s playing in the house.
            </p>
            <NewsletterForm layout="stack" className="max-w-md mx-auto" />
          </ScanReveal>
        </div>
      </section>
    </>
  )
}
