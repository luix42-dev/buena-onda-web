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

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function isCulturePost(post: Post) {
  const tags = post.tags ?? []
  return tags.includes('culture') || tags.includes('essay')
}

function postStatus(post: Post): 'draft' | 'live' {
  return post.status === 'live' || post.published ? 'live' : 'draft'
}

export default function CultureClient({ initialPosts }: Props) {
  const toast = useToast()
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [composerOpen, setComposerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [body, setBody] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [tags, setTags] = useState('culture, essay')
  const [status, setStatus] = useState<'draft' | 'live'>('draft')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setPosts(initialPosts)
  }, [initialPosts])

  const culturePosts = posts.filter(isCulturePost)

  const openComposer = () => {
    setEditingPost(null)
    setTitle('')
    setExcerpt('')
    setBody('')
    setCoverImage('')
    setInstagramUrl('')
    setTags('culture, essay')
    setStatus('draft')
    setError(null)
    setComposerOpen(true)
  }

  const openEditor = (post: Post) => {
    setEditingPost(post)
    setTitle(post.title ?? '')
    setExcerpt(post.excerpt ?? '')
    setBody(post.body ?? '')
    setCoverImage(post.cover_image ?? '')
    setInstagramUrl(post.instagram_url ?? '')
    setTags((post.tags ?? []).join(', '))
    setStatus(postStatus(post))
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
      const payload = {
        title: title.trim(),
        excerpt: excerpt.trim() || undefined,
        body: body.trim() || undefined,
        cover_image: coverImage.trim() || undefined,
        instagramUrl: instagramUrl.trim() || undefined,
        tags: postTags.length ? postTags : ['culture', 'essay'],
        status,
        slug: slugify(title.trim()),
      }
      const res = await fetch(editingPost ? `/api/admin/posts/${editingPost.id}` : '/api/admin/posts', {
        method: editingPost ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error((data as { error?: string }).error ?? 'Could not save essay.')
      }

      setPosts(prev => (
        editingPost
          ? prev.map(post => post.id === editingPost.id ? data as Post : post)
          : [data as Post, ...prev]
      ))
      setEditingPost(null)
      setComposerOpen(false)
      toast(editingPost ? 'Essay updated.' : 'Essay saved.')
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
              <div key={post.id} className="row in" onClick={() => openEditor(post)}>
                <div className="plnum">{String(index + 1).padStart(2, '0')}</div>
                <div className="rmain">
                  <div className="rttl">{post.title}</div>
                  <div className="rdek">{post.excerpt ?? 'No excerpt yet.'}</div>
                </div>
                <div className="rmeta">
                  <StatusPill variant={postStatus(post) === 'live' ? 'published' : 'draft'} inline rowStyle />
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
        onClose={() => {
          setComposerOpen(false)
          setEditingPost(null)
        }}
        title={editingPost ? 'Edit essay' : 'New essay'}
        footer={(
          <>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setComposerOpen(false)
                setEditingPost(null)
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn coral"
              onClick={saveEssay}
              disabled={saving || !title.trim()}
            >
              {saving ? 'Saving...' : editingPost ? 'Save changes' : 'Save essay'}
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
          <label htmlFor="cu-instagram">Instagram URL</label>
          <input
            id="cu-instagram"
            type="url"
            value={instagramUrl}
            onChange={e => setInstagramUrl(e.target.value)}
            placeholder="https://www.instagram.com/p/..."
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
          <label htmlFor="cu-status">Status</label>
          <select
            id="cu-status"
            value={status}
            onChange={e => setStatus(e.target.value === 'live' ? 'live' : 'draft')}
          >
            <option value="draft">Draft</option>
            <option value="live">Live</option>
          </select>
        </div>
      </Drawer>
    </>
  )
}
