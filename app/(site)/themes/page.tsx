import type { Metadata } from 'next'
import { createPublicClient } from '@/lib/supabase/public'
import type { Item, Theme } from '@/types'
import CatalogGrid from './CatalogGrid'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'The Catalog — Buena Onda',
  description: 'Selected works from the Buena Onda catalog — objects, apparel, and editions.',
}

type ThemeStub = Pick<Theme, 'id' | 'title' | 'code' | 'slug'>
type ItemWithTheme = Omit<Item, 'theme'> & { theme?: ThemeStub }
type PrimaryImageRow = {
  item_id: string
  url: string
}
type ItemRow = Omit<ItemWithTheme, 'theme'> & { theme: ThemeStub[] | ThemeStub | null }

export default async function ThemesPage() {
  const supabase = createPublicClient()

  const [itemsRes, themesRes] = await Promise.all([
    supabase
      .from('items')
      .select('id, title, slug, catalog_number, theme_id, price, availability, theme:themes(id, title, code, slug)')
      .in('status', ['published', 'sold_out'])
      .order('published_at', { ascending: false }),
    supabase
      .from('themes')
      .select('id, title, code, slug')
      .eq('published', true)
      .order('sort_order'),
  ])

  const itemRows = (itemsRes.data ?? []) as unknown as ItemRow[]
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

  const items = itemRows.map(item => ({
    ...item,
    theme: Array.isArray(item.theme) ? (item.theme[0] ?? undefined) : (item.theme ?? undefined),
    primary_image_url: primaryImageMap.get(item.id) ?? null,
  }))
  const themes = (themesRes.data ?? []) as ThemeStub[]

  return (
    <>
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="px-5 md:px-10 pt-32 pb-10 bg-warm-page border-b border-black/5">
        <div className="max-w-site mx-auto">
          <p className="text-[0.5rem] tracking-[0.7em] uppercase text-teal mb-3">Selected Works</p>
          <h1 className="font-display text-[clamp(3rem,6vw,5rem)] text-charcoal leading-none">
            THE CATALOG
          </h1>
        </div>
      </div>

      <CatalogGrid items={items} themes={themes} />
    </>
  )
}
