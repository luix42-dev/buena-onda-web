import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import ScanReveal from '@/components/ui/ScanReveal'
import SearchForm from '@/components/ui/SearchForm'
import { createClient } from '@/lib/supabase/server'
import type { Item, Theme } from '@/types'

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search the Buena Onda catalog — objects, themes, and more.',
}

interface Props {
  searchParams: Promise<{ q?: string; theme?: string }>
}

export default async function SearchPage({ searchParams }: Props) {
  const { q, theme: themeFilter } = await searchParams
  const query = q?.trim() ?? ''

  let items:  Item[]  = []
  let themes: Theme[] = []

  try {
    const supabase = await createClient()

    const [itemsRes, themesRes] = await Promise.all([
      supabase
        .from('items')
        .select('*, theme:themes(id, title, code, slug)')
        .eq('status', 'published')
        .order('published_at', { ascending: false }),
      supabase
        .from('themes')
        .select('id, title, code, slug, description, cover_image')
        .eq('published', true)
        .order('sort_order'),
    ])

    items  = (itemsRes.data  ?? []) as Item[]
    themes = (themesRes.data ?? []) as Theme[]
  } catch { /* Supabase not configured */ }

  // Client-side filter (works without full-text search setup)
  const lq = query.toLowerCase()
  const filteredItems = items.filter(item => {
    const matchQuery = !lq ||
      item.title.toLowerCase().includes(lq) ||
      item.description?.toLowerCase().includes(lq) ||
      item.tags?.some(t => t.toLowerCase().includes(lq)) ||
      item.catalog_number?.toLowerCase().includes(lq)
    const matchTheme = !themeFilter || item.theme_id === themeFilter
    return matchQuery && matchTheme
  })

  return (
    <>
      {/* Header */}
      <div className="pt-32 pb-12 bg-warm-page">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <ScanReveal>
            <span className="section-label">Search</span>
            <h1
              className="font-display text-near-black mt-2"
              style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}
            >
              Find objects.
            </h1>
          </ScanReveal>

          <ScanReveal delay={100}>
            <div className="mt-8 max-w-xl">
              <Suspense fallback={null}>
                <SearchForm defaultValue={query} />
              </Suspense>
            </div>
          </ScanReveal>

          {/* Theme filter pills */}
          {themes.length > 0 && (
            <ScanReveal delay={150}>
              <div className="flex flex-wrap gap-2 mt-6">
                <Link href="/search"
                  className={`font-mono text-xs px-3 py-1.5 border transition-colors ${
                    !themeFilter
                      ? 'border-charcoal bg-charcoal text-warm-white'
                      : 'border-pale-stone text-stone-grey hover:border-teal'
                  }`}>
                  All
                </Link>
                {themes.map(t => (
                  <Link key={t.id}
                    href={`/search?${q ? `q=${encodeURIComponent(q)}&` : ''}theme=${t.id}`}
                    className={`font-mono text-xs px-3 py-1.5 border transition-colors ${
                      themeFilter === t.id
                        ? 'border-teal bg-teal text-white'
                        : 'border-pale-stone text-stone-grey hover:border-teal'
                    }`}>
                    {t.code} — {t.title}
                  </Link>
                ))}
              </div>
            </ScanReveal>
          )}
        </div>
      </div>

      {/* Results */}
      <section className="py-16 bg-cream">
        <div className="max-w-site mx-auto px-5 md:px-10">

          {query || themeFilter ? (
            <ScanReveal>
              <p className="archive-label text-[0.6rem] text-stone-grey mb-8">
                {filteredItems.length} result{filteredItems.length !== 1 ? 's' : ''}
                {query ? ` for "${query}"` : ''}
              </p>
            </ScanReveal>
          ) : null}

          {filteredItems.length === 0 ? (
            <ScanReveal>
              <div className="py-16 text-center border border-pale-stone border-dashed">
                <p className="font-mono text-sm text-stone-grey">
                  {query ? 'No objects matched your search.' : 'Enter a search term to begin.'}
                </p>
                {query && (
                  <Link href="/themes"
                    className="inline-block mt-4 font-mono text-xs text-teal hover:text-neon-pink transition-colors">
                    Browse all themes →
                  </Link>
                )}
              </div>
            </ScanReveal>
          ) : (
            <div className="divide-y divide-pale-stone border-t border-b border-pale-stone">
              {filteredItems.map((item, i) => (
                <ScanReveal key={item.id} delay={i * 40}>
                  <Link href={`/items/${item.slug}`}
                    className="flex items-center gap-5 py-4 hover:bg-sand-bg/50 px-2
                               transition-colors group">

                    {/* Thumb */}
                    <div className="w-12 h-16 flex-shrink-0 bg-pale-stone overflow-hidden">
                      {item.cover_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.cover_image_url} alt={item.title}
                          className="w-full h-full object-cover transition-all duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="archive-label text-[0.45rem] text-stone-grey">IMG</span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        {item.catalog_number && (
                          <span className="archive-label text-[0.55rem] text-stone-grey flex-shrink-0">
                            {item.catalog_number}
                          </span>
                        )}
                        <p className="font-mono text-sm text-near-black group-hover:text-teal
                                     transition-colors truncate">
                          {item.title}
                        </p>
                      </div>
                      {item.theme && (
                        <p className="archive-label text-[0.55rem] text-teal-light mt-0.5">
                          {(item.theme as unknown as Theme).title}
                        </p>
                      )}
                    </div>

                    {item.price && (
                      <span className="font-mono text-xs text-charcoal flex-shrink-0">
                        ${item.price.toFixed(2)}
                      </span>
                    )}

                    <span className="font-mono text-xs text-stone-grey group-hover:text-teal
                                   transition-colors flex-shrink-0">
                      →
                    </span>
                  </Link>
                </ScanReveal>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
