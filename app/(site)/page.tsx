import type { Metadata } from 'next'
import Link from 'next/link'
import ScanReveal from '@/components/ui/ScanReveal'
import ContactSheet from '@/components/ui/ContactSheet'
import PullQuote from '@/components/ui/PullQuote'
import NewsletterForm from '@/components/ui/NewsletterForm'

export const metadata: Metadata = {
  title: 'Buena Onda — An Analog Culture House',
}

const heroFrames = [
  { src: '/images/hero/01.jpg', alt: 'Buena Onda — Miami', frame: '01A', date: '2017', caption: 'Miami' },
  { src: '/images/hero/02.jpg', alt: 'Buena Onda — Studio', frame: '02A', date: '2017', caption: 'Studio' },
  { src: '/images/hero/05.jpg', alt: 'Buena Onda — Culture', frame: '05A', date: '2019', caption: 'Culture' },
  { src: '/images/hero/06.jpg', alt: 'Buena Onda — Night', frame: '06A', date: '2019', caption: 'Night' },
  { src: '/images/hero/07.jpg', alt: 'Buena Onda — Day', frame: '07A', date: '2019', caption: 'Day' },
  { src: '/images/hero/08.jpg', alt: 'Buena Onda — Life', frame: '08A', date: '2019', caption: 'Life' },
]

const featuredObjects = [
  { code: 'DROP·04', name: 'The Buena Onda Field Bag', desc: 'Waxed canvas and brass hardware. Made to be used.', img: '/images/products/power-suit.jpg' },
  { code: 'DROP·03', name: 'The Guayabera Edit', desc: 'A modern take on the classic Cuban shirt.', img: '/images/products/vogue-blazer.jpg' },
  { code: 'DROP·02', name: 'The Record Crate', desc: 'Solid walnut, felt-lined. Holds 80 records.', img: '/images/products/street-suit.jpg' },
]

const cultureTeaser = [
  {
    label: 'Culture',
    issue: '001',
    title: 'The Record as Object',
    excerpt: 'Why the 12-inch still matters in an era of algorithmic playlists.',
    href: '/culture',
  },
  {
    label: 'Radio',
    issue: 'EP·18',
    title: 'Afro-Cuban Jazz at the Source',
    excerpt: 'A two-hour journey through the streets of Havana and Miami.',
    href: '/radio',
  },
  {
    label: 'Objects',
    issue: 'DROP·04',
    title: 'The Buena Onda Field Bag',
    excerpt: 'Waxed canvas and brass hardware. Made to be used.',
    href: '/objects',
  },
]

