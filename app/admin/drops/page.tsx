'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { Drop } from '@/types'

const STATUS_COLORS: Record<Drop['status'], string> = {
  upcoming: 'bg-sky-steel/20 text-sky-steel',
  live:     'bg-terracotta/20 text-terracotta',
  sold_out: 'bg-pale-stone text-stone-grey',
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export default function AdminDropsPage() {
  const [drops,      setDrops]      = useState<Drop[]>([])
  const [loading,    setLoading]    = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/drops')
      .then(r => r.json())
      .then(d => setDrops(Array.isArray(d) ? d : []))
      .catch(() => setFetchError('Could not load drops — check API connection.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="archive-label text-[0.65rem] text-stone-grey">Admin · Drops</p>
          <h1 className="font-display text-near-black text-3xl mt-1">
            Objects &amp; Drops
            <span className="font-mono text-lg text-stone-grey ml-3">{drops.length}</span>
          </h1>
        </div>
        <Link
          href="/admin/drops/new"
          className="px-5 py-2.5 bg-near-black text-linen-peach font-mono text-xs
                     tracking-[0.15em] uppercase hover:bg-burnished transition-colors"
        >
          + New Drop
        </Link>
      </div>

      {fetchError && (
        <div className="p-4 border border-rose-magenta/30 bg-rose-magenta/5 mb-6">
          <p className="font-mono text-xs text-rose-magenta">{fetchError}</p>
        </div>
      )}

      {loading ? (
        <p className="font-mono text-sm text-stone-grey">Loading drops...</p>
      ) : drops.length === 0 && !fetchError ? (
        <div className="py-20 text-center border border-pale-stone border-dashed">
          <p className="font-mono text-sm text-stone-grey">No drops yet.</p>
          <Link
            href="/admin/drops/new"
            className="inline-block mt-4 font-mono text-xs text-burnished hover:text-rose-magenta transition-colors"
          >
            Add the first drop →
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-pale-stone border-t border-b border-pale-stone">
          {drops.map(drop => (
            <div
              key={drop.id}
              className="flex items-center gap-4 py-3 hover:bg-sand-bg/50 px-2 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm text-near-black truncate">{drop.name}</p>
                <p className="archive-label text-[0.55rem] text-stone-grey mt-0.5">/{drop.slug}</p>
              </div>

              {drop.price != null ? (
                <span className="font-mono text-xs text-charcoal flex-shrink-0">
                  ${drop.price.toFixed(2)}
                </span>
              ) : (
                <span className="font-mono text-xs text-stone-grey flex-shrink-0">—</span>
              )}

              <span
                className={`archive-label text-[0.55rem] px-2 py-0.5 flex-shrink-0 ${STATUS_COLORS[drop.status]}`}
              >
                {drop.status.replace('_', ' ')}
              </span>

              <span className="font-mono text-xs text-stone-grey flex-shrink-0">
                {formatDate(drop.drop_date)}
              </span>

              <Link
                href={`/admin/drops/${drop.id}/edit`}
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
