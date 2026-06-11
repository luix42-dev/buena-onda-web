'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAdminThemes, adminUpload } from '@/lib/api/admin'

interface ThemeOption { id: string; title: string; code: string }

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

export default function NewItemPage() {
  const router = useRouter()

  // Themes
  const [themes, setThemes] = useState<ThemeOption[]>([])

  // Core fields
  const [title,   setTitle]   = useState('')
  const [slug,    setSlug]    = useState('')
  const [themeId, setThemeId] = useState('')
  const [price,   setPrice]   = useState('')
  const [buyUrl,  setBuyUrl]  = useState('')
  const [desc,    setDesc]    = useState('')
  const [tags,    setTags]    = useState('')
  const [status,  setStatus]  = useState('draft')

  // Detail fields (saved in details JSONB)
  const [why,        setWhy]       = useState('')
  const [era,        setEra]       = useState('')
  const [dimensions, setDimensions] = useState('')
  const [condition,  setCondition] = useState('')
  const [origin,     setOrigin]    = useState('')

  // Image upload
  const fileRef                  = useRef<HTMLInputElement>(null)
  const [file,    setFile]       = useState<File | null>(null)
  const [preview, setPreview]    = useState<string | null>(null)

  // State
  const [step,      setStep]      = useState<'form' | 'uploading' | 'saving' | 'done'>('form')
  const [error,     setError]     = useState<string | null>(null)
  const [progress,  setProgress]  = useState(0)
  const [createdId, setCreatedId] = useState<string | null>(null)

  useEffect(() => {
    getAdminThemes()
      .then((data) => setThemes(data as unknown as ThemeOption[]))
      .catch(() => {})
  }, [])

  const handleTitleChange = (v: string) => {
    setTitle(v)
    if (!slug || slug === slugify(title)) setSlug(slugify(v))
  }

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

    // ── Step 1: Upload image (if any) ──────────────────────────────────────
    let imageUrl: string | null = null

    if (file) {
      setStep('uploading')
      setProgress(10)
      try {
        const uploadData = await adminUpload(file, 'catalog')
        imageUrl = uploadData.url
        setProgress(90)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Image upload failed.')
        setStep('form')
        return
      }
    }

    // ── Step 2: Build details object ───────────────────────────────────────
    const details: Record<string, string> = {}
    if (why)        details.why_we_chose_this = why
    if (era)        details.era               = era
    if (dimensions) details.dimensions        = dimensions
    if (condition)  details.condition         = condition
    if (origin)     details.origin            = origin

    // ── Step 3: Create item ────────────────────────────────────────────────
    setStep('saving')

    try {
      const payload = {
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
      }

      const res = await fetch('/api/admin/items', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as Record<string, string>).error ?? 'Failed to save item.')
      }

      const data = await res.json()
      setCreatedId(data.id)
      setProgress(100)
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save item.')
      setStep('form')
    }
  }

  // ── Done state ──────────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="max-w-lg py-16">
        <span className="font-mono text-2xl text-warm-sand">✓</span>
        <h2 className="font-display text-near-black text-2xl mt-3">Item created.</h2>
        <p className="font-mono text-sm text-charcoal mt-2">
          The item has been saved.
        </p>
        <div className="flex gap-4 mt-8">
          <button
            onClick={() => router.push('/admin/items')}
            className="px-6 py-3 bg-near-black text-linen-peach font-mono text-xs
                       tracking-[0.2em] uppercase hover:bg-burnished transition-colors"
          >
            Back to catalog →
          </button>
          {createdId && (
            <button
              onClick={() => router.push(`/admin/items/${createdId}/edit`)}
              className="px-6 py-3 border border-pale-stone font-mono text-xs
                         tracking-[0.15em] uppercase text-stone-grey
                         hover:border-burnished transition-colors"
            >
              Edit item
            </button>
          )}
        </div>
      </div>
    )
  }

  const inputCls = `w-full border border-pale-stone bg-transparent px-4 py-3
                    font-mono text-sm text-near-black placeholder:text-stone-grey
                    focus:border-warm-sand focus:outline-none transition-colors`
  const labelCls = `archive-label text-[0.62rem] block mb-2`
  const isLoading = step === 'uploading' || step === 'saving'

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <p className="archive-label text-[0.65rem] text-stone-grey">Admin · Catalog</p>
        <h1 className="font-display text-near-black text-3xl mt-1">New Item</h1>
        <p className="font-mono text-xs text-stone-grey mt-1">
          Upload a photo and fill in the details.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        {/* ── Photo upload ─────────────────────────────────────────────── */}
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
                  className="w-full max-h-72 object-contain grayscale group-hover:grayscale-0
                             transition-all duration-500" />
                <div className="absolute inset-0 flex items-end justify-end p-3">
                  <span className="archive-label text-[0.55rem] bg-near-black/80 text-linen-peach px-2 py-1">
                    {file ? formatBytes(file.size) : ''}
                  </span>
                </div>
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
              onClick={e => { e.stopPropagation(); setFile(null); setPreview(null) }}
              className="mt-2 font-mono text-xs text-stone-grey hover:text-rose-magenta transition-colors">
              Remove photo
            </button>
          )}
        </div>

        {/* ── Basic fields ─────────────────────────────────────────────── */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className={labelCls} htmlFor="title">Title *</label>
            <input id="title" type="text" required placeholder="1970s Rattan Chair"
              value={title} onChange={e => handleTitleChange(e.target.value)}
              className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="slug">Slug *</label>
            <input id="slug" type="text" required placeholder="1970s-rattan-chair"
              value={slug} onChange={e => setSlug(e.target.value)}
              className={inputCls} />
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
              value={price} onChange={e => setPrice(e.target.value)}
              className={inputCls} />
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
            <label className={labelCls} htmlFor="buy_url">Buy URL (optional)</label>
            <input id="buy_url" type="url" placeholder="https://..."
              value={buyUrl} onChange={e => setBuyUrl(e.target.value)}
              className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls} htmlFor="desc">Description</label>
          <textarea id="desc" rows={3} placeholder="Object provenance, condition notes..."
            value={desc} onChange={e => setDesc(e.target.value)}
            className={`${inputCls} resize-none`} />
        </div>

        <div>
          <label className={labelCls} htmlFor="tags">Tags (comma-separated)</label>
          <input id="tags" type="text" placeholder="vinyl, 70s, warm, analog"
            value={tags} onChange={e => setTags(e.target.value)}
            className={inputCls} />
        </div>

        {/* ── Detail fields ─────────────────────────────────────────────── */}
        <div className="border-t border-pale-stone pt-6">
          <p className="archive-label text-[0.65rem] text-stone-grey mb-4">Object Details</p>

          <div className="flex flex-col gap-5">
            <div>
              <label className={labelCls} htmlFor="why">Why We Chose This</label>
              <textarea id="why" rows={3}
                placeholder="The cultural and design significance of this piece..."
                value={why} onChange={e => setWhy(e.target.value)}
                className={`${inputCls} resize-none`} />
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className={labelCls} htmlFor="era">Era</label>
                <input id="era" type="text" placeholder="e.g. 1990s, Miami Modern"
                  value={era} onChange={e => setEra(e.target.value)}
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="origin">Origin</label>
                <input id="origin" type="text" placeholder="e.g. Miami, FL"
                  value={origin} onChange={e => setOrigin(e.target.value)}
                  className={inputCls} />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className={labelCls} htmlFor="dimensions">Dimensions</label>
                <input id="dimensions" type="text" placeholder={`e.g. 13" × 40" × 69"`}
                  value={dimensions} onChange={e => setDimensions(e.target.value)}
                  className={inputCls} />
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

        {/* Progress bar */}
        {isLoading && (
          <div className="w-full bg-pale-stone h-0.5">
            <div
              className="h-0.5 bg-warm-sand transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {error && (
          <p className="archive-label text-[0.6rem] text-rose-magenta">{error}</p>
        )}

        <div className="flex gap-4 pt-2">
          <button type="submit" disabled={isLoading}
            className="px-8 py-3.5 bg-near-black text-linen-peach
                       font-mono text-xs tracking-[0.2em] uppercase
                       hover:bg-burnished disabled:opacity-50 transition-colors">
            {step === 'uploading' ? 'Uploading...'
              : step === 'saving' ? 'Saving...'
              : 'Save item →'}
          </button>
          <button type="button" disabled={isLoading} onClick={() => router.back()}
            className="px-6 py-3.5 border border-pale-stone font-mono text-xs
                       tracking-[0.15em] uppercase text-stone-grey
                       hover:border-burnished disabled:opacity-30 transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
