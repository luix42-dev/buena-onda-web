'use client'

import { useEffect, useRef, useState } from 'react'
import SectionHead from '@/components/studio/SectionHead'
import Drawer from '@/components/studio/Drawer'
import StatusPill from '@/components/studio/StatusPill'
import UploadDropzone from '@/components/studio/UploadDropzone'
import { useToast } from '@/components/studio/Toast'
import type { Post } from '@/types'

type Props = {
  initialPosts: Post[]
}

type ImageSlot = 'hero' | 'inline-1' | 'inline-2'

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
  const [uploading, setUploading] = useState<ImageSlot | null>(null)

  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [body, setBody] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [tags, setTags] = useState('culture, essay')
  const [status, setStatus] = useState<'draft' | 'live'>('draft')
  const [heroImage, setHeroImage] = useState('')
  const [inlineImage1, setInlineImage1] = useState('')
  const [inlineImage1Caption, setInlineImage1Caption] = useState('')
  const [inlineImage2, setInlineImage2] = useState('')
  const [inlineImage2Caption, setInlineImage2Caption] = useState('')
  const [editorialNote, setEditorialNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const heroInputRef    = useRef<HTMLInputElement>(null)
  const inline1InputRef = useRef<HTMLInputElement>(null)
  const inline2InputRef = useRef<HTMLInputElement>(null)

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
    setHeroImage('')
    setInlineImage1('')
    setInlineImage1Caption('')
    setInlineImage2('')
    setInlineImage2Caption('')
    setEditorialNote('')
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
    setHeroImage(post.hero_image ?? '')
    setInlineImage1(post.inline_image_1 ?? '')
    setInlineImage1Caption(post.inline_image_1_caption ?? '')
    setInlineImage2(post.inline_image_2 ?? '')
    setInlineImage2Caption(post.inline_image_2_caption ?? '')
    setEditorialNote(post.editorial_note ?? '')
    setError(null)
    setComposerOpen(true)
  }

  const uploadImage = async (file: File, slot: ImageSlot) => {
    if (!editingPost) return
    setUploading(slot)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const storagePath = `posts/culture/${editingPost.slug}/${slot}.${ext}`
      const form = new FormData()
      form.append('file', file)
      form.append('storagePath', storagePath)

      const uploadRes = await fetch('/api/admin/upload', { method: 'POST', body: form })
      const uploadData = await uploadRes.json() as { url?: string; error?: string }
      if (!uploadRes.ok) throw new Error(uploadData.error ?? 'Upload failed')

      const url = uploadData.url!

      const newHero    = slot === 'hero'     ? url : (heroImage.trim()    || undefined)
      const newInline1 = slot === 'inline-1' ? url : (inlineImage1.trim() || undefined)
      const newInline2 = slot === 'inline-2' ? url : (inlineImage2.trim() || undefined)

      const patchPayload = {
        title,
        slug: editingPost.slug,
        excerpt: excerpt.trim() || undefined,
        body: body.trim() || undefined,
        cover_image: coverImage.trim() || undefined,
        instagramUrl: instagramUrl.trim() || undefined,
        tags: parseTags(tags).length ? parseTags(tags) : ['culture', 'essay'],
        status,
        hero_image:             newHero,
        inline_image_1:         newInline1,
        inline_image_1_caption: inlineImage1Caption.trim() || undefined,
        inline_image_2:         newInline2,
        inline_image_2_caption: inlineImage2Caption.trim() || undefined,
        editorial_note:         editorialNote.trim() || undefined,
      }

      const saveRes = await fetch(`/api/admin/posts/${editingPost.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchPayload),
      })
      const saveData = await saveRes.json() as Post & { error?: string }
      if (!saveRes.ok) throw new Error((saveData as { error?: string }).error ?? 'Could not save image URL')

      if (slot === 'hero')     setHeroImage(url)
      if (slot === 'inline-1') setInlineImage1(url)
      if (slot === 'inline-2') setInlineImage2(url)

      setPosts(prev => prev.map(p => p.id === editingPost.id ? saveData : p))
      setEditingPost(saveData)
      toast('Image uploaded.')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(null)
    }
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
        slug: editingPost?.slug ?? slugify(title.trim()),
        hero_image:             heroImage.trim() || undefined,
        inline_image_1:         inlineImage1.trim() || undefined,
        inline_image_1_caption: inlineImage1Caption.trim() || undefined,
        inline_image_2:         inlineImage2.trim() || undefined,
        inline_image_2_caption: inlineImage2Caption.trim() || undefined,
        editorial_note:         editorialNote.trim() || undefined,
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

  function ImageField({
    slot,
    label,
    inputRef,
    value,
  }: {
    slot: ImageSlot
    label: string
    inputRef: React.RefObject<HTMLInputElement>
    value: string
  }) {
    const isUploading = uploading === slot
    return (
      <div className="field">
        <label>{label}</label>
        {editingPost ? (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) uploadImage(file, slot)
                e.target.value = ''
              }}
            />
            <UploadDropzone
              title={isUploading ? 'Uploading…' : value ? `Replace ${label.toLowerCase()}` : `Upload ${label.toLowerCase()}`}
              hint="Drop or click to upload"
              onClick={() => { if (!uploading) inputRef.current?.click() }}
              onDrop={files => { if (!uploading && files[0]) uploadImage(files[0], slot) }}
            />
            {value && (
              <img
                src={value}
                alt={label}
                style={{ width: '100%', height: 110, objectFit: 'cover', marginTop: 8, borderRadius: 4 }}
              />
            )}
          </>
        ) : (
          <p style={{ fontSize: '0.75rem', color: 'var(--stone-grey)', margin: '6px 0 0' }}>
            Save the essay first to add images.
          </p>
        )}
      </div>
    )
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

        <ImageField slot="hero"     label="Hero image"     inputRef={heroInputRef}    value={heroImage} />
        <ImageField slot="inline-1" label="Inline image 1" inputRef={inline1InputRef} value={inlineImage1} />

        <div className="field">
          <label htmlFor="cu-inline1-caption">Inline image 1 caption</label>
          <input
            id="cu-inline1-caption"
            type="text"
            value={inlineImage1Caption}
            onChange={e => setInlineImage1Caption(e.target.value)}
            placeholder="Optional caption"
          />
        </div>

        <ImageField slot="inline-2" label="Inline image 2" inputRef={inline2InputRef} value={inlineImage2} />

        <div className="field">
          <label htmlFor="cu-inline2-caption">Inline image 2 caption</label>
          <input
            id="cu-inline2-caption"
            type="text"
            value={inlineImage2Caption}
            onChange={e => setInlineImage2Caption(e.target.value)}
            placeholder="Optional caption"
          />
        </div>

        <div className="field">
          <label htmlFor="cu-editorial-note">Editorial note</label>
          <textarea
            id="cu-editorial-note"
            rows={3}
            value={editorialNote}
            onChange={e => setEditorialNote(e.target.value)}
            placeholder="Internal note — not published"
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
