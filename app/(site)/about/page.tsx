import type { Metadata } from 'next'
import ScanReveal from '@/components/ui/ScanReveal'
import PullQuote from '@/components/ui/PullQuote'
import ContactSheet from '@/components/ui/ContactSheet'

export const metadata: Metadata = {
  title: 'About',
  description:
    'Buena Onda is an analog culture house rooted in Miami. This is our story.',
}

const timeline = [
  {
    year:  '2014',
    title: 'The First Session',
    body:  'A borrowed turntable, a Brickell rooftop, twelve friends. What started as a Sunday ritual became a community before anyone gave it a name.',
  },
  {
    year:  '2021',
    title: 'Radio Begins',
    body:  'Episode 001 — recorded live on a Marantz PMD and posted with zero promotion. Three thousand listens in the first week told us what we needed to know.',
  },
  {
    year:  '2022',
    title: 'First Object Drop',
    body:  'A waxed-canvas field bag. Forty units. Sold in nine hours. We realized that the people who love the sound also want to hold something.',
  },
  {
    year:  '2023',
    title: 'The House Grows',
    body:  'Pop-ups in Wynwood, Coral Gables, and New York. The idea scales when the intent stays clear.',
  },
  {
    year:  '2024',
    title: 'Still Here',
    body:  'Five years in. Nothing has changed. Everything has deepened.',
  },
]

const teamFrames = Array.from({ length: 6 }, (_, i) => ({
  src:     '',
  alt:     `Team — frame ${i + 1}`,
  frame:   `T${String(i + 1).padStart(2, '0')}`,
  caption: ['Founder', 'Sound Director', 'Creative', 'Objects', 'Radio', 'Archive'][i],
}))

export default function AboutPage() {
  return (
    <>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="pt-32 pb-16 bg-sand-bg">
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
                  Buena Onda is an analog culture house rooted in Miami. We exist
                  at the intersection of music, material craft, and intentional living.
                </p>
                <p>
                  We don&apos;t make things for the algorithm. We make things for the
                  room — the physical, felt, alive room where culture actually happens.
                </p>
                <p>
                  Our practice is slow. Our objects are heavy. Our mixes run long.
                  That&apos;s the point.
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
      <section className="py-24 bg-sand-bg">
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
                      <span className="font-mono text-xs tracking-wider text-warm-sand">
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

      {/* ── Team Contact Sheet ─────────────────────────────────────────── */}
      <section className="py-24 bg-near-black">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <ScanReveal>
            <span className="section-label text-stone-grey mb-8 block">The People</span>
          </ScanReveal>
          <ContactSheet images={teamFrames} columns={6} />
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
                <div className="paper-hover bg-sand-bg p-7 h-full">
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
