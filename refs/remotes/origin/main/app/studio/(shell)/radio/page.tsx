import { createServiceClient } from '@/lib/supabase/server'
import RadioClient from './RadioClient'

export const runtime = 'edge'

export const dynamic = 'force-dynamic'

async function loadRadioData() {
  try {
    const supabase = await createServiceClient()
    const { data } = await supabase
      .from('episodes')
      .select('*')
      .order('episode_number', { ascending: false })

    return data ?? []
  } catch {
    return []
  }
}

export default async function RadioPage() {
  const episodes = await loadRadioData()

  return <RadioClient initialEpisodes={episodes} />
}
