'use client'

import { useState, useEffect } from 'react'
import type { Drop } from '@/types'
import { getDropsClient } from '@/lib/api/client'

export default function AdminDrops() {
  const [drops,   setDrops]   = useState<Drop[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    name: '', description: '', price: '', status: 'upcoming' as Drop['status'],
    drop_date: '', available: false,
  })
  const [saving,  setSaving]  = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    getDropsClient()
      .then(d => setDrops(d.drops ?? []))
      .catch(() => setDrops([]))
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const payload = {
      name:        form.name,
      description: form.description || undefined,
      price:       form.price ? parseFloat(form.price) : undefined,
      status:      form.status,
      drop_date:   form.drop_date ? new Date(form.drop_date).toISOString() : undefined,
      available:   form.available,
    }

    const res = await fetch('/api/drops', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })

    if (res.ok) {
      const { drop } = await res.json()
      setDrops(prev => [drop, ...prev])
      setForm({ name: '', description: '', price: '', status: 'upcoming', drop_date: '', available: false })
      setMessage('Drop created.')
    } else {
      setMessage('Error creating drop.')
    }

    setSaving(false)
  }

  const statusColor: Record<Drop['status'], string> = {
    live:     'bg-terracotta/20 text-terracotta',
    upcoming: 'bg-sky-steel/20 text-sky-steel',
    sold_out: 'bg-pale-stone text-stone-grey',
  }

  return (
    <div>
      <div className="mb-8">
        <p className="archive-label text-[0.65rem] text-stone-grey">Admin</p>
        <h1 className="font-display text-near-black text-3xl mt-1">Objects & Drops</h1>
      </div>

      {/* Create form */}
      <form onSubmit={handleCreate} className="mb-12 p-6 border border-pale-stone bg-linen-white flex flex-col gap-4">
        <p className="archive-label text-[0.62rem] mb-2">New Drop</p>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="archive-label text-[0.6rem] block mb-1.5">Name *</label>
            <input
              type="text" required
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full border border-pale-stone bg-cream px-3 py-2.5 font-mono text-sm
                         focus:border-warm-sand focus:outline-none"
              placeholder="The Field Bag"
            />
          </div>
          <div>
            <label className="archive-label text-[0.6rem] block mb-1.5">Price ($)</label>
            <input
              type="number" step="0.01"
              value={form.price}
              onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
              className="w-full border border-pale-stone bg-cream px-3 py-2.5 font-mono text-sm
                         focus:border-warm-sand focus:outline-none"
              placeholder="285.00"
            />
          </div>
        </div>

        <div>
          <label className="archive-label text-[0.6rem] block mb-1.5">Description</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            className="w-full border border-pale-stone bg-cream px-3 py-2.5 font-mono text-sm
                       focus:border-warm-sand focus:outline-none resize-none"
          />
        </div>

        <div className="grid md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="archive-label text-[0.6rem] block mb-1.5">Status</label>
            <select
              value={form.status}
              onChange={e => setForm(p => ({ ...p, status: e.target.value as Drop['status'] }))}
              className="w-full border border-pale-stone bg-cream px-3 py-2.5 font-mono text-sm
                         focus:border-warm-sand focus:outline-none"
            >
              <option value="upcoming">Upcoming</option>
              <option value="live">Live</option>
              <option value="sold_out">Sold Out</option>
            </select>
          </div>
          <div>
            <label className="archive-label text-[0.6rem] block mb-1.5">Drop Date</label>
            <input
              type="datetime-local"
              value={form.drop_date}
              onChange={e => setForm(p => ({ ...p, drop_date: e.target.value }))}
              className="w-full border border-pale-stone bg-cream px-3 py-2.5 font-mono text-sm
                         focus:border-warm-sand focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox" id="drop-available"
              checked={form.available}
              onChange={e => setForm(p => ({ ...p, available: e.target.checked }))}
              className="accent-warm-sand w-4 h-4"
            />
            <label htmlFor="drop-available" className="archive-label text-[0.62rem] cursor-pointer">
              Mark as available
            </label>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit" disabled={saving}
            className="px-6 py-2.5 bg-near-black text-linen-peach font-mono text-xs tracking-wider
                       uppercase hover:bg-burnished disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Create Drop'}
          </button>
          {message && <p className="archive-label text-[0.62rem] text-burnished">{message}</p>}
        </div>
      </form>

      {/* Drops list */}
      {loading ? (
        <p className="font-mono text-sm text-stone-grey">Loading...</p>
      ) : drops.length === 0 ? (
        <p className="font-mono text-sm text-stone-grey">No drops yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-pale-stone">
          {drops.map(drop => (
            <div key={drop.id} className="flex items-start justify-between gap-4 py-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className={`archive-label text-[0.58rem] px-1.5 py-0.5 ${statusColor[drop.status]}`}>
                    {drop.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="font-display text-near-black">{drop.name}</p>
                <p className="archive-label text-[0.58rem] text-stone-grey mt-0.5">
                  {drop.price ? `$${drop.price}` : '—'} · /{drop.slug}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
