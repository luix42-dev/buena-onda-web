'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { Post } from '@/types'

export default function AdminPostsPage() {
  const [posts,   setPosts]   = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/posts')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setPosts(Array.isArray(data) ? data : []))
      .catch(() => setFetchError('Could not load posts — check API connection.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="archive-label text-[0.65rem] text-stone-grey">Admin · Culture</p>
          <h1 className="font-display text-near-black text-3xl mt-1">
            Posts
            <span className="font-mono text-lg text-stone-grey ml-3">{posts.length}</span>
          </h1>
        </div>
        <Link
          href="/admin/posts/new"
          className="px-5 py-2.5 bg-near-black text-linen-peach font-mono text-xs
                     tracking-[0.15em] uppercase hover:bg-burnished transition-colors"
        >
          + New Post
        </Link>
      </div>

      {fetchError && (
        <div className="p-4 border border-rose-magenta/30 bg-rose-magenta/5 mb-6">
          <p className="font-mono text-xs text-rose-magenta">{fetchError}</p>
        </div>
      )}

      {loading ? (
        <p className="font-mono text-sm text-stone-grey">Loading posts...</p>
      ) : posts.length === 0 && !fetchError ? (
        <div className="py-20 text-center border border-pale-stone border-dashed">
          <p className="font-mono text-sm text-stone-grey">No posts yet.</p>
          <Link href="/admin/posts/new"
            className="inline-block mt-4 font-mono text-xs text-burnished hover:text-rose-magenta transition-colors">
            Write the first post →
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-pale-stone border-t border-b border-pale-stone">
          {posts.map(post => (
            <div key={post.id}
              className="flex items-center gap-4 py-3 hover:bg-sand-bg/50 px-2 transition-colors">

              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm text-near-black truncate">{post.title}</p>
                <p className="archive-label text-[0.55rem] text-stone-grey mt-0.5">
                  /{post.slug}
                </p>
              </div>

              <span className={`archive-label text-[0.55rem] px-2 py-0.5 flex-shrink-0 ${
                post.published
                  ? 'bg-warm-sand/20 text-burnished'
                  : 'bg-pale-stone text-stone-grey'
              }`}>
                {post.published ? 'Published' : 'Draft'}
              </span>

              {post.published_at || post.created_at ? (
                <span className="font-mono text-xs text-stone-grey flex-shrink-0">
                  {new Date(post.published_at ?? post.created_at).toLocaleDateString()}
                </span>
              ) : null}

              <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end max-w-[120px]">
                {(post.tags ?? []).slice(0, 2).map((t: string) => (
                  <span key={t} className="archive-label text-[0.5rem] text-warm-sand">{t}</span>
                ))}
              </div>

              <Link
                href={`/admin/posts/${post.id}/edit`}
                className="font-mono text-xs text-stone-grey hover:text-burnished transition-colors flex-shrink-0"
              >
                Edit →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
