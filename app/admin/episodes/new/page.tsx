'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function NewEpisodePage() {
  const router = useRouter()

  const [title,         setTitle]         = useState('')
  const [slug,          setSlug]          = useState('')
  const [episodeNumber, setEpisodeNumber] = useState('')
  const [desc,          setDesc]          = useState('')
  const [audioUrl,      setAudioUrl]      = useState('')
  const [duration,      setDuration]      = useState('')
  const [tags,          setTags]          = useState('')
  const [published,     setPublished]     = useState(false)

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
      const res = await fetch('/api/admin/episodes', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description:    desc || null,
          audio_url:      audioUrl || null,
          episode_number: episodeNumber ? parseInt(episodeNumber) : null,
          duration:       duration ? parseInt(duration) : null,
          tags:           tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          published,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as Record<string, string>).error ?? 'Failed to create episode.')
      }

      router.push('/admin/episodes')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create episode.')
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
        <p className="archive-label text-[0.65rem] text-stone-grey">Admin · Radio</p>
        <h1 className="font-display text-near-black text-3xl mt-1">New Episode</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        {/* Title + Episode number */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <label className={labelCls} htmlFor="title">Title *</label>
            <input id="title" type="text" required
              placeholder="Afro-Cuban Jazz at the Source"
              value={title} onChange={e => handleTitleChange(e.target.value)}
              className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="ep-number">Episode #</label>
            <input id="ep-number" type="number" min="1" placeholder="18"
              value={episodeNumber} onChange={e => setEpisodeNumber(e.target.value)}
              className={inputCls} />
          </div>
        </div>

        {/* Slug */}
        <div>
          <label className={labelCls} htmlFor="slug">Slug</label>
          <input id="slug" type="text" placeholder="afro-cuban-jazz-at-the-source"
            value={slug} onChange={e => setSlug(e.target.value)}
            className={inputCls} />
        </div>

        {/* Description */}
        <div>
          <label className={labelCls} htmlFor="desc">Description</label>
          <textarea id="desc" rows={3}
            placeholder="Episode notes, tracklist, context..."
            value={desc} onChange={e => setDesc(e.target.value)}
            className={`${inputCls} resize-none`} />
        </div>

        {/* Audio URL + Duration */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className={labelCls} htmlFor="audio-url">Audio URL</label>
            <input id="audio-url" type="url" placeholder="https://..."
              value={audioUrl} onChange={e => setAudioUrl(e.target.value)}
              className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="duration">Duration (seconds)</label>
            <input id="duration" type="number" min="0" placeholder="7440"
              value={duration} onChange={e => setDuration(e.target.value)}
              className={inputCls} />
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className={labelCls} htmlFor="tags">Tags (comma-separated)</label>
          <input id="tags" type="text" placeholder="Jazz, Cuba, Archive"
            value={tags} onChange={e => setTags(e.target.value)}
            className={inputCls} />
        </div>

        {/* Published */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox" id="published"
            checked={published}
            onChange={e => setPublished(e.target.checked)}
            className="accent-warm-sand w-4 h-4"
          />
          <label htmlFor="published" className="archive-label text-[0.62rem] cursor-pointer">
            Publish immediately
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
            {saving ? 'Saving...' : 'Create episode →'}
          </button>
          <button type="button" disabled={saving} onClick={() => router.push('/admin/episodes')}
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
