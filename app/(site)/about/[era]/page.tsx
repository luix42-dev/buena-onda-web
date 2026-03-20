import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { timelineItems } from '@/lib/timeline'
import ContactSheet from '@/components/ui/ContactSheet'
import ScanReveal from '@/components/ui/ScanReveal'

interface Props {
  params: Promise<{ era: string }>
}

export async function generateStaticParams() {
  return timelineItems.map(item => ({ era: item.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { era } = await params
  const item = timelineItems.find(t => t.slug === era)
  if (!item) return {}
  return {
    title:       `${item.year} — ${item.title} | Buena Onda`,
    description: item.summary,
  }
}

function StoryText({ text }: { text: string }) {
  return (
    <>
      {text.trim().split('\n\n').map((para, i) => (
        <p key={i} className="mb-6 last:mb-0">
          {para.split('\n').map((line, j, arr) => (
            <span key={j}>
              {line}
              {j < arr.length - 1 && <br />}
            </span>
          ))}
        </p>
      ))}
    </>
  )
}

export default async function EraPage({ params }: Props) {
  const { era } = await params
  const idx  = timelineItems.findIndex(t => t.slug === era)
  if (idx === -1) notFound()

  const item = timelineItems[idx]
  const prev = timelineItems[idx - 1] ?? null
  const next = timelineItems[idx + 1] ?? null

  // Pull first sentence as a pull quote
  const firstSentence = item.story.split(/(?<=[.!?])\s+/)[0] ?? ''

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section
        className="relative min-h-[60vh] flex items-end overflow-hidden"
        style={{ background: '#0D0D0D' }}
      >
        {/* Teal left accent bar */}
        <div
          className="absolute left-0 top-0 bottom-0 z-10"
          style={{ width: '5px', background: '#2A9D9D' }}
          aria-hidden="true"
        />

        {/* Hero photo */}
        {item.photo && (
          <>
            <Image
              src={item.photo}
              alt={item.title}
              fill
              className="object-cover"
              priority
            />
            {/* Dark scrim */}
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to top, rgba(13,13,13,0.92) 0%, rgba(13,13,13,0.4) 60%, transparent 100%)' }}
            />
          </>
        )}

        {/* Film grain */}
        <div className="grain-overlay absolute inset-0" aria-hidden="true" />

        {/* Content */}
        <div className="relative z-10 w-full max-w-site mx-auto px-10 md:px-20 pb-16 pt-40">
          <ScanReveal>
            {/* Back link */}
            <Link
              href="/about"
              className="font-mono text-[0.6rem] tracking-[0.25em] uppercase mb-8 block transition-colors duration-150"
              style={{ color: '#2A9D9D' }}
            >
              ← Timeline
            </Link>

            {/* Year — poster scale */}
            <p
              className="font-display leading-none mb-2"
              style={{
                fontSize:      'clamp(5rem, 18vw, 14rem)',
                color:         item.photo ? 'rgba(255,255,255,0.08)' : 'rgba(42,157,157,0.12)',
                letterSpacing: '-0.02em',
                lineHeight:    1,
                userSelect:    'none',
              }}
              aria-hidden="true"
            >
              {item.year}
            </p>

            {/* Title */}
            <h1
              className="font-display text-white uppercase mt-4"
              style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', letterSpacing: '0.02em' }}
            >
              {item.title}
            </h1>

            {/* Summary */}
            <p
              className="font-sans mt-3 max-w-xl"
              style={{ color: '#777', fontSize: '0.9rem', lineHeight: 1.6 }}
            >
              {item.summary}
            </p>
          </ScanReveal>
        </div>
      </section>

      {/* Vice strip */}
      <div className="vice-strip" />

      {/* ── STORY ────────────────────────────────────────────────────────── */}
      <section className="py-24 bg-cream">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <div className="grid md:grid-cols-[1fr_340px] gap-16 items-start">

            {/* Story text */}
            <ScanReveal>
              <div
                className="prose-brand"
                style={{ fontSize: '1.05rem', lineHeight: 1.8 }}
              >
                <StoryText text={item.story} />
              </div>
            </ScanReveal>

            {/* Pull quote — sidebar */}
            <ScanReveal delay={120}>
              <div
                className="md:sticky"
                style={{ top: '6rem' }}
              >
                <div
                  className="border-l-2 pl-6 py-2"
                  style={{ borderColor: '#D4547A' }}
                >
                  <p
                    className="font-serif italic"
                    style={{ color: '#2E2E2E', fontSize: '1.1rem', lineHeight: 1.6 }}
                  >
                    &ldquo;{firstSentence}&rdquo;
                  </p>
                </div>
                <p
                  className="font-mono mt-6"
                  style={{ color: '#AAA', fontSize: '0.6rem', letterSpacing: '0.25em', textTransform: 'uppercase' }}
                >
                  Buena Onda · {item.year}
                </p>
              </div>
            </ScanReveal>
          </div>
        </div>
      </section>

      {/* ── CONTACT SHEET ────────────────────────────────────────────────── */}
      {item.photos.length > 0 && (
        <section className="py-16" style={{ background: '#111' }}>
          <div className="max-w-site mx-auto px-5 md:px-10">
            <ScanReveal>
              <p
                className="font-mono mb-8"
                style={{ color: '#2A9D9D', fontSize: '0.6rem', letterSpacing: '0.3em', textTransform: 'uppercase' }}
              >
                From the archive
              </p>
            </ScanReveal>
            <ContactSheet
              images={item.photos.map((src, i) => ({
                src,
                alt:   `${item.title} — ${i + 1}`,
                frame: String(i + 1).padStart(2, '0') + 'A',
                date:  item.year,
              }))}
              columns={Math.min(item.photos.length, 4)}
            />
          </div>
        </section>
      )}

      {/* ── ERA NAVIGATION ───────────────────────────────────────────────── */}
      <section className="py-16 bg-warm-white border-t border-pale-stone">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <div className="flex items-center justify-between gap-8">
            {prev ? (
              <Link
                href={`/about/${prev.slug}`}
                className="group flex flex-col gap-1"
              >
                <span
                  className="font-mono text-[0.55rem] tracking-[0.2em] uppercase transition-colors duration-150"
                  style={{ color: '#AAA' }}
                >
                  ← Previous
                </span>
                <span
                  className="font-display text-lg uppercase group-hover:text-teal transition-colors duration-150"
                  style={{ color: '#2E2E2E' }}
                >
                  {prev.year} — {prev.title}
                </span>
              </Link>
            ) : <div />}

            {next ? (
              <Link
                href={`/about/${next.slug}`}
                className="group flex flex-col gap-1 text-right"
              >
                <span
                  className="font-mono text-[0.55rem] tracking-[0.2em] uppercase transition-colors duration-150"
                  style={{ color: '#AAA' }}
                >
                  Next →
                </span>
                <span
                  className="font-display text-lg uppercase group-hover:text-teal transition-colors duration-150"
                  style={{ color: '#2E2E2E' }}
                >
                  {next.year} — {next.title}
                </span>
              </Link>
            ) : <div />}
          </div>
        </div>
      </section>
    </>
  )
}
