'use client'

import { useState, useEffect } from 'react'
import type { Post } from '@/types'

export default function AdminPosts() {
  const [posts,   setPosts]   = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    title: '', excerpt: '', body: '', cover_image: '', tags: '', published: false,
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/posts')
      .then(r => r.json())
      .then(d => setPosts(d.posts ?? []))
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const payload = {
      ...form,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    }

    const res = await fetch('/api/posts', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })

    if (res.ok) {
      const { post } = await res.json()
      setPosts(prev => [post, ...prev])
      setForm({ title: '', excerpt: '', body: '', cover_image: '', tags: '', published: false })
      setMessage('Post created.')
    } else {
      setMessage('Error creating post.')
    }

    setSaving(false)
  }

  return (
    <div>
      <div className="mb-8">
        <p className="archive-label text-[0.65rem] text-stone-grey">Admin</p>
        <h1 className="font-display text-near-black text-3xl mt-1">Posts</h1>
      </div>

      {/* Create form */}
      <form onSubmit={handleCreate} className="mb-12 p-6 border border-pale-stone bg-linen-white flex flex-col gap-4">
        <p className="archive-label text-[0.62rem] mb-2">New Post</p>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="archive-label text-[0.6rem] block mb-1.5">Title *</label>
            <input
              type="text" required
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              className="w-full border border-pale-stone bg-cream px-3 py-2.5 font-mono text-sm
                         focus:border-warm-sand focus:outline-none"
              placeholder="The Record as Object"
            />
          </div>
          <div>
            <label className="archive-label text-[0.6rem] block mb-1.5">Cover Image URL</label>
            <input
              type="url"
              value={form.cover_image}
              onChange={e => setForm(p => ({ ...p, cover_image: e.target.value }))}
              className="w-full border border-pale-stone bg-cream px-3 py-2.5 font-mono text-sm
                         focus:border-warm-sand focus:outline-none"
              placeholder="https://..."
            />
          </div>
        </div>

        <div>
          <label className="archive-label text-[0.6rem] block mb-1.5">Excerpt</label>
          <textarea
            rows={2}
            value={form.excerpt}
            onChange={e => setForm(p => ({ ...p, excerpt: e.target.value }))}
            className="w-full border border-pale-stone bg-cream px-3 py-2.5 font-mono text-sm
                       focus:border-warm-sand focus:outline-none resize-none"
            placeholder="One-paragraph summary"
          />
        </div>

        <div>
          <label className="archive-label text-[0.6rem] block mb-1.5">Body (Markdown)</label>
          <textarea
            rows={8}
            value={form.body}
            onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
            className="w-full border border-pale-stone bg-cream px-3 py-2.5 font-mono text-sm
                       focus:border-warm-sand focus:outline-none resize-y"
            placeholder="Write in Markdown..."
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4 items-end">
          <div>
            <label className="archive-label text-[0.6rem] block mb-1.5">Tags (comma-separated)</label>
            <input
              type="text"
              value={form.tags}
              onChange={e => setForm(p => ({ ...p, tags: e.target.value }))}
              className="w-full border border-pale-stone bg-cream px-3 py-2.5 font-mono text-sm
                         focus:border-warm-sand focus:outline-none"
              placeholder="Music, Objects, Miami"
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="published"
              checked={form.published}
              onChange={e => setForm(p => ({ ...p, published: e.target.checked }))}
              className="accent-warm-sand w-4 h-4"
            />
            <label htmlFor="published" className="archive-label text-[0.62rem] cursor-pointer">
              Publish immediately
            </label>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-near-black text-linen-peach font-mono text-xs tracking-wider
                       uppercase hover:bg-burnished disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Create Post'}
          </button>
          {message && (
            <p className="archive-label text-[0.62rem] text-burnished">{message}</p>
          )}
        </div>
      </form>

      {/* Posts list */}
      {loading ? (
        <p className="font-mono text-sm text-stone-grey">Loading posts...</p>
      ) : posts.length === 0 ? (
        <p className="font-mono text-sm text-stone-grey">No posts yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-pale-stone">
          {posts.map(post => (
            <div key={post.id} className="flex items-start justify-between gap-4 py-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className={`archive-label text-[0.58rem] px-1.5 py-0.5 ${
                    post.published ? 'bg-terracotta/20 text-terracotta' : 'bg-pale-stone text-stone-grey'
                  }`}>
                    {post.published ? 'Published' : 'Draft'}
                  </span>
                  {post.tags?.map(t => (
                    <span key={t} className="archive-label text-[0.55rem] text-warm-sand">{t}</span>
                  ))}
                </div>
                <p className="font-display text-near-black">{post.title}</p>
                <p className="archive-label text-[0.58rem] text-stone-grey mt-0.5">
                  /{post.slug} · {new Date(post.created_at).toLocaleDateString()}
                </p>
              </div>
              <a
                href={`/culture/${post.slug}`}
                target="_blank"
                rel="noopener"
                className="flex-shrink-0 font-mono text-xs text-stone-grey hover:text-burnished transition-colors"
              >
                View ↗
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
