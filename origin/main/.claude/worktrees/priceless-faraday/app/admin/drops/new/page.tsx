'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Drop } from '@/types'

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const inputCls = `w-full border border-pale-stone bg-transparent px-4 py-3
                  font-mono text-sm text-near-black placeholder:text-stone-grey
                  focus:border-warm-sand focus:outline-none transition-colors`
const labelCls = `archive-label text-[0.62rem] block mb-2`

export default function NewDropPage() {
  const router = useRouter()

  const [name,      setName]      = useState('')
  const [slug,      setSlug]      = useState('')
  const [desc,      setDesc]      = useState('')
  const [price,     setPrice]     = useState('')
  const [status,    setStatus]    = useState<Drop['status']>('upcoming')
  const [dropDate,  setDropDate]  = useState('')
  const [available, setAvailable] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  const handleNameChange = (v: string) => {
    setName(v)
    if (!slug || slug === slugify(name)) setSlug(slugify(v))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) { setError('Name is required.'); return }
    setError(null)
    setSaving(true)

    const payload = {
      name,
      slug: slug || slugify(name),
      description: desc || null,
      price:       price ? parseFloat(price) : null,
      status,
      drop_date:   dropDate ? new Date(dropDate).toISOString() : null,
      available,
    }

    try {
      const res = await fetch('/api/admin/drops', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as Record<string, string>).error ?? 'Failed to create drop.')
      }

      router.push('/admin/drops')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create drop.')
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <p className="archive-label text-[0.65rem] text-stone-grey">Admin · Drops</p>
        <h1 className="font-display text-near-black text-3xl mt-1">New Drop</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        {/* Name + Slug */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className={labelCls} htmlFor="name">Name *</label>
            <input
              id="name" type="text" required placeholder="The Field Bag"
              value={name} onChange={e => handleNameChange(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="slug">Slug</label>
            <input
              id="slug" type="text" placeholder="the-field-bag"
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
            {saving ? 'Saving...' : 'Create Drop →'}
          </button>
          <button
            type="button" disabled={saving}
            onClick={() => router.push('/admin/drops')}
            className="px-6 py-3.5 border border-pale-stone font-mono text-xs
                       tracking-[0.15em] uppercase text-stone-grey
                       hover:border-burnished disabled:opacity-30 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
