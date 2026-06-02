import type { Metadata } from 'next'
import ScanReveal from '@/components/ui/ScanReveal'

export const metadata: Metadata = {
  title: 'Live Events',
  description: 'Live events from Buena Onda.',
}

const events = [
  {
    title: 'Onda Tropical',
    venue: 'Cervecería La Tropical, Miami',
    tags: 'Latin · Afro-Caribbean · Dance',
    body:
      "A curated night of Latin American, Caribbean, and Afro-rooted dance music. DJ Kumi and Tostao. Buena Onda's warm-weather format.",
  },
  {
    title: 'Open Decks',
    venue: 'Miami',
    tags: 'Synth · Italo · 80s Electronic',
    body:
      'Participatory music culture. Rotating DJs, community-driven format. The recurring heartbeat of the Sound pillar.',
  },
]

export default function EventsPage() {
  return (
    <>
      <div className="pt-32 pb-16 bg-warm-white">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <ScanReveal>
            <span className="section-label">Sound · Space</span>
            <h1
              className="font-display text-near-black mt-2 max-w-[12ch] text-balance"
              style={{ fontSize: 'clamp(2.5rem, 7vw, 5rem)' }}
            >
              Live Events
            </h1>
            <p className="text-stone-grey text-sm mt-4 max-w-prose leading-relaxed">
              The floor is the archive.
            </p>
          </ScanReveal>
        </div>
      </div>

      <section className="py-20 bg-cream">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <div className="grid md:grid-cols-2 gap-8">
            {events.map((event, i) => (
              <ScanReveal key={event.title} delay={i * 120}>
                <article className="paper-hover bg-warm-white p-7 h-full border border-pale-stone/60">
                  <p className="archive-label text-[0.6rem] mb-4 text-teal">
                    {event.venue}
                  </p>
                  <h2 className="font-display text-near-black text-3xl mb-3">
                    {event.title}
                  </h2>
                  <p className="font-mono text-xs text-rose-magenta mb-6">
                    {event.tags}
                  </p>
                  <p className="text-charcoal text-sm leading-relaxed">
                    {event.body}
                  </p>
                  <div className="editorial-rule mt-8 mb-4" />
                  <p className="archive-label text-[0.58rem]">
                    A Buena Onda Experience · Recurring
                  </p>
                </article>
              </ScanReveal>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
