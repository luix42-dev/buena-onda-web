import type { Metadata } from 'next'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import type { Item, Theme } from '@/types'

export const metadata: Metadata = { title: 'Catalog Items' }

const STATUS_COLORS: Record<string, string> = {
  draft:     'bg-pale-stone text-stone-grey',
  published: 'bg-warm-sand/20 text-burnished',
  archived:  'bg-rose-magenta/10 text-rose-magenta',
}

export default async function AdminItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; theme?: string }>
}) {
  const { status: filterStatus, theme: filterTheme } = await searchParams

  let items:  Item[]  = []
  let themes: Theme[] = []
  let fetchError: string | null = null

  try {
    const supabase = await createServiceClient()

    const [itemsRes, themesRes] = await Promise.all([
      supabase
        .from('items')
        .select('*, theme:themes(id, title, code)')
        .order('created_at', { ascending: false }),
      supabase
        .from('themes')
        .select('id, title, code, slug')
        .order('title'),
    ])

    if (itemsRes.error)  throw itemsRes.error
    if (themesRes.error) throw themesRes.error

    items  = (itemsRes.data  ?? []) as Item[]
    themes = (themesRes.data ?? []) as Theme[]
  } catch {
    fetchError = 'Could not load items — check Supabase config.'
  }

  // Client-side filter (no rerender needed at this scale)
  const filtered = items.filter(item => {
    if (filterStatus && item.status !== filterStatus) return false
    if (filterTheme  && item.theme_id !== filterTheme)  return false
    return true
  })

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="archive-label text-[0.65rem] text-stone-grey">Admin · Catalog</p>
          <h1 className="font-display text-near-black text-3xl mt-1">
            Items
            <span className="font-mono text-lg text-stone-grey ml-3">{filtered.length}</span>
          </h1>
        </div>
        <Link
          href="/admin/items/new"
          className="px-5 py-2.5 bg-near-black text-linen-peach font-mono text-xs
                     tracking-[0.15em] uppercase hover:bg-burnished transition-colors"
        >
          + New Item
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(['', 'draft', 'published', 'archived'] as const).map(s => (
          <Link key={s}
            href={s ? `/admin/items?status=${s}` : '/admin/items'}
            className={`font-mono text-xs px-3 py-1.5 border transition-colors ${
              filterStatus === s || (!filterStatus && !s)
                ? 'border-near-black bg-near-black text-linen-peach'
                : 'border-pale-stone text-stone-grey hover:border-burnished'
            }`}
          >
            {s || 'All'}
          </Link>
        ))}
        {themes.map(t => (
          <Link key={t.id}
            href={`/admin/items?theme=${t.id}`}
            className={`font-mono text-xs px-3 py-1.5 border transition-colors ${
              filterTheme === t.id
                ? 'border-burnished bg-burnished text-linen-peach'
                : 'border-pale-stone text-stone-grey hover:border-burnished'
            }`}
          >
            {t.code}
          </Link>
        ))}
      </div>

      {fetchError && (
        <div className="p-4 border border-rose-magenta/30 bg-rose-magenta/5 mb-6">
          <p className="font-mono text-xs text-rose-magenta">{fetchError}</p>
        </div>
      )}

      {filtered.length === 0 && !fetchError ? (
        <div className="py-20 text-center border border-pale-stone border-dashed">
          <p className="font-mono text-sm text-stone-grey">No items found.</p>
          <Link href="/admin/items/new"
            className="inline-block mt-4 font-mono text-xs text-burnished hover:text-rose-magenta transition-colors">
            Add the first catalog item →
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-pale-stone border-t border-b border-pale-stone">
          {filtered.map(item => (
            <div key={item.id}
              className="flex items-center gap-4 py-3 hover:bg-sand-bg/50 px-2 transition-colors">

              {/* Thumb */}
              <div className="w-10 h-14 bg-pale-stone flex-shrink-0 overflow-hidden">
                {item.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.cover_image_url} alt={item.title}
                    className="w-full h-full object-cover grayscale" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="archive-label text-[0.45rem] text-stone-grey">IMG</span>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm text-near-black truncate">{item.title}</p>
                <div className="flex gap-2 mt-0.5">
                  {item.catalog_number && (
                    <span className="archive-label text-[0.55rem] text-stone-grey">
                      {item.catalog_number}
                    </span>
                  )}
                  {item.theme && (
                    <span className="archive-label text-[0.55rem] text-warm-sand">
                      {(item.theme as unknown as Theme).code}
                    </span>
                  )}
                </div>
              </div>

              {item.price && (
                <span className="font-mono text-xs text-charcoal flex-shrink-0">
                  ${item.price.toFixed(2)}
                </span>
              )}

              <span className={`archive-label text-[0.55rem] px-2 py-0.5 flex-shrink-0 ${STATUS_COLORS[item.status]}`}>
                {item.status}
              </span>

              <Link
                href={`/admin/items/${item.id}/edit`}
                className="font-mono text-xs text-stone-grey hover:text-burnished transition-colors flex-shrink-0"
              >
                Edit
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
