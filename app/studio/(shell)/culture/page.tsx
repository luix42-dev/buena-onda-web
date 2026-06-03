import { createServiceClient } from '@/lib/supabase/server'
import CultureClient from './CultureClient'

export const runtime = 'edge'

export const dynamic = 'force-dynamic'

async function loadCultureData() {
  try {
    const supabase = await createServiceClient()
    const { data } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })

    return data ?? []
  } catch {
    return []
  }
}

export default async function CulturePage() {
  const posts = await loadCultureData()

  return <CultureClient initialPosts={posts} />
}
