'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function EditThemePage({ params }: { params: { id: string } }) {
  const { id } = params
  const router  = useRouter()

  const [loading,  setLoading]  = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Fields
  const [title,         setTitle]         = useState('')
  const [slug,          setSlug]          = useState('')
  const [slugTouched,   setSlugTouched]   = useState(false)
  const [code,          setCode]          = useState('')
  const [description,   setDescription]   = useState('')
  const [editorialText, setEditorialText] = useState('')
  const [sortOrder,     setSortOrder]     = useState(0)
  const [featured,      setFeatured]      = useState(false)
  const [published,     setPublished]     = useState(false)
  const [coverImage,    setCoverImage]    = useState('')

  // State
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/admin/themes/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(theme => {
        setTitle(theme.title ?? '')
        setSlug(theme.slug ?? '')
        setSlugTouched(true)
        setCode(theme.code ?? '')
        setDescription(theme.description ?? '')
        setEditorialText(theme.editorial_text ?? '')
        setSortOrder(theme.sort_order ?? 0)
        setFeatured(theme.featured ?? false)
        setPublished(theme.published ?? false)
        setCoverImage(theme.cover_image ?? '')
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setTitle(val)
    if (!slugTouched) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
    }
  }

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(e.target.value)
    setSlugTouched(true)
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCode(e.target.value.toUpperCase().slice(0, 6))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !slug) { setError('Title and slug are required.'); return }
    setError(null)
    setSaving(true)

    try {
      const res = await fetch(`/api/admin/themes/${id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          title,
          slug,
          code,
          description:    description || null,
          editorial_text: editorialText || null,
          featured,
          published,
          sort_order:     sortOrder,
          cover_image:    coverImage || null,
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

  const inputCls = `w-full border border-pale-stone bg-transparent px-4 py-3 font-mono text-sm text-near-black placeholder:text-stone-grey focus:border-warm-sand focus:outline-none transition-colors`
  const labelCls = `archive-label text-[0.62rem] block mb-2`

  if (loading)  return <p className="font-mono text-sm text-stone-grey">Loading…</p>
  if (notFound) return <p className="font-mono text-sm text-rose-magenta">Theme not found.</p>

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <p className="archive-label text-[0.65rem] text-stone-grey">Admin · Themes</p>
        <h1 className="font-display text-near-black text-3xl mt-1">Edit Theme</h1>
        <p className="font-mono text-xs text-stone-grey mt-1 truncate max-w-md">{title}</p>
      </div>

      {saved && (
        <div className="mb-6 px-4 py-3 border font-mono text-xs"
          style={{ borderColor: '#2A9D9D', color: '#2A9D9D', background: 'rgba(42,157,157,0.06)' }}>
          ✓ Saved.
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        {/* Title & Slug */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className={labelCls} htmlFor="title">Title *</label>
            <input id="title" type="text" required value={title}
              onChange={handleTitleChange} className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="slug">Slug *</label>
            <input id="slug" type="text" required value={slug}
              onChange={handleSlugChange} className={inputCls} />
          </div>
        </div>

        {/* Code & Sort Order */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className={labelCls} htmlFor="code">Code (max 6 chars)</label>
            <input id="code" type="text" placeholder="e.g. VNL"
              value={code} onChange={handleCodeChange}
              maxLength={6} className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="sort_order">Sort Order</label>
            <input id="sort_order" type="number" min="0"
              value={sortOrder}
              onChange={e => setSortOrder(parseInt(e.target.value, 10) || 0)}
              className={inputCls} />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className={labelCls} htmlFor="description">Description</label>
          <input id="description" type="text" placeholder="Short description…"
            value={description} onChange={e => setDescription(e.target.value)}
            className={inputCls} />
        </div>

        {/* Editorial Text */}
        <div>
          <label className={labelCls} htmlFor="editorial_text">Editorial Text</label>
          <textarea id="editorial_text" rows={6} value={editorialText}
            onChange={e => setEditorialText(e.target.value)}
            className={`${inputCls} resize-none`} />
        </div>

        {/* Cover Image URL */}
        <div>
          <label className={labelCls} htmlFor="cover_image">Cover Image URL</label>
          <input id="cover_image" type="url" placeholder="https://…"
            value={coverImage} onChange={e => setCoverImage(e.target.value)}
            className={inputCls} />
        </div>

        {/* Checkboxes */}
        <div className="flex gap-8">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={featured}
              onChange={e => setFeatured(e.target.checked)}
              className="accent-near-black" />
            <span className={labelCls.replace('block mb-2', '')}>Featured</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={published}
              onChange={e => setPublished(e.target.checked)}
              className="accent-near-black" />
            <span className={labelCls.replace('block mb-2', '')}>Published</span>
          </label>
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
          <button type="button" onClick={() => router.push('/admin/themes')}
            className="px-6 py-3.5 border border-pale-stone font-mono text-xs
                       tracking-[0.15em] uppercase text-stone-grey
                       hover:border-burnished transition-colors">
            ← Back to themes
          </button>
        </div>
      </form>
    </div>
  )
}
