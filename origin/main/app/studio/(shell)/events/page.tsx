import { Suspense } from 'react'
import { createServiceClient } from '@/lib/supabase/server'
import EventsClient from './EventsClient'

async function EventsData() {
  let supabase: Awaited<ReturnType<typeof createServiceClient>>
  try {
    supabase = await createServiceClient()
  } catch {
    return <EventsClient initialEvents={[]} />
  }

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .order('updated_at', { ascending: false })

  return <EventsClient initialEvents={events ?? []} />
}

export default function EventsPage() {
  return (
    <Suspense fallback={<div className="sec-head"><div className="ttl">Live Events</div></div>}>
      <EventsData />
    </Suspense>
  )
}
