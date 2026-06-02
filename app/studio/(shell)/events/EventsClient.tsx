'use client'

import Link from 'next/link'
import SectionHead from '@/components/studio/SectionHead'
import EmptyState from '@/components/studio/EmptyState'
import StatusPill from '@/components/studio/StatusPill'
import type { EventStatus, LiveEvent } from './types'

type Props = {
  initialEvents: LiveEvent[]
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'n/a'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function statusVariant(status: EventStatus) {
  if (status === 'archived') return 'draft'
  if (status === 'one-time') return 'scheduled'
  return 'published'
}

export default function EventsClient({ initialEvents }: Props) {
  return (
    <>
      <SectionHead
        title="Live Events"
        subtitle="Recurring formats and archive materials"
        actionLabel="+ New event"
        actionHref="/studio/events/new"
      />

      {initialEvents.length === 0 ? (
        <EmptyState
          title="No events yet."
          message="Create the first live event archive entry."
        />
      ) : (
        <div className="rows">
          <div className="row" style={{ borderTop: '1px solid var(--line)' }}>
            <div className="num">#</div>
            <div className="rmain">
              <div className="rttl">Name</div>
            </div>
            <div className="rmeta">
              <div className="rdate">Status</div>
              <div className="rdate">Venue</div>
              <div className="rdate">Updated</div>
            </div>
          </div>

          {initialEvents.map((event, index) => (
            <Link key={event.id} href={`/studio/events/${event.id}`} className="row in">
              <div className="plnum">{String(index + 1).padStart(2, '0')}</div>
              <div className="rmain">
                <div className="rttl">{event.name}</div>
                <div className="rdek">{event.tagline ?? event.slug}</div>
              </div>
              <div className="rmeta">
                <StatusPill
                  variant={statusVariant(event.status)}
                  label={event.status}
                  inline
                  rowStyle
                />
                <div className="rdate">{[event.venue_name, event.venue_city].filter(Boolean).join(', ') || 'n/a'}</div>
                <div className="rdate">{formatDate(event.updated_at)}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
