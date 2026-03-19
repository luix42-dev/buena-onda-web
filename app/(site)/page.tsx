import type { Metadata } from 'next'
import Link from 'next/link'
import ContactSheet from '@/components/ui/ContactSheet'
import ScanReveal from '@/components/ui/ScanReveal'
import NewsletterForm from '@/components/ui/NewsletterForm'

export const metadata: Metadata = {
  title: 'Buena Onda — Analog Culture House',
}

const heroFrames = [
  { src: '/images/hero/01.jpg', alt: 'Buena Onda — Miami',   frame: '01A', date: '2017', caption: 'Miami'   },
  { src: '/images/hero/02.jpg', alt: 'Buena Onda — Studio',  frame: '02A', date: '2017', caption: 'Studio'  },
  { src: '/images/hero/05.jpg', alt: 'Buena Onda — Culture', frame: '05A', date: '2019', caption: 'Culture' },
  { src: '/images/hero/06.jpg', alt: 'Buena Onda — Night',   frame: '06A', date: '2019', caption: 'Night'   },
  { src: '/images/hero/07.jpg', alt: 'Buena Onda — Day',     frame: '07A', date: '2019', caption: 'Day'     },
  { src: '/images/hero/08.jpg', alt: 'Buena Onda — Life',    frame: '08A', date: '2019', caption: 'Life'    },
]

const pillars = [
  {
    name:     'Objects',
    headline: 'Things built to outlive their moment.',
    text:     'Curated objects, garments, and furniture selected for design integrity and cultural weight. Every piece in the catalog earned its place.',
    href:     '/themes',
  },
  {
    name:     'Sound',
    headline: 'Music the way it was meant to be heard.',
    text:     'Curated mixes and live sessions. No shuffle, no algorithm — just a sequence you can trust.',
    href:     '/radio',
  },
  {
    name:     'Culture',
    headline: 'Essays from the analog world.',
    text:     'Dispatches on music, craft, and intentional living. Long reads for slow afternoons.',
    href:     '/culture',
  },
  {
    name:     'Radio',
    headline: 'The signal is always on.',
    text:     'Field recordings and vinyl sessions broadcast from Little Havana and Wynwood.',
    href:     '/radio',
  },
]


