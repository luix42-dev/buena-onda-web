import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { Item, Theme } from '@/types'
import CatalogGrid from './CatalogGrid'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'The Catalog — Buena Onda',
  description: 'Selected works from the Buena Onda catalog — objects, apparel, and editions.',
}

type ThemeStub = Pick<Theme, 'id' | 'title' | 'code' | 'slug'>
type ItemWithTheme = Item & { theme: ThemeStub | null }

export default async function ThemesPage() {
  const supabase = await createClient()

  const [itemsRes, themesRes] = await Promise.all([
    supabase
      .from('items')
      .select('*, theme:themes(id, title, code, slug)')
      .in('status', ['published', 'sold_out'])
      .order('published_at', { ascending: false }),
    supabase
      .from('themes')
      .select('id, title, code, slug')
      .eq('published', true)
      .order('sort_order'),
  ])

  const items  = (itemsRes.data  ?? []) as ItemWithTheme[]
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
