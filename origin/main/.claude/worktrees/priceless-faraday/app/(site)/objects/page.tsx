import type { Metadata } from 'next'
import Link from 'next/link'
import ScanReveal from '@/components/ui/ScanReveal'
import NotifyForm from '@/components/ui/NotifyForm'
import { createClient } from '@/lib/supabase/server'
import type { Drop } from '@/types'

export const metadata: Metadata = {
  title: 'Objects & Drops',
  description: 'Durable objects made to be used. Limited drops, no restocks.',
}

const statusLabel: Record<string, { label: string; color: string }> = {
  live:     { label: 'Available Now', color: 'text-coral'      },
  sold_out: { label: 'Sold Out',      color: 'text-stone-grey' },
  upcoming: { label: 'Coming Soon',   color: 'text-teal'       },
}

export default async function ObjectsPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('drops')
    .select('*')
    .order('drop_date', { ascending: false })

  const drops = (data ?? []) as Drop[]

  const upcoming = drops.filter(d => d.status === 'upcoming')
  const live     = drops.filter(d => d.status === 'live')
  const archive  = drops.filter(d => d.status === 'sold_out')
  const current  = [...upcoming, ...live]

  return (
    <>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="pt-32 pb-16 bg-warm-page">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <ScanReveal>
            <span className="section-label">Objects / Drops</span>
            <h1
              className="font-display text-near-black mt-2 max-w-[18ch] text-balance"
              style={{ fontSize: 'clamp(2.2rem, 6vw, 4rem)' }}
            >
              Things that outlive their moment.
            </h1>
          </ScanReveal>
        </div>
      </div>

      {/* ── Philosophy ─────────────────────────────────────────────────── */}
      <section className="py-16 bg-cream border-b border-pale-stone">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <ScanReveal>
            <div className="max-w-2xl">
              <p className="text-charcoal leading-relaxed text-base">
                We release objects in limited runs. No restocks. No markdown sales.
                When it&apos;s gone, it&apos;s gone — and what&apos;s in your hands becomes
                the record of that moment. Every drop is designed to be used daily,
                age gracefully, and improve with time.
              </p>
            </div>
          </ScanReveal>
        </div>
      </section>

      {/* ── Active / Upcoming ──────────────────────────────────────────── */}
      {current.length > 0 && (
        <section className="py-20 bg-cream">
          <div className="max-w-site mx-auto px-5 md:px-10">
            <ScanReveal>
              <span className="section-label mb-10 block">Current</span>
            </ScanReveal>

            {current.map((drop, i) => {
              const label = statusLabel[drop.status] ?? statusLabel.upcoming
              return (
                <ScanReveal key={drop.id} delay={i * 80}>
                  <div className="grid md:grid-cols-[3fr_2fr] gap-8 mb-16 last:mb-0">
                    {/* Image / placeholder */}
                    <div className="aspect-[4/3] bg-gradient-to-br from-sand-bg to-linen-white
                                    flex items-end p-5 paper-hover overflow-hidden">
                      {drop.images && drop.images.length > 0 ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={drop.images[0]} alt={drop.name}
                          className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <span className="archive-label text-[0.6rem]">{drop.slug?.toUpperCase()}</span>
                      )}
                    </div>

                    <div className="flex flex-col justify-center gap-4">
                      <div className="flex items-center gap-4">
                        <span className="archive-label text-[0.6rem]">{drop.slug?.toUpperCase()}</span>
                        <span className={`font-mono text-xs tracking-wider ${label.color}`}>
                          {label.label}
                        </span>
                      </div>

                      <h2
                        className="font-display text-near-black"
                        style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)' }}
                      >
                        {drop.name}
                      </h2>

                      <p className="text-charcoal text-sm leading-relaxed">{drop.description}</p>

                      {drop.price && (
                        <div className="py-4 border-y border-pale-stone">
                          <p className="archive-label text-[0.58rem] mb-0.5">Price</p>
                          <p className="font-mono text-xs text-near-black">${drop.price.toFixed(2)}</p>
                        </div>
                      )}

                      {drop.status === 'live' ? (
                        <Link
                          href={`/objects/${drop.slug}`}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-near-black text-linen-peach
                                     font-mono text-xs tracking-[0.2em] uppercase hover:bg-burnished
                                     transition-colors self-start"
                        >
                          Reserve your unit →
                        </Link>
                      ) : drop.status === 'upcoming' ? (
                        <NotifyForm dropDate={drop.drop_date ?? ''} />
                      ) : null}
                    </div>
                  </div>
                </ScanReveal>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Archive ────────────────────────────────────────────────────── */}
      {archive.length > 0 && (
        <section className="py-20 bg-warm-white">
          <div className="max-w-site mx-auto px-5 md:px-10">
            <ScanReveal>
              <span className="section-label mb-10 block">Archive</span>
            </ScanReveal>

            <div className="grid md:grid-cols-3 gap-8">
              {archive.map((drop, i) => (
                <ScanReveal key={drop.id} delay={i * 80}>
                  <div className="group paper-hover bg-linen-white">
                    <div className="aspect-[4/3] bg-gradient-to-br from-pale-stone to-off-white
                                    flex items-end p-4 overflow-hidden relative">
                      {drop.images && drop.images.length > 0 ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={drop.images[0]} alt={drop.name}
                          className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <span className="archive-label text-[0.6rem] relative z-10">{drop.slug?.toUpperCase()}</span>
                      )}
                    </div>
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="archive-label text-[0.58rem]">
                          {drop.drop_date ? new Date(drop.drop_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}
                        </span>
                        <span className="font-mono text-xs text-stone-grey">Sold Out</span>
                      </div>
                      <h3 className="font-display text-near-black text-lg mb-2">{drop.name}</h3>
                      {drop.price && (
                        <p className="archive-label text-[0.6rem] text-teal mt-2">${drop.price.toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                </ScanReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {drops.length === 0 && (
        <section className="py-32 bg-cream">
          <div className="max-w-site mx-auto px-5 md:px-10 text-center">
            <p className="font-mono text-xs text-stone-grey tracking-[0.3em] uppercase">
              New drops coming soon.
            </p>
          </div>
        </section>
      )}
    </>
  )
}
