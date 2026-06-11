import { createServiceClient } from '@/lib/supabase/server'
import { timelineItems as fallback } from '@/lib/timeline'
import TimelineClient, { type TimelineEra } from './TimelineClient'

export const runtime = 'edge'

export const dynamic = 'force-dynamic'

type TimelineRow = {
  id: string | number
  slug: string
  year: string
  title: string
  summary: string
  story: string
  photo: string | null
  photos: string[] | null
  sort_order: number | null
}

function fromFallback(): TimelineEra[] {
  return fallback.map((item, index) => ({
    id: `fallback:${item.slug}`,
    slug: item.slug,
    year: item.year,
    title: item.title,
    summary: item.summary,
    story: item.story,
    photo: item.photo,
    photos: [...item.photos],
    sort_order: index,
  }))
}

function TimelineError({ message }: { message: string }) {
  return (
    <div style={{ padding: '2rem', color: '#E8176A', fontFamily: 'monospace' }}>
      <strong>Data source unavailable.</strong>
      <pre style={{ marginTop: '1rem', fontSize: '0.85rem' }}>{message}</pre>
    </div>
  )
}

async function loadTimelineData(): Promise<{ data?: TimelineEra[], error?: string }> {
  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('timeline')
      .select('id, slug, year, title, summary, story, photo, photos, sort_order')
      .order('sort_order')

    if (error) {
      console.error('[studio/timeline] Supabase timeline error:', error.message)
      return { error: error.message }
    }
    if (data?.length) {
      return {
        data: (data as TimelineRow[]).map(row => ({
        id: String(row.id),
        slug: row.slug,
        year: row.year,
        title: row.title,
        summary: row.summary,
        story: row.story,
        photo: row.photo ?? null,
        photos: Array.isArray(row.photos) ? row.photos : [],
        sort_order: row.sort_order ?? 0,
        })),
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to initialize Supabase client'
    console.error('[studio/timeline] Supabase client error:', message)
    return { error: message }
  }

  return { data: fromFallback() }
}

export default async function TimelinePage() {
  const { data: initialEras, error } = await loadTimelineData()
  if (error) return <TimelineError message={error} />

  return <TimelineClient initialEras={initialEras ?? []} />
}
