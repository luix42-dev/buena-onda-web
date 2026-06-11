'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function NewPostPage() {
  const router = useRouter()

  const [title,       setTitle]       = useState('')
  const [slug,        setSlug]        = useState('')
  const [excerpt,     setExcerpt]     = useState('')
  const [body,        setBody]        = useState('')
  const [coverImage,  setCoverImage]  = useState('')
  const [tags,        setTags]        = useState('')
  const [published,   setPublished]   = useState(false)

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  const handleTitleChange = (v: string) => {
    setTitle(v)
    if (!slug || slug === slugify(title)) setSlug(slugify(v))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title) { setError('Title is required.'); return }
    setError(null)
    setSaving(true)

    try {
      const res = await fetch('/api/admin/posts', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          title,
          excerpt:     excerpt || null,
          body:        body || null,
          cover_image: coverImage || null,
          tags:        tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          published,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as Record<string, string>).error ?? 'Failed to create post.')
      }

      router.push('/admin/posts')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post.')
      setSaving(false)
    }
  }

  const inputCls = `w-full border border-pale-stone bg-transparent px-4 py-3
                    font-mono text-sm text-near-black placeholder:text-stone-grey
                    focus:border-warm-sand focus:outline-none transition-colors`
  const labelCls = `archive-label text-[0.62rem] block mb-2`

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <p className="archive-label text-[0.65rem] text-stone-grey">Admin · Culture</p>
        <h1 className="font-display text-near-black text-3xl mt-1">New Post</h1>
        <p className="font-mono text-xs text-stone-grey mt-1">
          Fill in the details and save.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        {/* Title + Slug */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className={labelCls} htmlFor="title">Title *</label>
            <input id="title" type="text" required placeholder="The Record as Object"
              value={title} onChange={e => handleTitleChange(e.target.value)}
              className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="slug">Slug</label>
            <input id="slug" type="text" placeholder="the-record-as-object"
              value={slug} onChange={e => setSlug(e.target.value)}
              className={inputCls} />
          </div>
        </div>

        {/* Excerpt */}
        <div>
          <label className={labelCls} htmlFor="excerpt">Excerpt</label>
          <textarea id="excerpt" rows={2} placeholder="One-paragraph summary"
            value={excerpt} onChange={e => setExcerpt(e.target.value)}
            className={`${inputCls} resize-none`} />
        </div>

        {/* Body */}
        <div>
          <label className={labelCls} htmlFor="body">Body (Markdown)</label>
          <textarea id="body" rows={10} placeholder="Write in Markdown..."
            value={body} onChange={e => setBody(e.target.value)}
            className={`${inputCls} resize-y`} />
        </div>

        {/* Cover Image */}
        <div>
          <label className={labelCls} htmlFor="cover_image">Cover Image URL</label>
          <input id="cover_image" type="url" placeholder="https://..."
            value={coverImage} onChange={e => setCoverImage(e.target.value)}
            className={inputCls} />
        </div>

        {/* Tags + Published */}
        <div className="grid md:grid-cols-2 gap-6 items-end">
          <div>
            <label className={labelCls} htmlFor="tags">Tags (comma-separated)</label>
            <input id="tags" type="text" placeholder="Music, Objects, Miami"
              value={tags} onChange={e => setTags(e.target.value)}
              className={inputCls} />
          </div>
          <div className="flex items-center gap-3 pb-3">
            <input
              type="checkbox"
              id="published"
              checked={published}
              onChange={e => setPublished(e.target.checked)}
              className="accent-warm-sand w-4 h-4"
            />
            <label htmlFor="published" className={`${labelCls} mb-0 cursor-pointer`}>
              Publish immediately
            </label>
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
            {saving ? 'Saving...' : 'Save post →'}
          </button>
          <button type="button" disabled={saving} onClick={() => router.push('/admin/posts')}
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
