import type { Metadata } from 'next'
import Link from 'next/link'
import ScanReveal from '@/components/ui/ScanReveal'
import { createPublicServiceClient } from '@/lib/supabase/public'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Live Events',
  description: 'Live events from Buena Onda.',
}

type LiveEvent = {
  id: string
  slug: string
  name: string
  tagline: string | null
  description: string | null
  tags: string[] | null
  status: 'recurring' | 'one-time' | 'archived'
  venue_name: string | null
  venue_city: string | null
  cover_image_url: string | null
}

function truncate(value: string | null | undefined, max = 120) {
  if (!value) return ''
  if (value.length <= max) return value
  return `${value.slice(0, max).trim()}...`
}

function formatVenue(event: LiveEvent) {
  return [event.venue_name, event.venue_city].filter(Boolean).join(', ')
}

async function loadEvents() {
  try {
    const supabase = createPublicServiceClient()
    const { data, error } = await supabase
      .from('events')
      .select('id,slug,name,tagline,description,tags,status,venue_name,venue_city,cover_image_url')
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as LiveEvent[]
  } catch {
    return []
  }
}

export default async function EventsPage() {
  const events = await loadEvents()

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
          {events.length === 0 ? (
            <ScanReveal>
              <div className="paper-hover bg-warm-white p-7 h-full border border-pale-stone/60">
                <p className="archive-label text-[0.6rem] mb-4 text-teal">Live Events</p>
                <h2 className="font-display text-near-black text-3xl mb-3">
                  The archive is being built.
                </h2>
              </div>
            </ScanReveal>
          ) : (
            <div className="grid md:grid-cols-2 gap-8">
              {events.map((event, i) => (
                <ScanReveal key={event.id} delay={i * 120}>
                  <Link
                    href={`/events/${event.slug}`}
                    className="paper-hover bg-warm-white p-7 h-full border border-pale-stone/60 block cursor-pointer"
                  >
                    {event.cover_image_url ? (
                      <div className="aspect-[4/3] bg-sand-bg overflow-hidden mb-6">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={event.cover_image_url}
                          alt={event.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : null}
                    <p className="archive-label text-[0.6rem] mb-4 text-teal">
                      {formatVenue(event) || 'Venue TBA'}
                    </p>
                    <h2 className="font-display text-near-black text-3xl mb-3">
                      {event.name}
                    </h2>
                    {event.tagline ? (
                      <p className="font-serif italic text-near-black mb-4">
                        {event.tagline}
                      </p>
                    ) : null}
                    {event.tags && event.tags.length > 0 ? (
                      <p className="font-mono text-xs text-rose-magenta mb-6">
                        {event.tags.join(' · ')}
                      </p>
                    ) : null}
                    {event.description ? (
                      <p className="text-charcoal text-sm leading-relaxed">
                        {truncate(event.description)}
                      </p>
                    ) : null}
                    <div className="editorial-rule mt-8 mb-4" />
                    <p className="archive-label text-[0.58rem]">
                      A Buena Onda Experience · {event.status}
                    </p>
                  </Link>
                </ScanReveal>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
