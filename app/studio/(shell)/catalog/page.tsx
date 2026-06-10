import { Suspense } from 'react'
import { createServiceClient } from '@/lib/supabase/server'
import CatalogClient from './CatalogClient'

type PrimaryImageRow = {
  item_id: string
  url: string
}
type ThemeRow = {
  id: string
  title: string
  code: string
}
type ItemRow = Omit<Parameters<typeof CatalogClient>[0]['initialItems'][number], 'theme'> & {
  theme: ThemeRow[] | ThemeRow | null
}

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
      .select('id, title, slug, catalog_number, theme_id, description, why_chosen, details, price, buy_url, tags, status, availability, sourcing_model, featured, published_at, created_at, updated_at, theme:themes(id,title,code)')
      .order('created_at', { ascending: false }),
    supabase
      .from('themes')
      .select('id,title,code')
      .order('sort_order'),
  ])

  const itemRows = (items ?? []) as ItemRow[]
  const itemIds = itemRows.map(item => item.id)
  const primaryImagesRes = itemIds.length === 0
    ? { data: [] as PrimaryImageRow[] }
    : await supabase
        .from('item_primary_images')
        .select('item_id, url')
        .in('item_id', itemIds)

  const primaryImageMap = new Map(
    ((primaryImagesRes.data ?? []) as PrimaryImageRow[]).map(image => [image.item_id, image.url]),
  )

  const itemsWithPrimary = itemRows.map(item => ({
    ...item,
    theme: Array.isArray(item.theme) ? (item.theme[0] ?? undefined) : (item.theme ?? undefined),
    primary_image_url: primaryImageMap.get(item.id) ?? null,
  }))

  return <CatalogClient initialItems={itemsWithPrimary} themes={themes ?? []} />
}

export default function CatalogPage() {
  return (
    <Suspense fallback={<div className="sec-head"><div className="ttl">The Catalog</div></div>}>
      <CatalogData />
    </Suspense>
  )
}
