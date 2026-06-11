'use client'

import { useState, useEffect, useCallback } from 'react'

interface DBItem {
  id:         string
  slug:       string
  year:       string
  title:      string
  summary:    string
  story:      string
  photo:      string | null
  photos:     string[]
  sort_order: number
}

type EditState = DBItem

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="font-mono text-[0.58rem] tracking-[0.2em] uppercase text-stone-grey">
        {label}
      </label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full bg-linen-white border border-pale-stone px-3 py-2 font-mono text-xs text-near-black ' +
  'focus:outline-none focus:border-burnished transition-colors'

export default function TimelineAdminPage() {
  const [items, setItems]     = useState<DBItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<EditState | null>(null)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState<string | null>(null)
  const [error, setError]     = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/timeline')
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } catch {
      setError('Failed to load timeline.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function openEdit(item: DBItem) {
    setEditing({ ...item, photos: [...item.photos] })
    setSaved(null)
    setError(null)
  }

  async function handleSave() {
    if (!editing) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/timeline/${editing.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          year:    editing.year,
          title:   editing.title,
          summary: editing.summary,
          story:   editing.story,
          photo:   editing.photo,
          photos:  editing.photos,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as Record<string, string>).error ?? 'Save failed')
      }
      const updated: DBItem = await res.json()
      setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
      setSaved(updated.title)
      setEditing(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <p className="font-mono text-[0.62rem] tracking-[0.2em] uppercase text-stone-grey">
          Admin · Timeline
        </p>
        <h1 className="font-display text-near-black text-3xl mt-1">Timeline Editor</h1>
        <p className="font-mono text-xs text-stone-grey mt-2 max-w-lg">
          Click any era to edit its year, title, story, and photos.
          Changes go live immediately — no deploy needed.
        </p>
      </div>

      {/* Banners */}
      {saved && (
        <div className="mb-6 px-4 py-3 border font-mono text-xs"
          style={{ borderColor: '#2A9D9D', color: '#2A9D9D', background: 'rgba(42,157,157,0.06)' }}>
          ✓ &ldquo;{saved}&rdquo; saved.
        </div>
      )}
      {error && (
        <div className="mb-6 px-4 py-3 border font-mono text-xs"
          style={{ borderColor: '#D9685A', color: '#D9685A', background: 'rgba(217,104,90,0.06)' }}>
          {error}
        </div>
      )}

      {/* Entry list */}
      {loading ? (
        <p className="font-mono text-xs text-stone-grey">Loading…</p>
      ) : (
        <div className="flex flex-col divide-y divide-pale-stone border border-pale-stone mb-10">
          {items.map((item, i) => (
            <div key={item.id}
              className="flex items-start gap-4 px-5 py-4 bg-linen-white hover:bg-sand-bg transition-colors"
            >
              <span className="font-mono text-[0.55rem] text-stone-grey mt-0.5 flex-shrink-0 w-5"
                style={{ letterSpacing: '0.12em' }}>
                {String(i).padStart(2, '0')}
              </span>

              <div className="flex-1 min-w-0">
                <p className="font-display text-near-black text-base">
                  {item.year} — {item.title}
                </p>
                <p className="font-mono text-[0.6rem] text-stone-grey mt-0.5 truncate max-w-sm">
                  {item.summary}
                </p>
                <div className="flex gap-3 mt-1.5">
                  <span className="font-mono text-[0.55rem] text-stone-grey">
                    {item.photos.length} photo{item.photos.length !== 1 ? 's' : ''}
                  </span>
                  {item.photo && (
                    <span className="font-mono text-[0.55rem]" style={{ color: '#2A9D9D' }}>
                      hero ✓
                    </span>
                  )}
                </div>
              </div>

              <button onClick={() => openEdit(item)}
                className="flex-shrink-0 font-mono text-[0.58rem] tracking-[0.15em] uppercase
                           border border-pale-stone px-3 py-1.5 text-stone-grey
                           hover:border-burnished hover:text-burnished transition-colors">
                Edit →
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Edit panel */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-end"
          style={{ background: 'rgba(13,13,13,0.45)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setEditing(null) }}
        >
          <div className="h-full w-full max-w-xl bg-cream overflow-y-auto flex flex-col"
            style={{ boxShadow: '-4px 0 24px rgba(0,0,0,0.18)' }}>

            {/* Panel header */}
            <div className="px-7 py-5 border-b border-pale-stone flex items-center justify-between bg-sand-bg">
              <div>
                <p className="font-mono text-[0.58rem] tracking-[0.2em] uppercase text-stone-grey">
                  Editing era
                </p>
                <p className="font-display text-near-black text-lg mt-0.5">
                  {editing.year} — {editing.title}
                </p>
              </div>
              <button onClick={() => setEditing(null)}
                className="font-mono text-stone-grey hover:text-near-black text-xl leading-none"
                aria-label="Close">
                ×
              </button>
            </div>

            {/* Fields */}
            <div className="flex-1 px-7 py-6 flex flex-col gap-5">
              {error && (
                <p className="font-mono text-[0.6rem]" style={{ color: '#D9685A' }}>{error}</p>
              )}

              <Field label="Year">
                <input className={inputCls} value={editing.year}
                  onChange={e => setEditing(s => s && { ...s, year: e.target.value })} />
              </Field>

              <Field label="Title">
                <input className={inputCls} value={editing.title}
                  onChange={e => setEditing(s => s && { ...s, title: e.target.value })} />
              </Field>

              <Field label="Summary (one line)">
                <input className={inputCls} value={editing.summary}
                  onChange={e => setEditing(s => s && { ...s, summary: e.target.value })} />
              </Field>

              <Field label="Hero photo URL">
                <input className={inputCls} placeholder="/images/about/..." value={editing.photo ?? ''}
                  onChange={e => setEditing(s => s && { ...s, photo: e.target.value || null })} />
              </Field>

              <Field label="Story (blank line = new paragraph)">
                <textarea className={inputCls} rows={10} value={editing.story}
                  onChange={e => setEditing(s => s && { ...s, story: e.target.value })}
                  style={{ resize: 'vertical' }} />
              </Field>

              <Field label="Gallery photos (one URL per line)">
                <textarea className={inputCls} rows={4}
                  placeholder="/images/about/photo1.jpg&#10;/images/about/photo2.jpg"
                  value={editing.photos.join('\n')}
                  onChange={e => setEditing(s => s && {
                    ...s,
                    photos: e.target.value.split('\n').map(l => l.trim()).filter(Boolean),
                  })}
                  style={{ resize: 'vertical' }} />
                <p className="font-mono text-[0.55rem] text-stone-grey">
                  {editing.photos.length} photo{editing.photos.length !== 1 ? 's' : ''} listed
                </p>
              </Field>
            </div>

            {/* Actions */}
            <div className="px-7 py-5 border-t border-pale-stone bg-sand-bg flex gap-3">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 font-mono text-[0.62rem] tracking-[0.2em] uppercase
                           text-white disabled:opacity-50 transition-opacity"
                style={{ background: '#2A9D9D' }}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button onClick={() => setEditing(null)}
                className="px-5 py-2.5 font-mono text-[0.62rem] tracking-[0.2em] uppercase
                           border border-pale-stone text-stone-grey hover:border-burnished
                           hover:text-burnished transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
