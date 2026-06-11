'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createAdminTheme } from '@/lib/api/admin'

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function NewThemePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const [title,         setTitle]         = useState('')
  const [slug,          setSlug]          = useState('')
  const [code,          setCode]          = useState('')
  const [description,   setDescription]   = useState('')
  const [editorialText, setEditorialText] = useState('')
  const [featured,      setFeatured]      = useState(false)
  const [published,     setPublished]     = useState(false)
  const [sortOrder,     setSortOrder]     = useState(0)

  const handleTitleChange = (v: string) => {
    setTitle(v)
    if (!slug || slug === slugify(title)) setSlug(slugify(v))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await createAdminTheme({
        title, slug, code: code.toUpperCase(),
        description, editorial_text: editorialText,
        featured, published, sort_order: sortOrder,
      })
      router.push('/admin/themes')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create theme')
      setLoading(false)
    }
  }

  const inputCls = `w-full border border-pale-stone bg-transparent px-4 py-3
                    font-mono text-sm text-near-black placeholder:text-stone-grey
                    focus:border-warm-sand focus:outline-none transition-colors`
  const labelCls = `archive-label text-[0.62rem] block mb-2`

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <p className="archive-label text-[0.65rem] text-stone-grey">Admin · Themes</p>
        <h1 className="font-display text-near-black text-3xl mt-1">New Theme</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className={labelCls} htmlFor="title">Title *</label>
            <input id="title" type="text" required placeholder="Vinyl Revival"
              value={title} onChange={e => handleTitleChange(e.target.value)}
              className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="code">Code * (2–6 chars)</label>
            <input id="code" type="text" required placeholder="VNL" maxLength={6}
              value={code} onChange={e => setCode(e.target.value.toUpperCase())}
              className={`${inputCls} uppercase tracking-widest`} />
            <p className="archive-label text-[0.55rem] text-stone-grey mt-1">
              Used in catalog number: BO-{code || 'XXX'}-2025-0001
            </p>
          </div>
        </div>

        <div>
          <label className={labelCls} htmlFor="slug">Slug *</label>
          <input id="slug" type="text" required placeholder="vinyl-revival"
            value={slug} onChange={e => setSlug(e.target.value)}
            className={inputCls} />
        </div>

        <div>
          <label className={labelCls} htmlFor="description">Short description</label>
          <input id="description" type="text" placeholder="One-line teaser"
            value={description} onChange={e => setDescription(e.target.value)}
            className={inputCls} />
        </div>

        <div>
          <label className={labelCls} htmlFor="editorial">Editorial text (markdown)</label>
          <textarea id="editorial" rows={6} placeholder="The story behind this theme..."
            value={editorialText} onChange={e => setEditorialText(e.target.value)}
            className={`${inputCls} resize-none`} />
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <label className={labelCls} htmlFor="sort_order">Sort order</label>
            <input id="sort_order" type="number" min={0}
              value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))}
              className={inputCls} />
          </div>

          <div className="flex items-end pb-3 gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={featured}
                onChange={e => setFeatured(e.target.checked)}
                className="accent-warm-sand" />
              <span className="font-mono text-xs text-near-black">Featured</span>
            </label>
          </div>

          <div className="flex items-end pb-3 gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={published}
                onChange={e => setPublished(e.target.checked)}
                className="accent-warm-sand" />
              <span className="font-mono text-xs text-near-black">Published</span>
            </label>
          </div>
        </div>

        {error && (
          <p className="archive-label text-[0.6rem] text-rose-magenta">{error}</p>
        )}

        <div className="flex gap-4 pt-2">
          <button type="submit" disabled={loading}
            className="px-8 py-3.5 bg-near-black text-linen-peach
                       font-mono text-xs tracking-[0.2em] uppercase
                       hover:bg-burnished disabled:opacity-50 transition-colors">
            {loading ? 'Saving...' : 'Create theme →'}
          </button>
          <button type="button" onClick={() => router.back()}
            className="px-6 py-3.5 border border-pale-stone font-mono text-xs
                       tracking-[0.15em] uppercase text-stone-grey
                       hover:border-burnished transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
