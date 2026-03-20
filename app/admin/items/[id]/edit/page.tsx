'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAdminThemes, adminUpload } from '@/lib/api/admin'
import type { Item } from '@/types'

interface ThemeOption { id: string; title: string; code: string }

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

export default function EditItemPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router  = useRouter()

  const [themes,  setThemes]  = useState<ThemeOption[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Core fields
  const [title,   setTitle]   = useState('')
  const [slug,    setSlug]    = useState('')
  const [themeId, setThemeId] = useState('')
  const [price,   setPrice]   = useState('')
  const [buyUrl,  setBuyUrl]  = useState('')
  const [desc,    setDesc]    = useState('')
  const [tags,    setTags]    = useState('')
  const [status,  setStatus]  = useState('draft')

  // Detail fields
  const [why,        setWhy]        = useState('')
  const [era,        setEra]        = useState('')
  const [dimensions, setDimensions] = useState('')
  const [condition,  setCondition]  = useState('')
  const [origin,     setOrigin]     = useState('')

  // Image
  const fileRef                  = useRef<HTMLInputElement>(null)
  const [existingImg, setExistingImg] = useState<string | null>(null)
  const [file,    setFile]       = useState<File | null>(null)
  const [preview, setPreview]    = useState<string | null>(null)

  // State
  const [saving, setSaving]   = useState(false)
  const [saved,  setSaved]    = useState(false)
  const [error,  setError]    = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/items/${id}`).then(r => r.ok ? r.json() : Promise.reject()),
      getAdminThemes(),
    ])
      .then(([item, themesData]: [Item, ThemeOption[]]) => {
        setTitle(item.title)
        setSlug(item.slug)
        setThemeId(item.theme_id ?? '')
        setPrice(item.price != null ? String(item.price) : '')
        setBuyUrl(item.buy_url ?? '')
        setDesc(item.description ?? '')
        setTags((item.tags ?? []).join(', '))
        setStatus(item.status)
        setExistingImg(item.cover_image_url ?? null)
        setPreview(item.cover_image_url ?? null)

        const d = item.details ?? {}
        setWhy(d.why_we_chose_this ?? '')
        setEra(d.era ?? '')
        setDimensions(d.dimensions ?? '')
        setCondition(d.condition ?? '')
        setOrigin(d.origin ?? '')

        setThemes(themesData as unknown as ThemeOption[])
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (!f || !f.type.startsWith('image/')) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !slug) { setError('Title and slug are required.'); return }
    setError(null)
    setSaving(true)

    let imageUrl: string | null = existingImg

    if (file) {
      try {
        const uploadData = await adminUpload(file, 'catalog')
        imageUrl = uploadData.url
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Image upload failed.')
        setSaving(false)
        return
      }
    }

    const details: Record<string, string> = {}
    if (why)        details.why_we_chose_this = why
    if (era)        details.era               = era
    if (dimensions) details.dimensions        = dimensions
    if (condition)  details.condition         = condition
    if (origin)     details.origin            = origin

    try {
      const res = await fetch(`/api/admin/items/${id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          title,
          slug,
          theme_id:        themeId || null,
          price:           price ? parseFloat(price) : null,
          buy_url:         buyUrl || null,
          description:     desc || null,
          tags:            tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          cover_image_url: imageUrl,
          status,
          details:         Object.keys(details).length > 0 ? details : null,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as Record<string, string>).error ?? 'Failed to save.')
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = `w-full border border-pale-stone bg-transparent px-4 py-3
                    font-mono text-sm text-near-black placeholder:text-stone-grey
                    focus:border-warm-sand focus:outline-none transition-colors`
  const labelCls = `archive-label text-[0.62rem] block mb-2`

  if (loading) return <p className="font-mono text-sm text-stone-grey">Loading…</p>
  if (notFound) return <p className="font-mono text-sm text-rose-magenta">Item not found.</p>

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <p className="archive-label text-[0.65rem] text-stone-grey">Admin · Catalog</p>
        <h1 className="font-display text-near-black text-3xl mt-1">Edit Item</h1>
        <p className="font-mono text-xs text-stone-grey mt-1 truncate max-w-md">{title}</p>
      </div>

      {saved && (
        <div className="mb-6 px-4 py-3 border font-mono text-xs"
          style={{ borderColor: '#2A9D9D', color: '#2A9D9D', background: 'rgba(42,157,157,0.06)' }}>
          ✓ Saved successfully.
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        {/* Photo */}
        <div>
          <label className={labelCls}>Photo</label>
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="relative border-2 border-dashed border-pale-stone hover:border-warm-sand
                       transition-colors cursor-pointer bg-sand-bg/40 group"
          >
            {preview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Preview"
                  className="w-full max-h-72 object-contain grayscale group-hover:grayscale-0 transition-all duration-500" />
                {file && (
                  <div className="absolute inset-0 flex items-end justify-end p-3">
                    <span className="archive-label text-[0.55rem] bg-near-black/80 text-linen-peach px-2 py-1">
                      {formatBytes(file.size)} — new upload
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center gap-2 text-stone-grey">
                <span className="font-mono text-2xl">↑</span>
                <p className="font-mono text-xs">Drop image here or click to browse</p>
                <p className="archive-label text-[0.55rem]">JPEG · PNG · WEBP</p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          {preview && (
            <button type="button"
              onClick={e => { e.stopPropagation(); setFile(null); setPreview(null); setExistingImg(null) }}
              className="mt-2 font-mono text-xs text-stone-grey hover:text-rose-magenta transition-colors">
              Remove photo
            </button>
          )}
        </div>

        {/* Basic fields */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className={labelCls} htmlFor="title">Title *</label>
            <input id="title" type="text" required value={title}
              onChange={e => setTitle(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="slug">Slug *</label>
            <input id="slug" type="text" required value={slug}
              onChange={e => setSlug(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls} htmlFor="theme">Theme</label>
          <select id="theme" value={themeId} onChange={e => setThemeId(e.target.value)}
            className={`${inputCls} appearance-none cursor-pointer`}
            style={{ backgroundColor: 'transparent' }}>
            <option value="">No theme</option>
            {themes.map(t => (
              <option key={t.id} value={t.id}>{t.title} ({t.code})</option>
            ))}
          </select>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <label className={labelCls} htmlFor="price">Price (USD)</label>
            <input id="price" type="number" step="0.01" min="0" placeholder="0.00"
              value={price} onChange={e => setPrice(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="status">Status</label>
            <select id="status" value={status} onChange={e => setStatus(e.target.value)}
              className={`${inputCls} appearance-none cursor-pointer`}
              style={{ backgroundColor: 'transparent' }}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="sold_out">Sold Out</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="buy_url">Buy URL</label>
            <input id="buy_url" type="url" placeholder="https://..."
              value={buyUrl} onChange={e => setBuyUrl(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls} htmlFor="desc">Description</label>
          <textarea id="desc" rows={3} value={desc}
            onChange={e => setDesc(e.target.value)} className={`${inputCls} resize-none`} />
        </div>

        <div>
          <label className={labelCls} htmlFor="tags">Tags (comma-separated)</label>
          <input id="tags" type="text" placeholder="vinyl, 70s, warm, analog"
            value={tags} onChange={e => setTags(e.target.value)} className={inputCls} />
        </div>

        {/* Detail fields */}
        <div className="border-t border-pale-stone pt-6">
          <p className="archive-label text-[0.65rem] text-stone-grey mb-4">Object Details</p>
          <div className="flex flex-col gap-5">
            <div>
              <label className={labelCls} htmlFor="why">Why We Chose This</label>
              <textarea id="why" rows={3} value={why}
                onChange={e => setWhy(e.target.value)} className={`${inputCls} resize-none`} />
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className={labelCls} htmlFor="era">Era</label>
                <input id="era" type="text" placeholder="e.g. 1970s"
                  value={era} onChange={e => setEra(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="origin">Origin</label>
                <input id="origin" type="text" placeholder="e.g. Miami, FL"
                  value={origin} onChange={e => setOrigin(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className={labelCls} htmlFor="dimensions">Dimensions</label>
                <input id="dimensions" type="text" placeholder={`e.g. 13" × 40"`}
                  value={dimensions} onChange={e => setDimensions(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="condition">Condition</label>
                <select id="condition" value={condition} onChange={e => setCondition(e.target.value)}
                  className={`${inputCls} appearance-none cursor-pointer`}
                  style={{ backgroundColor: 'transparent' }}>
                  <option value="">Select condition</option>
                  <option value="Excellent">Excellent</option>
                  <option value="Very Good">Very Good</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <p className="archive-label text-[0.6rem] text-rose-magenta">{error}</p>
        )}

        <div className="flex gap-4 pt-2">
          <button type="submit" disabled={saving}
            className="px-8 py-3.5 bg-near-black text-linen-peach
                       font-mono text-xs tracking-[0.2em] uppercase
                       hover:bg-burnished disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : 'Save changes →'}
          </button>
          <button type="button" onClick={() => router.push('/admin/items')}
            className="px-6 py-3.5 border border-pale-stone font-mono text-xs
                       tracking-[0.15em] uppercase text-stone-grey
                       hover:border-burnished transition-colors">
            ← Back to catalog
          </button>
        </div>
      </form>
    </div>
  )
}
