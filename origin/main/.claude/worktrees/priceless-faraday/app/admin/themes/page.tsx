'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { Theme } from '@/types'
import { getAdminThemes } from '@/lib/api/admin'

export default function AdminThemesPage() {
  const [themes, setThemes] = useState<Theme[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    getAdminThemes()
      .then(setThemes)
      .catch(() => setFetchError('Could not load themes — check API connection.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="archive-label text-[0.65rem] text-stone-grey">Admin · Catalog</p>
          <h1 className="font-display text-near-black text-3xl mt-1">Themes</h1>
        </div>
        <Link
          href="/admin/themes/new"
          className="px-5 py-2.5 bg-near-black text-linen-peach font-mono text-xs
                     tracking-[0.15em] uppercase hover:bg-burnished transition-colors"
        >
          + New Theme
        </Link>
      </div>

      {fetchError && (
        <div className="p-4 border border-rose-magenta/30 bg-rose-magenta/5 mb-6">
          <p className="font-mono text-xs text-rose-magenta">{fetchError}</p>
        </div>
      )}

      {loading ? (
        <p className="font-mono text-sm text-stone-grey">Loading themes...</p>
      ) : themes.length === 0 && !fetchError ? (
        <div className="py-20 text-center border border-pale-stone border-dashed">
          <p className="font-mono text-sm text-stone-grey">No themes yet.</p>
          <Link href="/admin/themes/new"
            className="inline-block mt-4 font-mono text-xs text-burnished hover:text-rose-magenta transition-colors">
            Create your first theme →
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-pale-stone border-t border-b border-pale-stone">
          {themes.map(theme => (
            <div key={theme.id}
              className="flex items-center gap-4 py-4 hover:bg-sand-bg/50 px-2 transition-colors">

              {/* Cover thumb */}
              <div className="w-12 h-12 bg-pale-stone flex-shrink-0 overflow-hidden">
                {theme.cover_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={theme.cover_image} alt={theme.title}
                    className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="archive-label text-[0.5rem] text-stone-grey">
                      {theme.code}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm text-near-black truncate">{theme.title}</p>
                  <span className="archive-label text-[0.55rem] text-stone-grey">
                    {theme.code}
                  </span>
                </div>
                <p className="archive-label text-[0.6rem] text-stone-grey mt-0.5">
                  {theme.slug}
                </p>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {theme.featured && (
                  <span className="archive-label text-[0.55rem] text-warm-sand">Featured</span>
                )}
                <span className={`archive-label text-[0.55rem] px-2 py-0.5 ${
                  theme.published
                    ? 'bg-warm-sand/20 text-burnished'
                    : 'bg-pale-stone text-stone-grey'
                }`}>
                  {theme.published ? 'Published' : 'Draft'}
                </span>
                <Link
                  href={`/admin/themes/${theme.id}/edit`}
                  className="font-mono text-xs text-stone-grey hover:text-burnished transition-colors"
                >
                  Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
