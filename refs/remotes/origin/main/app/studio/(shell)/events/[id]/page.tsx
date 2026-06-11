import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import EventEditor from './EventEditor'
import type { LiveEvent } from '../types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EventEditPage({ params }: Props) {
  const { id } = await params

  if (id === 'new') {
    return <EventEditor event={null} />
  }

  let supabase: Awaited<ReturnType<typeof createServiceClient>>
  try {
    supabase = await createServiceClient()
  } catch {
    notFound()
  }

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) notFound()
  return <EventEditor event={data as LiveEvent} />
}
