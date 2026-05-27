'use client'

import { useEffect, useState } from 'react'
import SectionHead from '@/components/studio/SectionHead'
import Drawer from '@/components/studio/Drawer'
import StatusPill from '@/components/studio/StatusPill'
import { useToast } from '@/components/studio/Toast'
import type { Post } from '@/types'

type Props = {
  initialPosts: Post[]
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'n/a'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function parseTags(raw: string) {
  return raw
    .split(',')
    .map(tag => tag.trim().toLowerCase())
    .filter(Boolean)
}

function isCulturePost(post: Post) {
  const tags = post.tags ?? []
  return tags.includes('culture') || tags.includes('essay')
}

export default function CultureClient({ initialPosts }: Props) {
  const toast = useToast()
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [composerOpen, setComposerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [body, setBody] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [tags, setTags] = useState('culture, essay')
  const [published, setPublished] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setPosts(initialPosts)
  }, [initialPosts])

  const culturePosts = posts.filter(isCulturePost)

  const openComposer = () => {
    setTitle('')
    setExcerpt('')
    setBody('')
    setCoverImage('')
    setTags('culture, essay')
    setPublished(false)
    setError(null)
    setComposerOpen(true)
  }

  const saveEssay = async () => {
    if (!title.trim()) {
      setError('Title is required.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const postTags = parseTags(tags)
      const res = await fetch('/api/admin/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          excerpt: excerpt.trim() || undefined,
          body: body.trim() || undefined,
          cover_image: coverImage.trim() || undefined,
          tags: postTags.length ? postTags : ['culture', 'essay'],
          published,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error((data as { error?: string }).error ?? 'Could not save essay.')
      }

      setPosts(prev => [data as Post, ...prev])
      setComposerOpen(false)
      toast('Essay saved.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save essay.'
      setError(msg)
      toast(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <SectionHead
        title="Culture"
        subtitle="Essays from the analog world"
        actionLabel={saving ? 'Saving...' : '+ New essay'}
        onAction={openComposer}
      />

      <div className="grid gap-4" style={{ paddingTop: 20 }}>
        <div className="hpcard in">
          <div className="hk">Archive</div>
          <div className="hl">{culturePosts.length} culture essays</div>
          <div className="hs">
            This view filters the existing `posts` table by tags. Entries tagged `culture` or `essay`
            appear here; everything else stays in the broader post archive.
          </div>
          <div className="hb">
            <span className="hvis">{posts.length} total posts</span>
            <button type="button" className="btn" onClick={openComposer}>
              + New essay
            </button>
          </div>
        </div>

        {error && (
          <div className="empty" style={{ padding: '20px', textAlign: 'left' }}>
            <div className="em-t" style={{ textAlign: 'left' }}>Could not save essay.</div>
            <div className="em-s" style={{ textAlign: 'left' }}>{error}</div>
          </div>
        )}

        {culturePosts.length === 0 ? (
          <div className="empty">
            <div className="em-t">No essays wired in yet.</div>
            <div className="em-s">
              The posts table is live, but nothing is tagged `culture` or `essay` yet.
            </div>
          </div>
        ) : (
          <div className="rows">
            <div className="row" style={{ borderTop: '1px solid var(--line)' }}>
              <div className="num">#</div>
              <div className="rmain">
                <div className="rttl">Essay</div>
              </div>
              <div className="rmeta">
                <div className="rdate">Status</div>
                <div className="rdate">Date</div>
                <div className="rdate">Tags</div>
              </div>
            </div>

            {culturePosts.map((post, index) => (
              <div key={post.id} className="row in">
                <div className="plnum">{String(index + 1).padStart(2, '0')}</div>
                <div className="rmain">
                  <div className="rttl">{post.title}</div>
                  <div className="rdek">{post.excerpt ?? 'No excerpt yet.'}</div>
                </div>
                <div className="rmeta">
                  <StatusPill variant={post.published ? 'published' : 'draft'} inline rowStyle />
                  <div className="rdate">{formatDate(post.published_at ?? post.created_at)}</div>
                  <div className="rdate" style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {(post.tags ?? []).join(', ') || 'n/a'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Drawer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        title="New essay"
        footer={(
          <>
            <button type="button" className="btn ghost" onClick={() => setComposerOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn coral"
              onClick={saveEssay}
              disabled={saving || !title.trim()}
            >
              {saving ? 'Saving...' : 'Save essay'}
            </button>
          </>
        )}
      >
        <div className="field">
          <label htmlFor="cu-title">Title</label>
          <input
            id="cu-title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Essay title"
          />
        </div>

        <div className="field">
          <label htmlFor="cu-excerpt">Excerpt</label>
          <textarea
            id="cu-excerpt"
            rows={3}
            value={excerpt}
            onChange={e => setExcerpt(e.target.value)}
            placeholder="Short intro"
          />
        </div>

        <div className="field">
          <label htmlFor="cu-body">Body</label>
          <textarea
            id="cu-body"
            rows={9}
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Draft the essay here"
          />
        </div>

        <div className="field">
          <label htmlFor="cu-cover">Cover image URL</label>
          <input
            id="cu-cover"
            type="url"
            value={coverImage}
            onChange={e => setCoverImage(e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div className="field">
          <label htmlFor="cu-tags">Tags</label>
          <input
            id="cu-tags"
            type="text"
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="culture, essay"
          />
        </div>

        <div className="field">
          <label htmlFor="cu-published">Publish now</label>
          <input
            id="cu-published"
            type="checkbox"
            checked={published}
            onChange={e => setPublished(e.target.checked)}
          />
        </div>
      </Drawer>
    </>
  )
}
