'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { Episode } from '@/types'

export default function AdminEpisodesPage() {
  const [episodes,   setEpisodes]   = useState<Episode[]>([])
  const [loading,    setLoading]    = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/episodes')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setEpisodes(Array.isArray(data) ? data : []))
      .catch(() => setFetchError('Could not load episodes — check API connection.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="archive-label text-[0.65rem] text-stone-grey">Admin · Radio</p>
          <h1 className="font-display text-near-black text-3xl mt-1">
            Episodes
            <span className="font-mono text-lg text-stone-grey ml-3">{episodes.length}</span>
          </h1>
        </div>
        <Link
          href="/admin/episodes/new"
          className="px-5 py-2.5 bg-near-black text-linen-peach font-mono text-xs
                     tracking-[0.15em] uppercase hover:bg-burnished transition-colors"
        >
          + New Episode
        </Link>
      </div>

      {fetchError && (
        <div className="p-4 border border-rose-magenta/30 bg-rose-magenta/5 mb-6">
          <p className="font-mono text-xs text-rose-magenta">{fetchError}</p>
        </div>
      )}

      {loading ? (
        <p className="font-mono text-sm text-stone-grey">Loading episodes...</p>
      ) : episodes.length === 0 && !fetchError ? (
        <div className="py-20 text-center border border-pale-stone border-dashed">
          <p className="font-mono text-sm text-stone-grey">No episodes found.</p>
          <Link href="/admin/episodes/new"
            className="inline-block mt-4 font-mono text-xs text-burnished hover:text-rose-magenta transition-colors">
            Add the first episode →
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-pale-stone border-t border-b border-pale-stone">
          {episodes.map(ep => (
            <div key={ep.id}
              className="flex items-center gap-4 py-3 hover:bg-sand-bg/50 px-2 transition-colors">

              {/* Episode number */}
              <div className="w-14 flex-shrink-0">
                {ep.episode_number != null ? (
                  <span className="archive-label text-[0.58rem] text-warm-sand">
                    EP·{String(ep.episode_number).padStart(2, '0')}
                  </span>
                ) : (
                  <span className="archive-label text-[0.58rem] text-stone-grey">—</span>
                )}
              </div>

              {/* Title */}
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm text-near-black truncate">{ep.title}</p>
              </div>

              {/* Published badge */}
              <span className={`archive-label text-[0.55rem] px-2 py-0.5 flex-shrink-0 ${
                ep.published
                  ? 'bg-warm-sand/20 text-burnished'
                  : 'bg-pale-stone text-stone-grey'
              }`}>
                {ep.published ? 'published' : 'draft'}
              </span>

              {/* Duration */}
              {ep.duration != null ? (
                <span className="font-mono text-xs text-charcoal flex-shrink-0">
                  {Math.floor(ep.duration / 60)}m
                </span>
              ) : (
                <span className="font-mono text-xs text-stone-grey flex-shrink-0">—</span>
              )}

              <Link
                href={`/admin/episodes/${ep.id}/edit`}
                className="font-mono text-xs text-stone-grey hover:text-burnished transition-colors flex-shrink-0"
              >
                Edit →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
