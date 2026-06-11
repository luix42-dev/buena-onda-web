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

function CatalogError({ message }: { message: string }) {
  return (
    <div style={{ padding: '2rem', color: '#E8176A', fontFamily: 'monospace' }}>
      <strong>Data source unavailable.</strong>
      <pre style={{ marginTop: '1rem', fontSize: '0.85rem' }}>{message}</pre>
    </div>
  )
}

async function CatalogData() {
  let supabase: Awaited<ReturnType<typeof createServiceClient>>
  try {
    supabase = await createServiceClient()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to initialize Supabase client'
    console.error('[studio/catalog] Supabase client error:', message)
    return <CatalogError message={message} />
  }

  const [{ data: items, error: itemsError }, { data: themes, error: themesError }] = await Promise.all([
    supabase
      .from('items')
      .select('id, title, slug, catalog_number, theme_id, description, why_chosen, details, price, buy_url, tags, status, availability, sourcing_model, featured, published_at, created_at, updated_at, theme:themes(id,title,code)')
      .order('created_at', { ascending: false }),
    supabase
      .from('themes')
      .select('id,title,code')
      .order('sort_order'),
  ])
  if (itemsError) {
    console.error('[studio/catalog] Supabase items error:', itemsError.message)
    return <CatalogError message={itemsError.message} />
  }
  if (themesError) {
    console.error('[studio/catalog] Supabase themes error:', themesError.message)
    return <CatalogError message={themesError.message} />
  }

  const itemRows = (items ?? []) as ItemRow[]
  const itemIds = itemRows.map(item => item.id)
  const primaryImagesRes = itemIds.length === 0
    ? { data: [] as PrimaryImageRow[], error: null }
    : await supabase
        .from('item_primary_images')
        .select('item_id, url')
        .in('item_id', itemIds)
  if (primaryImagesRes.error) {
    console.error('[studio/catalog] Supabase primary images error:', primaryImagesRes.error.message)
    return <CatalogError message={primaryImagesRes.error.message} />
  }

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
