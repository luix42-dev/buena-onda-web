import type { Metadata } from 'next'
import ScanReveal from '@/components/ui/ScanReveal'
import PullQuote from '@/components/ui/PullQuote'
import TimelineAccordion from '@/components/ui/TimelineAccordion'
import type { TimelineItem } from '@/components/ui/TimelineAccordion'

export const metadata: Metadata = {
  title: 'About',
  description:
    'Buena Onda is an analog culture house rooted in Miami. This is our story.',
}

const timelineItems: TimelineItem[] = [
  {
    year:    'PRE-2014',
    title:   'The Signal',
    summary: 'Vice City, the 1980s obsession, the frequency that started it all.',
    story:   `It started with Grand Theft Auto: Vice City. That game broke something open in me: the pastel buildings, the FM stations bleeding from car windows, the way everything felt like it was happening at golden hour. I didn't know what to call it yet. I just knew it was the world I wanted to live in. And it was set in Miami, of all places.\n\nFrom that moment, the 1980s became a frequency I'd tuned into and couldn't leave. Miami Vice. Vintage. The weight of things made to last.\n\nI was in Venezuela then, with no idea where the thread was leading.`,
    photo:   null,
  },
  {
    year:    '2014',
    title:   'Founded: Caracas to New York',
    summary: 'A personal practice in analog culture became something with a name.',
    story:   `In 2014 I started Buena Onda. I was a graphic designer in Venezuela: making tote bags, sewing pouches, printing shirts. Small things. But they were mine.\n\nThen I moved to the U.S. New York first. The brand paused in 2016 while I found my footing, but the frequency never went quiet.`,
    photo:   null,
  },
  {
    year:    '2017',
    title:   'Miami',
    summary: 'Miami was always the destination. Almost ten years now.',
    story:   `In 2017 I moved to Miami: the city the thread had always been pointing toward. Almost ten years here now.`,
    photo:   null,
  },
  {
    year:    '2018',
    title:   'The B Group',
    summary: 'Miami confirmed everything. First t-shirt capsule drops.',
    story:   `Miami confirmed what the game had been telling me. This city holds the 1980s in its bones: in the architecture, in the people, in the record stores and estate sales in Coral Gables. I kept going deeper. Curating. Learning what made something worth keeping.\n\nLaunched my first t-shirt capsule that year: The B Group.`,
    photo:   null,
  },
  {
    year:    '2019',
    title:   'Jolt Radio',
    summary: 'Found a home at Jolt Radio. It fit.',
    story:   `Jolt Radio was the best find I'd made in Miami. Met John and Pedro Caignet and clicked immediately over our shared pull toward the 1980s and analog culture.\n\nThat same year I started DJing. 80s Club was already moving with Oswave releasing episodes on SoundCloud, and I stepped into that world.`,
    photo:   null,
  },
  {
    year:    '2020',
    title:   'The Active Year',
    summary: 'Joined forces with Estefania Blanco. Merch, markets, and an 80s content machine.',
    story:   `Joined forces with my best friend Estefania Blanco and built an 80s content machine together. Started releasing my own merch and doing vintage markets with the Love Tempo crew.\n\nThe reach opened doors: Glitterwave, Neonblonde86, TurnBackTheBlockToThe80s, Adriane Avery, Veronicawheels. Met my good friend Jason Ho, who made the best ad Buena Onda has had.\n\nStarted #NeonHuntMiami that year too.`,
    photo:   null,
  },
  {
    year:    '2022',
    title:   'Open Decks',
    summary: 'Opened the store at Jolt Radio. Launched Open Decks.',
    story:   `Opened my store at Jolt Radio and launched Open Decks: a project that the Miami community made their own.`,
    photo:   null,
  },
  {
    year:    '2025',
    title:   'Onda Tropical',
    summary: 'A new event format. Latin American, Caribbean, and Afro-rooted dance music.',
    story:   `Launched Onda Tropical: a seasonal event format rooted in Latin American, Caribbean, and Afro-rooted dance music. The house expanded.`,
    photo:   null,
  },
  {
    year:    '2026',
    title:   'The Relaunch',
    summary: 'Buena Onda becomes an analog culture house.',
    story:   `The relaunch. Call it a content creator era — I've come around on the phrase. Buena Onda is an analog culture house: the declaration, and everything before this was the proof.`,
    photo:   null,
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
              An analog culture house.
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
                  One question shapes the work: does this reward attention over time?
                </p>
                <p>
                  We make things for the physical room where culture happens.
                </p>
                <p>
                  The practice is slow, the objects are heavy, and the mixes run long.
                </p>
              </div>
            </ScanReveal>

            <ScanReveal delay={150}>
              <PullQuote>
                Culture lives in objects: the weight of a record,
                the grain of aged leather, a room that smells like cedar and old vinyl.
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

          <TimelineAccordion items={timelineItems} />
        </div>
      </section>

      {/* ── The World We Found ─────────────────────────────────────────── */}
      <section className="py-24 bg-cream">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <ScanReveal>
            <span className="section-label mb-12 block">The World We Found</span>
          </ScanReveal>

          <div className="grid md:grid-cols-2 gap-16">
            <ScanReveal>
              <div className="prose-brand">
                <p>
                  Along the way I found a community I hadn&apos;t planned for.
                  Julian from Cold Heart, Neontalk, Conceptalk, Poolsuite.
                  Tamara from Contrabando. Macky Mack from Summer Breeze. Jolt Radio.
                  People scattered across cities, all pulling the same direction.
                  Some of them lived the &apos;80s. Adrian Avery is one.
                  Others, like me, arrived late and came in through a side door.
                </p>
                <p>
                  Stranger Things helped, honestly. The thing we&apos;d been carrying in private suddenly had an audience.
                  We were ahead of something. That felt good.
                </p>
              </div>
            </ScanReveal>

            <ScanReveal delay={150}>
              <div className="prose-brand">
                <p>
                  My taste hasn&apos;t moved in fifteen years.
                  I can stretch to the &apos;70s, where the &apos;80s got its bones.
                  I push a little into the &apos;90s. That&apos;s the range.
                  Everything I do with Buena Onda comes from inside those coordinates.
                </p>
                <p>
                  I&apos;m carrying what was deliberate about that era into the present: the quality, the intention, the craft.
                  When I see a piece tagged &quot;Made in USA&quot; from 1984, I know what it means.
                  Someone thought about it. Someone built it to last.
                </p>
              </div>
            </ScanReveal>
          </div>
        </div>
      </section>

      {/* ── Values ─────────────────────────────────────────────────────── */}
      <section className="py-24 bg-warm-white">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <ScanReveal>
            <span className="section-label mb-10 block">What We Stand For</span>
          </ScanReveal>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Analog First',
                body:  'Physical before digital. Leave it behind if it needs Wi-Fi.',
              },
              {
                title: 'Durable Objects',
                body:  'We release things we\'d keep for decades. Trend objects aren\'t in the catalog.',
              },
              {
                title: 'Music as Culture',
                body:  'Sound is how every community we care about got built. Buena Onda started as a music practice.',
              },
            ].map(({ title, body }, i) => (
              <ScanReveal key={title} delay={i * 100}>
                <div className="paper-hover bg-cream p-7 h-full">
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
