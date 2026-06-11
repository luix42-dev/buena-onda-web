import { createServiceClient } from '@/lib/supabase/server'
import RadioClient from './RadioClient'

export const runtime = 'edge'

export const dynamic = 'force-dynamic'

function RadioError({ message }: { message: string }) {
  return (
    <div style={{ padding: '2rem', color: '#E8176A', fontFamily: 'monospace' }}>
      <strong>Data source unavailable.</strong>
      <pre style={{ marginTop: '1rem', fontSize: '0.85rem' }}>{message}</pre>
    </div>
  )
}

async function loadRadioData() {
  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('episodes')
      .select('*')
      .order('episode_number', { ascending: false })

    if (error) {
      console.error('[studio/radio] Supabase episodes error:', error.message)
      return { error: error.message }
    }

    return { data: data ?? [] }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to initialize Supabase client'
    console.error('[studio/radio] Supabase client error:', message)
    return { error: message }
  }
}

export default async function RadioPage() {
  const { data: episodes, error } = await loadRadioData()
  if (error) return <RadioError message={error} />

  return <RadioClient initialEpisodes={episodes ?? []} />
}
