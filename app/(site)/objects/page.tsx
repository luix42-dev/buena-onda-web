import type { Metadata } from 'next'
import Link from 'next/link'
import ScanReveal from '@/components/ui/ScanReveal'
import NotifyForm from '@/components/ui/NotifyForm'

export const metadata: Metadata = {
  title: 'Objects & Drops',
  description: 'Durable objects made to be used. Limited drops, no restocks.',
}

type DropStatus = 'live' | 'sold_out' | 'upcoming'

interface Drop {
  id:          string
  number:      string
  name:        string
  description: string
  price:       string
  status:      DropStatus
  material:    string
  origin:      string
  units:       string
  date:        string
}

const drops: Drop[] = [
  {
    id:          'field-bag',
    number:      'DROP · 04',
    name:        'The Buena Onda Field Bag',
    description: 'Waxed cotton canvas, brass hardware, hand-stitched leather trim. Built to outlast the trend cycle. One main compartment, two interior pockets, padded sleeve for a 13" laptop.',
    price:       '$285',
    status:      'upcoming',
    material:    'Waxed cotton canvas, full-grain leather',
    origin:      'Made in Miami, FL',
    units:       '60 units',
    date:        'Apr 2024',
  },
  {
    id:          'linen-shirt',
    number:      'DROP · 03',
    name:        'The Guayabera Edit',
    description: 'A modern cut on a classic silhouette. Portuguese linen, four-pocket front, mother-of-pearl buttons. Runs slightly long — tuck or leave it.',
    price:       '$195',
    status:      'sold_out',
    material:    'Portuguese linen',
    origin:      'Made in Portugal',
    units:       '80 units',
    date:        'Nov 2023',
  },
  {
    id:          'record-crate',
    number:      'DROP · 02',
    name:        'The Record Crate',
    description: 'Pine slats, brass corner hardware, leather handle. Holds 60 LPs. Designed to live on your floor, not your shelf.',
    price:       '$140',
    status:      'sold_out',
    material:    'Pine, brass, leather',
    origin:      'Made in Miami, FL',
    units:       '40 units',
    date:        'Jun 2023',
  },
  {
    id:          'tote',
    number:      'DROP · 01',
    name:        'The Market Tote',
    description: 'The first object we ever made. Heavy natural canvas, reinforced base, single internal pocket. Simple, because it should be.',
    price:       '$65',
    status:      'sold_out',
    material:    'Heavy canvas, natural dye',
    origin:      'Made in Miami, FL',
    units:       '40 units',
    date:        'Mar 2022',
  },
]

const statusLabel: Record<DropStatus, { label: string; color: string }> = {
  live:     { label: 'Available Now',  color: 'text-coral'      },
  sold_out: { label: 'Sold Out',       color: 'text-stone-grey' },
  upcoming: { label: 'Coming Soon',    color: 'text-teal'       },
}

export default function ObjectsPage() {
  const upcoming = drops.filter(d => d.status === 'upcoming')
  const live     = drops.filter(d => d.status === 'live')
  const archive  = drops.filter(d => d.status === 'sold_out')

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
      {[...upcoming, ...live].length > 0 && (
        <section className="py-20 bg-cream">
          <div className="max-w-site mx-auto px-5 md:px-10">
            <ScanReveal>
              <span className="section-label mb-10 block">Current</span>
            </ScanReveal>

            {[...upcoming, ...live].map((drop, i) => (
              <ScanReveal key={drop.id} delay={i * 80}>
                <div className="grid md:grid-cols-[3fr_2fr] gap-8 mb-16 last:mb-0">
                  {/* Image placeholder */}
                  <div className="aspect-[4/3] bg-gradient-to-br from-sand-bg to-linen-white
                                  flex items-end p-5 paper-hover">
                    <span className="archive-label text-[0.6rem]">{drop.number}</span>
                  </div>

                  <div className="flex flex-col justify-center gap-4">
                    <div className="flex items-center gap-4">
                      <span className="archive-label text-[0.6rem]">{drop.number}</span>
                      <span className={`font-mono text-xs tracking-wider ${statusLabel[drop.status].color}`}>
                        {statusLabel[drop.status].label}
                      </span>
                    </div>

                    <h2
                      className="font-display text-near-black"
                      style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)' }}
                    >
                      {drop.name}
                    </h2>

                    <p className="text-charcoal text-sm leading-relaxed">{drop.description}</p>

                    <div className="grid grid-cols-2 gap-3 py-4 border-y border-pale-stone">
                      {[
                        { label: 'Material', value: drop.material },
                        { label: 'Made',     value: drop.origin   },
                        { label: 'Edition',  value: drop.units    },
                        { label: 'Price',    value: drop.price    },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p className="archive-label text-[0.58rem] mb-0.5">{label}</p>
                          <p className="font-mono text-xs text-near-black">{value}</p>
                        </div>
                      ))}
                    </div>

                    {drop.status === 'live' ? (
                      <Link
                        href={`/objects/${drop.id}`}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-near-black text-linen-peach
                                   font-mono text-xs tracking-[0.2em] uppercase hover:bg-burnished
                                   transition-colors self-start"
                      >
                        Reserve your unit →
                      </Link>
                    ) : drop.status === 'upcoming' ? (
                      <NotifyForm dropDate={drop.date} />
                    ) : null}
                  </div>
                </div>
              </ScanReveal>
            ))}
          </div>
        </section>
      )}

      {/* ── Archive ────────────────────────────────────────────────────── */}
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
                                  flex items-end p-4">
                    <span className="archive-label text-[0.6rem]">{drop.number}</span>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="archive-label text-[0.58rem]">{drop.date}</span>
                      <span className="font-mono text-xs text-stone-grey">Sold Out</span>
                    </div>
                    <h3 className="font-display text-near-black text-lg mb-2">{drop.name}</h3>
                    <p className="archive-label text-[0.6rem] text-teal mt-2">{drop.price}</p>
                  </div>
                </div>
              </ScanReveal>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
