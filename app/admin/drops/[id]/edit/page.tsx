'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Drop } from '@/types'

const inputCls = `w-full border border-pale-stone bg-transparent px-4 py-3
                  font-mono text-sm text-near-black placeholder:text-stone-grey
                  focus:border-warm-sand focus:outline-none transition-colors`
const labelCls = `archive-label text-[0.62rem] block mb-2`

export default function EditDropPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()

  const [name,      setName]      = useState('')
  const [slug,      setSlug]      = useState('')
  const [desc,      setDesc]      = useState('')
  const [price,     setPrice]     = useState('')
  const [status,    setStatus]    = useState<Drop['status']>('upcoming')
  const [dropDate,  setDropDate]  = useState('')
  const [available, setAvailable] = useState(false)

  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [saved,   setSaved]   = useState(false)

  useEffect(() => {
    fetch(`/api/admin/drops/${id}`)
      .then(r => r.json())
      .then((drop: Drop) => {
        setName(drop.name)
        setSlug(drop.slug)
        setDesc(drop.description ?? '')
        setPrice(drop.price != null ? String(drop.price) : '')
        setStatus(drop.status)
        setDropDate(drop.drop_date ? drop.drop_date.slice(0, 16) : '')
        setAvailable(drop.available)
      })
      .catch(() => setError('Could not load drop.'))
      .finally(() => setLoading(false))
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !slug) { setError('Name and slug are required.'); return }
    setError(null)
    setSaving(true)

    const payload = {
      name,
      slug,
      description: desc || null,
      price:       price ? parseFloat(price) : null,
      status,
      drop_date:   dropDate ? new Date(dropDate).toISOString() : null,
      available,
    }

    try {
      const res = await fetch(`/api/admin/drops/${id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as Record<string, string>).error ?? 'Failed to save drop.')
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save drop.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="font-mono text-sm text-stone-grey">Loading...</p>
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <p className="archive-label text-[0.65rem] text-stone-grey">Admin · Drops</p>
        <h1 className="font-display text-near-black text-3xl mt-1">Edit Drop</h1>
        <Link
          href="/admin/drops"
          className="font-mono text-xs text-stone-grey hover:text-burnished transition-colors mt-1 inline-block"
        >
          ← Back to drops
        </Link>
      </div>

      {saved && (
        <div className="mb-6 px-4 py-3 bg-teal-500/10 border border-teal-500/30">
          <p className="font-mono text-xs text-teal-600">✓ Saved.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        {/* Name + Slug */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className={labelCls} htmlFor="name">Name *</label>
            <input
              id="name" type="text" required placeholder="The Field Bag"
              value={name} onChange={e => setName(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="slug">Slug *</label>
            <input
              id="slug" type="text" required placeholder="the-field-bag"
              value={slug} onChange={e => setSlug(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className={labelCls} htmlFor="desc">Description</label>
          <textarea
            id="desc" rows={3} placeholder="A few words about this drop..."
            value={desc} onChange={e => setDesc(e.target.value)}
            className={`${inputCls} resize-none`}
          />
        </div>

        {/* Price + Status + Drop Date */}
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <label className={labelCls} htmlFor="price">Price ($)</label>
            <input
              id="price" type="number" step="0.01" min="0" placeholder="285.00"
              value={price} onChange={e => setPrice(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="status">Status</label>
            <select
              id="status" value={status}
              onChange={e => setStatus(e.target.value as Drop['status'])}
              className={`${inputCls} appearance-none cursor-pointer`}
              style={{ backgroundColor: 'transparent' }}
            >
              <option value="upcoming">Upcoming</option>
              <option value="live">Live</option>
              <option value="sold_out">Sold Out</option>
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="drop_date">Drop Date</label>
            <input
              id="drop_date" type="datetime-local"
              value={dropDate} onChange={e => setDropDate(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        {/* Available */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox" id="available"
            checked={available} onChange={e => setAvailable(e.target.checked)}
            className="accent-warm-sand w-4 h-4"
          />
          <label htmlFor="available" className="archive-label text-[0.62rem] cursor-pointer">
            Mark as available
          </label>
        </div>

        {error && (
          <p className="archive-label text-[0.6rem] text-rose-magenta">{error}</p>
        )}

        <div className="flex gap-4 pt-2">
          <button
            type="submit" disabled={saving}
            className="px-8 py-3.5 bg-near-black text-linen-peach
                       font-mono text-xs tracking-[0.2em] uppercase
                       hover:bg-burnished disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Drop →'}
          </button>
          <Link
            href="/admin/drops"
            className="px-6 py-3.5 border border-pale-stone font-mono text-xs
                       tracking-[0.15em] uppercase text-stone-grey
                       hover:border-burnished transition-colors inline-flex items-center"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
