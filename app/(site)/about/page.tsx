import type { Metadata } from 'next'
import ScanReveal from '@/components/ui/ScanReveal'
import TimelineAccordion from '@/components/ui/TimelineAccordion'
import { createClient } from '@/lib/supabase/server'
import { timelineItems as fallback } from '@/lib/timeline'
import type { TimelineItem } from '@/lib/timeline'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'About',
  description:
    'Buena Onda is an analog culture house rooted in Miami. This is our story.',
}

const TIMELINE_QUERY_TIMEOUT_MS = 2500

async function withTimeout<T>(promise: PromiseLike<T>): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('Timeline query timed out')), TIMELINE_QUERY_TIMEOUT_MS)
    }),
  ])
}

async function getTimeline(): Promise<TimelineItem[]> {
  try {
    const supabase = await createClient()
    const { data } = await withTimeout(supabase.from('timeline').select('*').order('sort_order'))
    if (data?.length) return data as TimelineItem[]
  } catch {
    // Fall back to the checked-in canonical timeline.
  }
  return fallback
}

export default async function AboutPage() {
  const timelineItems = await getTimeline()

  return (
    <>
      {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

      {/* â”€â”€ Opening Statement â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
              <div
                className="p-7 md:p-8"
                style={{
                  padding: '2rem 1.75rem',
                  borderLeftWidth: '3px',
                  borderLeftStyle: 'solid',
                  borderLeftColor: '#1A9E9E',
                  borderRadius: '2px',
                }}
              >
                <p className="font-serif italic text-charcoal leading-relaxed" style={{ fontSize: 'clamp(1.15rem, 2vw, 1.45rem)' }}>
                  Culture lives in objects: the weight of a record,
                  the grain of aged leather, a room that smells like cedar and old vinyl.
                </p>
                <p className="font-serif italic text-charcoal leading-relaxed mt-5" style={{ fontSize: 'clamp(1.05rem, 1.7vw, 1.25rem)' }}>
                  These are not decorations. They are coordinates. Each one tells you where you are.
                </p>
                <div className="flex items-center gap-3 mt-8">
                  <span style={{ width: 36, height: 1, background: '#1A9E9E' }} aria-hidden="true" />
                  <span
                    className="font-sans uppercase"
                    style={{ color: '#1A9E9E', fontSize: '0.58rem', letterSpacing: '0.2em', fontWeight: 700 }}
                  >
                    BUENA ONDA · MIAMI
                  </span>
                </div>
              </div>
            </ScanReveal>
          </div>
        </div>
      </section>

      {/* â”€â”€ Timeline â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="py-24 bg-warm-white">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <ScanReveal>
            <span className="section-label mb-12 block">Timeline</span>
          </ScanReveal>

          <TimelineAccordion items={timelineItems} />
        </div>
      </section>

      {/* â”€â”€ The World We Found â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

      {/* â”€â”€ Values â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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