export default function HomePage() {
  return (
    <>
      {/* ── 1. HERO ──────────────────────────────────────────────────────────── */}
      <section
        className="relative min-h-screen overflow-hidden grid grid-cols-1 md:grid-cols-[55%_45%]"
        style={{ background: '#FAF8F5' }}
      >
        {/* Left panel */}
        <div className="relative flex flex-col justify-center pl-10 md:pl-20 pr-8 md:pr-10 py-24 md:py-32">
          {/* Teal vertical bar */}
          <div
            className="absolute left-0 top-0 bottom-0"
            style={{ width: '5px', background: '#2A9D9D' }}
            aria-hidden="true"
          />

          <span
            className="font-display block mb-5 animate-fade-up"
            style={{ color: '#2A9D9D', fontSize: '0.75rem', letterSpacing: '0.2em', animationDelay: '150ms' }}
          >
            ANALOG CULTURE HOUSE
          </span>

          <h1
            className="font-display leading-none mb-6 animate-fade-up"
            style={{ fontSize: 'clamp(5rem, 10vw, 8rem)', animationDelay: '250ms' }}
          >
            <span style={{ color: '#2E2E2E', display: 'block' }}>BUENA</span>
            <span style={{ color: '#D9685A', display: 'block' }}>ONDA</span>
          </h1>

          <p
            className="font-serif italic animate-fade-up mb-10"
            style={{
              fontSize:      'clamp(1rem, 1.4vw, 1.15rem)',
              color:         '#777',
              maxWidth:      '30ch',
              lineHeight:    1.65,
              animationDelay: '400ms',
            }}
          >
            Rooted in Miami. Built for the long run.<br />
            Music, objects, and culture — done slowly.
          </p>

          <div className="animate-fade-up" style={{ animationDelay: '550ms' }}>
            <Link href="#pillars" className="btn-hollow-coral">
              Explore the house ↓
            </Link>
          </div>

          <p
            className="font-sans text-[0.6rem] tracking-[0.3em] uppercase mt-16 animate-fade-up"
            style={{ color: '#AAA', animationDelay: '700ms' }}
          >
            Miami, FL · Est. 2014
          </p>
        </div>

        {/* Right panel — Arq-Grid */}
        <div className="relative hidden md:flex items-center justify-center py-16 px-8">
          <div
            className="w-full"
            style={{
              display:             'grid',
              gridTemplateColumns: '1fr 1fr',
              gridTemplateRows:    '1fr 1fr 1fr',
              gap:                 '3px',
              height:              'min(600px, 80vh)',
            }}
          >
            {/* Cell 1 — teal */}
            <div className="animate-fade-up relative overflow-hidden" style={{ background: '#2A9D9D', animationDelay: '200ms' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/hero/01.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" aria-hidden="true" />
              <div className="absolute inset-0" style={{ background: 'rgba(42,157,157,0.55)' }} />
            </div>

            {/* Cell 2 — coral, spans 2 rows */}
            <div
              className="animate-fade-up relative overflow-hidden"
              style={{ background: '#D9685A', gridRow: 'span 2', animationDelay: '300ms' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/hero/02.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" aria-hidden="true" />
              <div className="absolute inset-0" style={{ background: 'rgba(217,104,90,0.45)' }} />
            </div>

            {/* Cell 3 — charcoal + EST. 2014 */}
            <div
              className="animate-fade-up flex items-center justify-center"
              style={{ background: '#2E2E2E', animationDelay: '350ms' }}
            >
              <span
                className="font-display"
                style={{ color: 'white', fontSize: '0.85rem', letterSpacing: '0.15em' }}
              >
                EST. 2014
              </span>
            </div>

            {/* Cell 4 — coral-pale */}
            <div className="animate-fade-up relative overflow-hidden" style={{ background: '#F2C4BB', animationDelay: '400ms' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/hero/06.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" aria-hidden="true" />
              <div className="absolute inset-0" style={{ background: 'rgba(242,196,187,0.55)' }} />
            </div>

            {/* Cell 5 — teal-deep + MIAMI, FL */}
            <div
              className="animate-fade-up flex items-center justify-center"
              style={{ background: '#1A7070', animationDelay: '450ms' }}
            >
              <span
                className="font-display"
                style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.7rem', letterSpacing: '0.2em' }}
              >
                MIAMI, FL
              </span>
            </div>
          </div>

          {/* Coral arq-steps — bottom-right */}
          <div
            className="absolute bottom-8 right-8 animate-fade-up"
            style={{ animationDelay: '650ms' }}
            aria-hidden="true"
          >
            <div style={{ width: '60px', height: '8px', background: '#D9685A', marginBottom: '4px' }} />
            <div style={{ width: '40px', height: '8px', background: '#E8927F', marginBottom: '4px', marginLeft: '20px' }} />
            <div style={{ width: '20px', height: '8px', background: '#F2C4BB', marginLeft: '40px' }} />
          </div>
        </div>
      </section>

      {/* ── 2. PHOTO STRIP ───────────────────────────────────────────────────── */}
      <section aria-label="Photo archive strip">
        <ContactSheet images={heroFrames} columns={3} className="w-full" />
      </section>

      {/* ── 3. PILLARS ───────────────────────────────────────────────────────── */}
      <section id="pillars" style={{ background: '#2E2E2E' }}>
        {/* 4-color bar */}
        <div className="flex" style={{ height: '8px' }}>
          <div className="flex-1" style={{ background: '#2A9D9D' }} />
          <div className="flex-1" style={{ background: '#D9685A' }} />
          <div className="flex-1" style={{ background: '#1A7070' }} />
          <div className="flex-1" style={{ background: '#E8927F' }} />
        </div>

        <div className="max-w-site mx-auto px-5 md:px-10 py-24">
          <ScanReveal>
            <div className="grid md:grid-cols-2 gap-8 mb-16">
              <div>
                <span
                  className="font-display block mb-3"
                  style={{ color: '#7DC8C8', fontSize: '0.75rem', letterSpacing: '0.25em' }}
                >
                  THE HOUSE
                </span>
                <h2 className="font-display text-white" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
                  Four Pillars
                </h2>
              </div>
              <div className="flex items-center">
                <p className="font-sans leading-relaxed" style={{ color: '#AAA', fontWeight: 300, fontSize: '0.95rem' }}>
                  Everything we do lives inside four disciplines.
                  Each one slow, intentional, and analog-first.
                </p>
              </div>
            </div>
          </ScanReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {pillars.map(({ name, headline, text, href }, i) => (
              <ScanReveal key={name} delay={i * 80}>
                <Link
                  href={href}
                  className={`pillar-card ${i % 2 === 0 ? 'pillar-odd' : 'pillar-even'} block p-7 h-full`}
                  style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <p
                    className="font-display text-white uppercase mb-4"
                    style={{ fontSize: '1.4rem', letterSpacing: '0.05em' }}
                  >
                    {name}
                  </p>
                  <h3
                    className="font-serif italic mb-4"
                    style={{ color: 'white', fontSize: '1rem', lineHeight: 1.5 }}
                  >
                    {headline}
                  </h3>
                  <p
                    className="font-sans text-sm leading-relaxed mb-6"
                    style={{ color: '#AAA', fontWeight: 300 }}
                  >
                    {text}
                  </p>
                  <span
                    className="pillar-read font-sans text-xs tracking-[0.15em] uppercase transition-colors duration-200"
                    style={{ color: '#AAA' }}
                  >
                    Read →
                  </span>
                </Link>
              </ScanReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Vice strip */}
      <div className="vice-strip" />

      {/* ── 4. SOUND STRIP ───────────────────────────────────────────────────── */}
      <section style={{ background: '#0D0D0D' }}>
        <div className="max-w-site mx-auto px-5 md:px-10 py-20">
          <ScanReveal>
            <div className="grid md:grid-cols-[1fr_auto] gap-12 items-center">
              <div>
                <p
                  className="font-display mb-6"
                  style={{
                    color:         '#FF3C8E',
                    fontSize:      '0.75rem',
                    letterSpacing: '0.3em',
                    textShadow:    '0 0 8px rgba(255,60,142,0.25)',
                  }}
                >
                  NOW PLAYING
                </p>
                <h2
                  className="font-display text-white mb-4"
                  style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)' }}
                >
                  The signal is always on.
                </h2>
                <p
                  className="font-sans text-sm leading-relaxed mb-10 max-w-xl"
                  style={{ color: '#777', fontWeight: 300 }}
                >
                  Curated mixes, live sessions, and field recordings.
                  Music the way it was meant to be heard — in sequence, without shuffle.
                </p>
                <Link href="/radio" className="btn-hollow-coral group">
                  Enter the archive
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </Link>
              </div>

              {/* Episode card — coming soon */}
              <div
                className="hidden md:block w-72 p-8"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <p
                  className="font-mono mb-3"
                  style={{ color: 'rgba(255,60,142,0.4)', fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}
                >
                  Coming Soon
                </p>
                <p className="font-display text-white text-lg mb-2">Onda Tropical Vol. 1</p>
                <p className="font-sans text-xs leading-relaxed" style={{ color: '#555' }}>
                  First episode dropping soon.
                </p>
              </div>
            </div>
          </ScanReveal>
        </div>

        {/* Bottom gradient line */}
        <div
          className="h-px opacity-40"
          style={{ background: 'linear-gradient(to right, #FF3C8E, #00D4FF, #FF3C8E)' }}
        />
      </section>

      {/* ── 5. MANIFESTO ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-32" style={{ background: '#0D0D0D' }}>
        {/* Ambient radial glows */}
        <div
          className="absolute pointer-events-none"
          aria-hidden="true"
          style={{
            bottom: '-10%', left: '-10%',
            width: '50vw', height: '50vw',
            background: 'radial-gradient(ellipse, rgba(255,60,142,0.08) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute pointer-events-none"
          aria-hidden="true"
          style={{
            top: '-10%', right: '-10%',
            width: '50vw', height: '50vw',
            background: 'radial-gradient(ellipse, rgba(0,212,255,0.06) 0%, transparent 70%)',
          }}
        />

        {/* Film grain overlay */}
        <div className="grain-overlay" aria-hidden="true" />

        {/* Bauhaus circles — top-right decorative */}
        <div
          className="absolute pointer-events-none"
          aria-hidden="true"
          style={{ top: '5%', right: '-5%' }}
        >
          <div
            style={{
              width:        '28vw',
              height:       '28vw',
              border:       '1px solid rgba(0,212,255,0.15)',
              boxShadow:    '0 0 20px rgba(0,212,255,0.05)',
              borderRadius: '50%',
              position:     'relative',
            }}
          >
            <div
              style={{
                position:     'absolute',
                top:          '20%',
                left:         '20%',
                width:        '18vw',
                height:       '18vw',
                border:       '1px solid rgba(255,179,71,0.15)',
                boxShadow:    '0 0 15px rgba(255,179,71,0.05)',
                borderRadius: '50%',
              }}
            />
          </div>
        </div>

        <div className="max-w-site mx-auto px-5 md:px-10 relative z-10">
          <ScanReveal>
            <span
              className="font-sans block mb-10"
              style={{ color: '#5ABFBF', fontSize: '0.7rem', letterSpacing: '0.3em', textTransform: 'uppercase' }}
            >
              Manifesto
            </span>

            <div className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr] gap-16">
              {/* Left col — blockquote */}
              <div>
                <blockquote
                  className="font-display uppercase"
                  style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', color: 'white', lineHeight: 1.1 }}
                >
                  The analog world is not nostalgic.
                  <br />It is{' '}
                  <span
                    style={{
                      color:      '#FFB347',
                      textShadow: '0 0 10px rgba(255,179,71,0.3)',
                    }}
                  >
                    INEVITABLE.
                  </span>
                </blockquote>
              </div>

              {/* Right col — body + attribution */}
              <div className="flex flex-col justify-center">
                <p
                  className="font-sans mb-8"
                  style={{ color: '#777', fontWeight: 300, fontSize: '0.9rem', lineHeight: 1.7 }}
                >
                  We are not chasing the past. We are building a present that is slower, more considered, and built to last.
                  Every object, every mix, every essay is a wager against disposability.
                </p>
                <cite
                  className="font-display not-italic block"
                  style={{
                    fontSize:      '0.9rem',
                    color:         '#00D4FF',
                    letterSpacing: '0.2em',
                    textShadow:    '0 0 8px rgba(0,212,255,0.4)',
                  }}
                >
                  — Buena Onda, Miami, 2014
                </cite>
              </div>
            </div>
          </ScanReveal>
        </div>
      </section>

      {/* ── 7. TRANSMISSION ──────────────────────────────────────────────────── */}
      <section className="relative" style={{ background: '#161416' }}>
        {/* Top gradient border */}
        <div
          className="h-px opacity-30"
          style={{ background: 'linear-gradient(to right, #FF3C8E, #00D4FF)' }}
        />

        <div className="max-w-site mx-auto px-5 md:px-10 py-24">
          <ScanReveal>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
              {/* Left col */}
              <div>
                <span
                  className="font-display block mb-4"
                  style={{
                    color:         '#FF3C8E',
                    fontSize:      '0.75rem',
                    letterSpacing: '0.3em',
                    textShadow:    '0 0 8px rgba(255,60,142,0.25)',
                  }}
                >
                  STAY CLOSE
                </span>
                <h2
                  className="font-display text-white uppercase mb-4"
                  style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)' }}
                >
                  Slow mail. Good content.
                </h2>
                <p className="font-sans text-sm" style={{ color: '#777', fontWeight: 300 }}>
                  No algorithms. Just culture, drops, and what&apos;s playing in the house.
                </p>
              </div>

              {/* Right col — form */}
              <div className="border-l border-white/5 pl-8 md:pl-16 flex flex-col justify-center">
                <NewsletterForm layout="stack" variant="dark" />
              </div>
            </div>
          </ScanReveal>
        </div>
      </section>
    </>
  )
}
