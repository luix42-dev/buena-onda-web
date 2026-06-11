import { createServiceClient } from '@/lib/supabase/server'
import CultureClient from './CultureClient'

export const runtime = 'edge'

export const dynamic = 'force-dynamic'

function CultureError({ message }: { message: string }) {
  return (
    <div style={{ padding: '2rem', color: '#E8176A', fontFamily: 'monospace' }}>
      <strong>Data source unavailable.</strong>
      <pre style={{ marginTop: '1rem', fontSize: '0.85rem' }}>{message}</pre>
    </div>
  )
}

async function loadCultureData() {
  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[studio/culture] Supabase posts error:', error.message)
      return { error: error.message }
    }

    return { data: data ?? [] }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to initialize Supabase client'
    console.error('[studio/culture] Supabase client error:', message)
    return { error: message }
  }
}

export default async function CulturePage() {
  const { data: posts, error } = await loadCultureData()
  if (error) return <CultureError message={error} />

  return <CultureClient initialPosts={posts ?? []} />
}
