import { Suspense } from 'react'
import { createServiceClient } from '@/lib/supabase/server'
import CatalogClient from './CatalogClient'

async function CatalogData() {
  let supabase: Awaited<ReturnType<typeof createServiceClient>>
  try {
    supabase = await createServiceClient()
  } catch {
    return <CatalogClient initialItems={[]} themes={[]} />
  }

  const [{ data: items }, { data: themes }] = await Promise.all([
    supabase
      .from('items')
      .select('*, theme:themes(id,title,code)')
      .order('created_at', { ascending: false }),
    supabase
      .from('themes')
      .select('id,title,code')
      .order('sort_order'),
  ])

  return <CatalogClient initialItems={items ?? []} themes={themes ?? []} />
}

export default function CatalogPage() {
  return (
    <Suspense fallback={<div className="sec-head"><div className="ttl">The Catalog</div></div>}>
      <CatalogData />
    </Suspense>
  )
}
