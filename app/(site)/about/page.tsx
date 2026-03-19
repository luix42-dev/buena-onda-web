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
    story:   `It started with Grand Theft Auto: Vice City. That game broke something open in me — the pastel buildings, the FM stations bleeding from car windows, the way everything felt like it was happening at golden hour. I didn't know what to call it yet. I just knew it was the world I wanted to live in. And it was set in Miami, of all places.\n\nFrom that moment, the 1980s became an obsession. Not a nostalgia trip — I was too young for nostalgia. More like a frequency I'd accidentally tuned into and couldn't get off. Miami Vice. Vintage. The weight of things that were actually made to last.\n\nI was in Venezuela then, with no idea the thread was already leading somewhere specific.`,
    photo:   null,
  },
  {
    year:    '2014',
    title:   'Founded — Caracas to New York',
    summary: 'What started as a personal practice in analog culture became something with a name.',
    story:   `In 2014 I started Buena Onda. I was a graphic designer in Venezuela — making tote bags, sewing pouches, printing shirts. Small things. But they were mine.\n\nThen I moved to the U.S. New York first. The brand paused for a bit in 2016 while I found my footing, but the frequency never went quiet.`,
    photo:   null,
  },
  {
    year:    '2017',
    title:   'Miami',
    summary: 'Destiny brought me here. Almost ten years now.',
    story:   `In 2017 I moved to Miami — because that's where the thread was always leading. Almost ten years here now.`,
    photo:   null,
  },
  {
    year:    '2018',
    title:   'The B Group',
    summary: 'Miami confirmed everything. First t-shirt capsule drops.',
    story:   `Miami confirmed what the game had been telling me. This city holds the 1980s in its bones — in the architecture, in the people, in the record stores and the estate sales in Coral Gables. I kept going deeper. Curating. Learning what made something worth keeping.\n\nAlso launched my first ever t-shirt capsule: The B Group.`,
    photo:   null,
  },
  {
    year:    '2019',
    title:   'Jolt Radio',
    summary: 'Found a home at Jolt Radio. Full circle.',
    story:   `My greatest Miami find — like coming home. Met John and Pedro Caignet at Jolt Radio and we really clicked over our shared love of the 1980s and analog culture. A full circle moment.\n\nAlso started my DJ journey. 80s Club was already moving with Oswave releasing episodes on SoundCloud, and I stepped into that world.`,
    photo:   null,
  },
  {
    year:    '2020',
    title:   'The Active Year',
    summary: 'Joined forces with Estefania Blanco. Merch, markets, and an 80s content machine.',
    story:   `My most active year. Joined forces with my best friend Estefania Blanco and we created an 80s content machine together. Started releasing my own merch and doing vintage markets with the Love Tempo crew — forever grateful for that.\n\nThe reach brought me to so many people: Glitterwave, Neonblonde86, TurnBackTheBlockToThe80s, Adriane Avery, Veronicawheels. Got to meet my good friend Jason Ho, who produced the best ad Buena Onda has ever had.\n\nAlso started #NeonHuntMiami.`,
    photo:   null,
  },
  {
    year:    '2022',
    title:   'Open Decks',
    summary: 'Opened the store at Jolt Radio. Launched Open Decks.',
    story:   `Opened my store at Jolt Radio and launched Open Decks — which evolved into an incredible project that still resonates with the real Miami community.`,
    photo:   null,
  },
  {
    year:    '2025',
    title:   'Onda Tropical',
    summary: 'A new event format. Latin American, Caribbean, and Afro-rooted dance music.',
    story:   `Onda Tropical — a seasonal event format rooted in Latin American, Caribbean, and Afro-rooted dance music. A different frequency, same worldview.`,
    photo:   null,
  },
  {
    year:    '2026',
    title:   'The Relaunch',
    summary: 'Buena Onda is officially declared an analog culture house.',
    story:   `This is the relaunch. My content creator era, as much as I resist that phrase. And I'm making it official: Buena Onda is an analog culture house. That's the statement. That's what it's always been building toward.\n\nIf you're here, you already know why.`,
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
                  What I found along the way was a community I didn&apos;t expect.
                  Julian from Cold Heart, Neontalk, Conceptalk, Poolsuite.
                  Tamara from Contrabando. Macky Mack from Summer Breeze. Jolt Radio.
                  People scattered across different cities who were all pulling in the same direction.
                  Some of them actually lived the &apos;80s — Adrian Avery is living proof.
                  Others, like me, arrived late and came in through a side door.
                  It didn&apos;t matter. The feeling was the same.
                </p>
                <p>
                  Stranger Things helped, honestly. Suddenly the thing we&apos;d been carrying in private had an audience.
                  We weren&apos;t just collectors and obsessives — we were ahead of a wave.
                </p>
              </div>
            </ScanReveal>

            <ScanReveal delay={150}>
              <div className="prose-brand">
                <p>
                  My taste hasn&apos;t moved in fifteen years.
                  I can stretch to the &apos;70s — that&apos;s where the &apos;80s got its bones.
                  I can push a little into the &apos;90s. But that&apos;s the range.
                  Everything I do with Buena Onda comes from inside those coordinates.
                </p>
                <p>
                  But here&apos;s what this is not: a reenactment.
                  I&apos;m not trying to live in the &apos;80s.
                  I&apos;m trying to bring what was real and deliberate about that era into the present — the quality, the intention, the craft.
                  When I see a piece tagged &quot;Made in USA&quot; from 1984, I know what that means.
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
                body:  'Physical before digital. If it only works with Wi-Fi, it\'s not for us.',
              },
              {
                title: 'Durable Objects',
                body:  'We only release things we would keep forever. If it needs a trend to exist, it shouldn\'t exist.',
              },
              {
                title: 'Music as Culture',
                body:  'Sound is not content. Every community we admire was built around it.',
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
