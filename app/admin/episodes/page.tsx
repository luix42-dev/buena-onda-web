'use client'

import { useState, useEffect } from 'react'
import type { Episode } from '@/types'
import { getEpisodesClient } from '@/lib/api/client'

export default function AdminEpisodes() {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading,  setLoading]  = useState(true)
  const [form, setForm] = useState({
    title: '', description: '', audio_url: '', episode_number: '',
    duration: '', tags: '', published: false,
  })
  const [saving,  setSaving]  = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    getEpisodesClient()
      .then(d => setEpisodes(d.episodes ?? []))
      .catch(() => setEpisodes([]))
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const payload = {
      title:          form.title,
      description:    form.description || undefined,
      audio_url:      form.audio_url   || undefined,
      episode_number: form.episode_number ? parseInt(form.episode_number) : undefined,
      duration:       form.duration       ? parseInt(form.duration)       : undefined,
      tags:           form.tags.split(',').map(t => t.trim()).filter(Boolean),
      published:      form.published,
    }

    const res = await fetch('/api/episodes', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })

    if (res.ok) {
      const { episode } = await res.json()
      setEpisodes(prev => [episode, ...prev])
      setForm({ title: '', description: '', audio_url: '', episode_number: '', duration: '', tags: '', published: false })
      setMessage('Episode created.')
    } else {
      setMessage('Error creating episode.')
    }

    setSaving(false)
  }

  return (
    <div>
      <div className="mb-8">
        <p className="archive-label text-[0.65rem] text-stone-grey">Admin</p>
        <h1 className="font-display text-near-black text-3xl mt-1">Radio Episodes</h1>
      </div>

      {/* Create form */}
      <form onSubmit={handleCreate} className="mb-12 p-6 border border-pale-stone bg-linen-white flex flex-col gap-4">
        <p className="archive-label text-[0.62rem] mb-2">New Episode</p>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="archive-label text-[0.6rem] block mb-1.5">Title *</label>
            <input
              type="text" required
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              className="w-full border border-pale-stone bg-cream px-3 py-2.5 font-mono text-sm
                         focus:border-warm-sand focus:outline-none"
              placeholder="Afro-Cuban Jazz at the Source"
            />
          </div>
          <div>
            <label className="archive-label text-[0.6rem] block mb-1.5">Episode #</label>
            <input
              type="number"
              value={form.episode_number}
              onChange={e => setForm(p => ({ ...p, episode_number: e.target.value }))}
              className="w-full border border-pale-stone bg-cream px-3 py-2.5 font-mono text-sm
                         focus:border-warm-sand focus:outline-none"
              placeholder="18"
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

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="archive-label text-[0.6rem] block mb-1.5">Audio URL</label>
            <input
              type="url"
              value={form.audio_url}
              onChange={e => setForm(p => ({ ...p, audio_url: e.target.value }))}
              className="w-full border border-pale-stone bg-cream px-3 py-2.5 font-mono text-sm
                         focus:border-warm-sand focus:outline-none"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="archive-label text-[0.6rem] block mb-1.5">Duration (seconds)</label>
            <input
              type="number"
              value={form.duration}
              onChange={e => setForm(p => ({ ...p, duration: e.target.value }))}
              className="w-full border border-pale-stone bg-cream px-3 py-2.5 font-mono text-sm
                         focus:border-warm-sand focus:outline-none"
              placeholder="7440"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 items-end">
          <div>
            <label className="archive-label text-[0.6rem] block mb-1.5">Tags</label>
            <input
              type="text"
              value={form.tags}
              onChange={e => setForm(p => ({ ...p, tags: e.target.value }))}
              className="w-full border border-pale-stone bg-cream px-3 py-2.5 font-mono text-sm
                         focus:border-warm-sand focus:outline-none"
              placeholder="Jazz, Cuba, Archive"
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox" id="ep-published"
              checked={form.published}
              onChange={e => setForm(p => ({ ...p, published: e.target.checked }))}
              className="accent-warm-sand w-4 h-4"
            />
            <label htmlFor="ep-published" className="archive-label text-[0.62rem] cursor-pointer">
              Publish immediately
            </label>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit" disabled={saving}
            className="px-6 py-2.5 bg-near-black text-linen-peach font-mono text-xs tracking-wider
                       uppercase hover:bg-burnished disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Create Episode'}
          </button>
          {message && <p className="archive-label text-[0.62rem] text-burnished">{message}</p>}
        </div>
      </form>

      {/* Episodes list */}
      {loading ? (
        <p className="font-mono text-sm text-stone-grey">Loading...</p>
      ) : episodes.length === 0 ? (
        <p className="font-mono text-sm text-stone-grey">No episodes yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-pale-stone">
          {episodes.map(ep => (
            <div key={ep.id} className="flex items-start justify-between gap-4 py-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  {ep.episode_number && (
                    <span className="archive-label text-[0.58rem] text-warm-sand">
                      EP·{String(ep.episode_number).padStart(2, '0')}
                    </span>
                  )}
                  <span className={`archive-label text-[0.58rem] px-1.5 py-0.5 ${
                    ep.published ? 'bg-terracotta/20 text-terracotta' : 'bg-pale-stone text-stone-grey'
                  }`}>
                    {ep.published ? 'Published' : 'Draft'}
                  </span>
                </div>
                <p className="font-display text-near-black">{ep.title}</p>
                <p className="archive-label text-[0.58rem] text-stone-grey mt-0.5">
                  {ep.duration ? `${Math.floor(ep.duration / 60)}m` : '—'} · {new Date(ep.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
