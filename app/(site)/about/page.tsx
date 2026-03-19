import type { Metadata } from 'next'
import ScanReveal from '@/components/ui/ScanReveal'
import PullQuote from '@/components/ui/PullQuote'

export const metadata: Metadata = {
  title: 'About',
  description:
    'Buena Onda is an analog culture house rooted in Miami. This is our story.',
}

const timeline = [
  {
    year:  '2014',
    title: 'Founded in Miami',
    body:  'What started as a personal practice in music curation and analog culture became something with a name.',
  },
  {
    year:  '2017',
    title: 'First Open Decks',
    body:  'A turntable, a room, and an open invitation. Participatory music culture, not a DJ showcase.',
  },
  {
    year:  '2019',
    title: 'Onda Tropical at Cerveceria La Tropical',
    body:  'Latin American, Caribbean, and Afro-rooted dance music at one of Miami\'s landmark venues.',
  },
  {
    year:  '2021',
    title: '80s Club on Jolt Radio',
    body:  'A monthly show dedicated to the sounds of 1980s global pop, synth, and electronic music.',
  },
  {
    year:  '2026',
    title: 'The Catalog Opens',
    body:  'Buena Onda begins curating and selling objects, furniture, garments, and vinyl through a new digital home.',
  },
]

export default function AboutPage() {
  return (
    <>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="pt-32 pb-16 bg-warm-white">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <ScanReveal>
            <span className="section-label">About</span>
            <h1
              className="font-display text-near-black mt-2 max-w-[14ch] text-balance"
              style={{ fontSize: 'clamp(2.5rem, 7vw, 5rem)' }}
            >
              We are not a brand.
            </h1>
          </ScanReveal>
        </div>
      </div>

      {/* ── Opening Statement ──────────────────────────────────────────── */}
      <section className="py-20 bg-cream">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <div className="grid md:grid-cols-2 gap-16">
            <ScanReveal>
              <div className="prose-brand">
                <p>
                  Buena Onda is an analog culture house rooted in Miami.
                  We curate objects, music, and cultural events through a single lens: does this reward attention over time?
                </p>
                <p>
                  We don&apos;t make things for the algorithm. We make things for the
                  room — the physical, present room where culture actually happens.
                </p>
                <p>
                  Our practice is slow. Our objects are heavy. Our mixes run long.
                </p>
              </div>
            </ScanReveal>

            <ScanReveal delay={150}>
              <PullQuote>
                Culture lives in objects. In the weight of a record,
                the grain of aged leather, the warmth of a room.
              </PullQuote>
            </ScanReveal>
          </div>
        </div>
      </section>

      {/* ── Timeline ───────────────────────────────────────────────────── */}
      <section className="py-24 bg-warm-white">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <ScanReveal>
            <span className="section-label mb-12 block">Timeline</span>
          </ScanReveal>

          <div className="relative">
            {/* Vertical rule */}
            <div className="absolute left-[4.5rem] top-0 bottom-0 w-px bg-pale-stone hidden md:block" />

            <div className="flex flex-col gap-12">
              {timeline.map(({ year, title, body }, i) => (
                <ScanReveal key={year} delay={i * 80}>
                  <div className="flex flex-col md:flex-row gap-4 md:gap-12">
                    <div className="flex-shrink-0 w-full md:w-[4.5rem] pt-0.5">
                      <span className="font-mono text-xs tracking-wider text-teal">
                        {year}
                      </span>
                    </div>
                    <div className="md:pl-8">
                      <h3 className="font-display text-near-black text-xl mb-2">{title}</h3>
                      <p className="text-charcoal text-sm leading-relaxed max-w-prose">{body}</p>
                    </div>
                  </div>
                </ScanReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Values ─────────────────────────────────────────────────────── */}
      <section className="py-24 bg-cream">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <ScanReveal>
            <span className="section-label mb-10 block">What We Stand For</span>
          </ScanReveal>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Analog First',
                body:  'Physical before digital. Always. If it doesn\'t survive without a screen, we don\'t build it.',
              },
              {
                title: 'Durable Objects',
                body:  'We only release things we would keep forever. If it needs a trend to exist, it shouldn\'t exist.',
              },
              {
                title: 'Music as Culture',
                body:  'Sound is not content. It\'s the connective tissue of every community we admire.',
              },
            ].map(({ title, body }, i) => (
              <ScanReveal key={title} delay={i * 100}>
                <div className="paper-hover bg-warm-white p-7 h-full">
                  <p className="archive-label text-[0.6rem] mb-4">
                    {String(i + 1).padStart(2, '0')}
                  </p>
                  <h3 className="font-display text-near-black text-xl mb-3">{title}</h3>
                  <p className="text-charcoal text-sm leading-relaxed">{body}</p>
                </div>
              </ScanReveal>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