export default function HomePage() {
  return (
    <>
      {/* ── 1. HERO ─────────────────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden bg-near-black">
        {/* Background image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hero/08.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-top opacity-50"
        />
        {/* Warm overlay */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, rgba(35,30,25,0.5) 0%, rgba(35,30,25,0.3) 50%, rgba(35,30,25,0.7) 100%),' +
              'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(196,168,124,0.08) 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10 text-center px-6 max-w-4xl">
          <h1
            className="font-display text-cream leading-[0.88] tracking-[-0.045em] mb-8 animate-fade-up drop-shadow-sm"
            style={{
              fontSize: 'clamp(4rem, 14vw, 9rem)',
              animationDelay: '200ms',
            }}
          >
            Buena<br />Onda
          </h1>

          <p
            className="font-mono text-[0.65rem] tracking-[0.35em] uppercase text-warm-sand/70 mb-14 animate-fade-up"
            style={{ animationDelay: '400ms' }}
          >
            An Analog Culture House · Miami · Est. 2014
          </p>

          <div className="animate-fade-up" style={{ animationDelay: '600ms' }}>
            <a
              href="#house"
              className="font-mono text-[0.65rem] tracking-[0.3em] uppercase text-warm-sand
                         hover:text-cream transition-colors duration-200 inline-block
                         border-b border-warm-sand/30 hover:border-warm-sand pb-1"
            >
              Explore the house ↓
            </a>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-pulse-slow">
          <p className="archive-label text-[0.6rem] text-warm-sand/50">↓ scroll</p>
        </div>
      </section>

      {/* ── 2. PHOTO STRIP ──────────────────────────────────────────────── */}
      <section aria-label="Photo archive strip">
        <ContactSheet images={heroFrames} columns={3} className="w-full" />
      </section>

      {/* ── 3. FROM THE HOUSE ──────────────────────────────────────────── */}
      <section id="house" className="py-28 bg-cream">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <div className="flex items-end justify-between mb-12">
            <div>
              <span className="section-label text-terracotta">Latest</span>
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
                         hover:text-terracotta transition-colors hidden sm:block"
            >
              All →
            </Link>
          </div>

          <ScanReveal>
            <div className="grid md:grid-cols-3 gap-16">
              {cultureTeaser.map(({ label, issue, title, excerpt, href }) => (
                <Link key={title} href={href} className="group block">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="archive-label text-[0.6rem]">{label}</span>
                    <span className="archive-label text-[0.6rem] text-dusty-rose">{issue}</span>
                  </div>
                  <h3
                    className="font-display text-near-black mb-3 group-hover:text-terracotta transition-colors"
                    style={{ fontSize: 'clamp(1.1rem, 2vw, 1.35rem)' }}
                  >
                    {title}
                  </h3>
                  <p className="text-charcoal text-sm leading-relaxed">{excerpt}</p>
                  <p className="font-mono text-xs tracking-wider text-terracotta mt-6 group-hover:text-dusty-rose transition-colors">
                    Read →
                  </p>
                </Link>
              ))}
            </div>
          </ScanReveal>
        </div>
      </section>

      {/* ── 4. RADIO ───────────────────────────────────────────────────── */}
      <section className="relative py-32 bg-near-black text-off-white overflow-hidden">
        {/* Neon atmosphere background */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/radio-neon.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to right, rgba(25,22,20,0.85) 0%, rgba(25,22,20,0.6) 50%, rgba(25,22,20,0.85) 100%)',
          }}
        />
        <div className="max-w-site mx-auto px-5 md:px-10 relative z-10">
          <ScanReveal>
            <div className="grid md:grid-cols-[1fr_auto] gap-12 md:gap-20 items-center">
              <div>
                <span className="section-label text-warm-sand">Club Jolt Radio · 80s Sessions</span>
                <h2
                  className="font-display text-cream mt-2 mb-6"
                  style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)' }}
                >
                  The signal is always on.
                </h2>
                <p className="text-stone-grey text-base leading-relaxed mb-10 max-w-xl">
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
              {/* Episode card */}
              <div className="hidden md:block w-72 border border-warm-sand/20 p-8">
                <p className="font-mono text-[0.55rem] tracking-[0.2em] uppercase text-warm-sand/50 mb-4">Now Playing</p>
                <p className="font-display text-cream text-lg mb-2">Onda Tropical Vol. 1</p>
                <p className="text-stone-grey text-xs leading-relaxed mb-6">Afro-Cuban rhythms, Miami bass, and sunset soul.</p>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-terracotta animate-pulse" />
                  <p className="font-mono text-[0.55rem] tracking-[0.15em] uppercase text-warm-sand/40">Live</p>
                </div>
              </div>
            </div>
          </ScanReveal>
        </div>
      </section>

      {/* ── 5. OBJECTS & EDITIONS ──────────────────────────────────────── */}
      <section className="py-32 bg-sand-bg">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <ScanReveal>
            <div className="mb-12">
              <h2 className="font-display text-near-black" style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)' }}>
                <span className="font-black">Objects</span> &amp; Editions
              </h2>
            </div>
          </ScanReveal>

          <ScanReveal>
            <div className="grid md:grid-cols-3 gap-16">
              {featuredObjects.map(({ code, name, desc, img }) => (
                <div key={code} className="group">
                  <div className="aspect-[3/4] overflow-hidden bg-linen-peach mb-8">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img}
                      alt={name}
                      className="w-full h-full object-cover transition-all duration-500 group-hover:scale-[1.03]"
                    />
                  </div>
                  <p className="font-mono text-[0.55rem] tracking-[0.2em] uppercase text-stone-grey/60 mb-3">{code}</p>
                  <h3 className="font-display text-near-black mb-2" style={{ fontSize: 'clamp(1.15rem, 2vw, 1.45rem)' }}>{name}</h3>
                  <p className="text-charcoal/70 text-xs leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </ScanReveal>
        </div>
      </section>

      {/* ── 6. PHILOSOPHY ──────────────────────────────────────────────── */}
      <section className="py-32 bg-cream">
        <div className="max-w-xl mx-auto px-5 md:px-10 text-center">
          <ScanReveal>
            <span className="section-label text-terracotta">Our Philosophy</span>
            <h2
              className="font-display text-near-black mt-2 mb-6"
              style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}
            >
              Built for the long run.
            </h2>
            <div className="prose-brand text-charcoal">
              <p>
                We believe that culture lives in objects. In the weight of a record,
                the grain of aged leather, the warmth of a room where people actually listen.
              </p>
              <p>
                Buena Onda is not a brand — it&apos;s a practice. We make things that last
                because fast doesn&apos;t interest us. The analog world is not nostalgic.
                It&apos;s just honest.
              </p>
            </div>
            <PullQuote>
              The analog world is not nostalgic. It&apos;s just honest.
            </PullQuote>
            <Link
              href="/about"
              className="inline-flex items-center gap-2 font-mono text-xs tracking-[0.18em]
                         uppercase text-terracotta hover:text-dusty-rose transition-colors mt-8 group"
            >
              Read our story
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </ScanReveal>
        </div>
      </section>

      {/* ── 7. NEWSLETTER ──────────────────────────────────────────────── */}
      <section className="py-24 bg-linen-white border-t border-pale-stone">
        <div className="max-w-md mx-auto px-5 text-center">
          <ScanReveal>
            <span className="section-label text-terracotta">Stay close</span>
            <h2
              className="font-display text-near-black mt-2 mb-4"
              style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)' }}
            >
              Slow mail. Good content.
            </h2>
            <p className="text-charcoal text-sm mb-8">
              No algorithms. Just culture, drops, and what&apos;s playing in the house.
            </p>
            <NewsletterForm layout="stack" className="max-w-md mx-auto" />
          </ScanReveal>
        </div>
      </section>
    </>
  )
}