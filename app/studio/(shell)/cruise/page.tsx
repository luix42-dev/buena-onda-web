import { createServiceClient } from '@/lib/supabase/server'
import CruiseClient from './CruiseClient'

export const dynamic = 'force-dynamic'

function CruiseError({ message }: { message: string }) {
  return (
    <div style={{ padding: '2rem', color: '#E8176A', fontFamily: 'monospace' }}>
      <strong>Data source unavailable.</strong>
      <pre style={{ marginTop: '1rem', fontSize: '0.85rem' }}>{message}</pre>
    </div>
  )
}

async function loadCruiseData() {
  try {
    const supabase = await createServiceClient()

    const [scenesRes, channelsRes] = await Promise.all([
      supabase
        .from('cruise_scenes')
        .select('*')
        .order('sort', { ascending: true })
        .order('created_at', { ascending: false }),
      supabase
        .from('cruise_channels')
        .select('*')
        .order('sort', { ascending: true })
        .order('created_at', { ascending: false }),
    ])

    if (scenesRes.error) {
      console.error('[studio/cruise] Supabase cruise_scenes error:', scenesRes.error.message)
      return { error: scenesRes.error.message }
    }
    if (channelsRes.error) {
      console.error('[studio/cruise] Supabase cruise_channels error:', channelsRes.error.message)
      return { error: channelsRes.error.message }
    }

    return {
      scenes:   scenesRes.data ?? [],
      channels: channelsRes.data ?? [],
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to initialize Supabase client'
    console.error('[studio/cruise] Supabase client error:', message)
    return { error: message }
  }
}

export default async function CruisePage() {
  const { scenes, channels, error } = await loadCruiseData()
  if (error) return <CruiseError message={error} />

  return <CruiseClient initialScenes={scenes ?? []} initialChannels={channels ?? []} />
}
