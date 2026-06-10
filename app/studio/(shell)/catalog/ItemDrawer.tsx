'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Drawer from '@/components/studio/Drawer'
import SegmentedControl from '@/components/studio/SegmentedControl'
import UploadDropzone from '@/components/studio/UploadDropzone'
import { useToast } from '@/components/studio/Toast'
import type { Item, ItemAvailability, ItemImage, ItemSourcingModel, ItemStatus, Theme } from './types'

type Props = {
  item: Item | null
  themes: Theme[]
  open: boolean
  onClose: () => void
  onSave: (item: Item) => void
  onDelete: (id: string) => void
}

const AVAIL_OPTIONS: { value: ItemAvailability; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'sold', label: 'Sold' },
]

const STATUS_OPTIONS: { value: ItemStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
]

const SOURCING_OPTIONS: { value: ItemSourcingModel; label: string }[] = [
  { value: 'reservation', label: 'Reservation' },
  { value: 'direct', label: 'Direct Purchase' },
]

const DETAIL_FIELDS = [
  { key: 'era', label: 'Era' },
  { key: 'dimensions', label: 'Dimensions' },
  { key: 'material', label: 'Material' },
  { key: 'condition', label: 'Condition' },
  { key: 'origin', label: 'Origin' },
] as const

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function reorderImagesWithPrimary(images: ItemImage[], imageId: string) {
  const primaryIndex = images.findIndex(image => image.id === imageId)
  if (primaryIndex === -1) return images

  return [images[primaryIndex], ...images.filter(image => image.id !== imageId)]
    .map((image, index) => ({
      ...image,
      sort_order: index,
    }))
}

function getPrimaryImageUrl(images: ItemImage[]) {
  const ordered = [...images].sort((a, b) => a.sort_order - b.sort_order)
  return ordered[0]?.url ?? null
}

export default function ItemDrawer({ item, themes, open, onClose, onSave, onDelete }: Props) {
  const toast = useToast()

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [themeId, setThemeId] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [whyChosen, setWhyChosen] = useState('')
  const [details, setDetails] = useState<Record<string, string>>({})
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [status, setStatus] = useState<ItemStatus>('draft')
  const [availability, setAvailability] = useState<ItemAvailability>('available')
  const [sourcingModel, setSourcingModel] = useState<ItemSourcingModel>('reservation')
  const [images, setImages] = useState<ItemImage[]>([])
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    if (item) {
      setTitle(item.title)
      setSlug(item.slug)
      setSlugTouched(true)
      setThemeId(item.theme_id ?? '')
      setPrice(item.price != null ? String(item.price) : '')
      setDescription(item.description ?? '')
      setWhyChosen(item.why_chosen ?? '')
      setDetails(item.details ?? {})
      setTags(item.tags ?? [])
      setStatus((item.status === 'sold_out' ? 'published' : item.status) as ItemStatus)
      setAvailability(item.availability ?? 'available')
      setSourcingModel(item.sourcing_model ?? 'reservation')
      setCoverUrl(item.primary_image_url ?? null)
      fetch(`/api/admin/items/${item.id}/images`)
        .then(r => r.json())
        .then(data => {
          if (!Array.isArray(data)) return
          setImages(data)
          setCoverUrl(getPrimaryImageUrl(data))
        })
        .catch(() => {})
    } else {
      setTitle('')
      setSlug('')
      setSlugTouched(false)
      setThemeId(themes[0]?.id ?? '')
      setPrice('')
      setDescription('')
      setWhyChosen('')
      setDetails({})
      setTags([])
      setStatus('draft')
      setAvailability('available')
      setSourcingModel('reservation')
      setImages([])
      setCoverUrl(null)
    }
    setTagInput('')
    setSaving(false)
  }, [item, open, themes])

  useEffect(() => {
    if (!slugTouched && !item) {
      setSlug(slugify(title))
    }
  }, [title, slugTouched, item])

  const buildBody = (overrideCoverUrl?: string | null) => ({
    title: title.trim(),
    slug: slug.trim(),
    theme_id: themeId || null,
    price: price ? Number(price) : null,
    description: description || null,
    why_chosen: whyChosen || null,
    details,
    tags,
    status,
    availability,
    sourcing_model: sourcingModel,
    cover_image_url: overrideCoverUrl ?? coverUrl,
  })

  const uploadFiles = async (files: File[]) => {
    if (!item) return
    setUploading(true)
    for (const file of files) {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`/api/admin/items/${item.id}/images`, { method: 'POST', body: fd })
      if (res.ok) {
        const img: ItemImage = await res.json()
        setImages(prev => [...prev, img])
        if (!coverUrl) setCoverUrl(img.url)
      }
    }
    setUploading(false)
  }

  const handleSetCover = async (img: ItemImage) => {
    if (!item || img.url === coverUrl) return
    const previousImages = images
    const previousCoverUrl = coverUrl
    const nextImages = reorderImagesWithPrimary(images, img.id)

    setCoverUrl(img.url)
    setImages(nextImages)

    const res = await fetch(`/api/admin/items/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...buildBody(img.url),
        cover_image_id: img.id,
      }),
    })

    if (!res.ok) {
      setCoverUrl(previousCoverUrl)
      setImages(previousImages)
      toast('Cover update failed.')
    }
  }

  const handleDeleteImage = async (img: ItemImage) => {
    if (!item) return
    const res = await fetch(`/api/admin/items/${item.id}/images/${img.id}`, { method: 'DELETE' })
    if (!res.ok) return
    const next = images.filter(i => i.id !== img.id)
    setImages(next)
    if (img.url === coverUrl) {
      setCoverUrl(next.length > 0 ? next[0].url : null)
    }
  }

  const handleReorder = async (idx: number, dir: -1 | 1) => {
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= images.length || !item) return

    const next = [...images]
    const aOrder = next[idx].sort_order
    const bOrder = next[swapIdx].sort_order
    next[idx] = { ...next[idx], sort_order: bOrder }
    next[swapIdx] = { ...next[swapIdx], sort_order: aOrder }
    ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
    setImages(next)

    await Promise.all([
      fetch(`/api/admin/items/${item.id}/images/${next[swapIdx].id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order: aOrder }),
      }),
      fetch(`/api/admin/items/${item.id}/images/${next[idx].id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order: bOrder }),
      }),
    ])
  }

  const handleSave = async () => {
    if (!title.trim() || !slug.trim()) return
    setSaving(true)

    const res = item
      ? await fetch(`/api/admin/items/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildBody()),
        })
      : await fetch('/api/admin/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildBody()),
        })

    setSaving(false)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast(err.error ?? 'Save failed.')
      return
    }
    const saved: Item = await res.json()
    toast('Saved.')
    onSave(saved)
  }

  const handleDelete = async () => {
    if (!item) return
    if (!window.confirm('Delete this piece? This cannot be undone.')) return
    const res = await fetch(`/api/admin/items/${item.id}`, { method: 'DELETE' })
    if (!res.ok) {
      toast('Delete failed.')
      return
    }
    toast('Deleted.')
    onDelete(item.id)
  }

  const addTag = (raw: string) => {
    const t = raw.trim().toLowerCase()
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
  }

  const removeTag = (t: string) => setTags(prev => prev.filter(x => x !== t))

  const footer = (
    <div className="dfoot">
      {item ? (
        <button type="button" className="del" onClick={handleDelete}>
          Delete piece
        </button>
      ) : null}
      <button type="button" className="btn ghost" onClick={onClose}>
        Cancel
      </button>
      <button
        type="button"
        className="btn"
        onClick={handleSave}
        disabled={saving || !title.trim() || !slug.trim()}
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  )

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={item ? item.title : 'New Piece'}
      footer={footer}
    >
      {images.length > 0 ? (
        <div style={{ marginBottom: 20 }}>
          <label style={{
            display: 'block',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '.16em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            marginBottom: 8,
          }}>
            Images
          </label>
          <div className="strip">
            {images.map((img, idx) => (
              <div key={img.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div
                  className={`ph${img.url === coverUrl ? ' cover' : ''}`}
                  onClick={() => handleSetCover(img)}
                  style={{ cursor: 'pointer', position: 'relative' }}
                >
                  <Image src={img.url} alt={img.alt_text ?? ''} fill style={{ objectFit: 'cover' }} sizes="64px" />
                  <span className="tag">{img.url === coverUrl ? 'Cover' : String(idx + 1)}</span>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation()
                      void handleDeleteImage(img)
                    }}
                    style={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      width: 16,
                      height: 16,
                      border: 'none',
                      background: 'rgba(23,19,16,.6)',
                      color: '#fff',
                      fontSize: 10,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1,
                      padding: 0,
                    }}
                    aria-label="Delete image"
                  >
                    x
                  </button>
                </div>
                <div className="ord">
                  <button type="button" disabled={idx === 0} onClick={() => handleReorder(idx, -1)} aria-label="Move up">^</button>
                  <button type="button" disabled={idx === images.length - 1} onClick={() => handleReorder(idx, 1)} aria-label="Move down">v</button>
                </div>
              </div>
            ))}
            {item ? (
              <div
                className="add"
                onClick={() => fileRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && fileRef.current?.click()}
                aria-label="Add image"
              >
                {uploading ? '...' : '+'}
              </div>
            ) : null}
          </div>
        </div>
      ) : item ? (
        <div style={{ marginBottom: 20 }}>
          <UploadDropzone
            title="Drop images here"
            hint="JPG, PNG, WEBP"
            onDrop={uploadFiles}
            onClick={() => fileRef.current?.click()}
          />
        </div>
      ) : (
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20 }}>
          Save the piece first, then add images.
        </p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={e => {
          const files = Array.from(e.target.files ?? [])
          if (files.length) void uploadFiles(files)
          e.target.value = ''
        }}
      />

      <div className="field">
        <label htmlFor="item-title">Title</label>
        <input
          id="item-title"
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Low Cabinet No. 4"
        />
      </div>

      <div className="field">
        <label htmlFor="item-slug">Slug</label>
        <input
          id="item-slug"
          type="text"
          value={slug}
          onChange={e => {
            setSlug(e.target.value)
            setSlugTouched(true)
          }}
          placeholder="e.g. low-cabinet-no-4"
        />
      </div>

      <div className="field">
        <label htmlFor="item-theme">Theme</label>
        <select
          id="item-theme"
          value={themeId}
          onChange={e => setThemeId(e.target.value)}
          style={{
            width: '100%',
            fontFamily: 'inherit',
            fontSize: 14,
            padding: '11px 13px',
            border: '1px solid var(--line)',
            background: 'var(--paper-2)',
            color: 'var(--ink)',
            outline: 'none',
          }}
        >
          <option value="">- No theme -</option>
          {themes.map(t => (
            <option key={t.id} value={t.id}>{t.code} - {t.title}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="item-price">Price</label>
        <div className="price-wrap">
          <span>$</span>
          <input
            id="item-price"
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="field">
        <label>Availability</label>
        <SegmentedControl
          variant="status"
          options={AVAIL_OPTIONS}
          value={availability}
          onChange={setAvailability}
        />
      </div>

      <div className="field">
        <label>Sourcing Model</label>
        <SegmentedControl
          variant="status"
          options={SOURCING_OPTIONS}
          value={sourcingModel}
          onChange={setSourcingModel}
        />
      </div>

      <div className="field">
        <label>Status</label>
        <SegmentedControl
          variant="pub"
          options={STATUS_OPTIONS}
          value={status}
          onChange={setStatus}
        />
      </div>

      <div className="field">
        <label htmlFor="item-desc">Description</label>
        <textarea
          id="item-desc"
          rows={4}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What makes this piece worth having..."
        />
      </div>

      <div className="field">
        <label htmlFor="item-why-chosen">Why We Chose This</label>
        <textarea
          id="item-why-chosen"
          rows={4}
          value={whyChosen}
          onChange={e => setWhyChosen(e.target.value)}
          placeholder="Why this piece belongs in the catalog..."
        />
      </div>

      {DETAIL_FIELDS.map(field => (
        <div key={field.key} className="field">
          <label htmlFor={`item-detail-${field.key}`}>{field.label}</label>
          <input
            id={`item-detail-${field.key}`}
            type="text"
            value={details[field.key] ?? ''}
            onChange={e => setDetails(prev => ({ ...prev, [field.key]: e.target.value }))}
            placeholder={field.label}
          />
        </div>
      ))}

      <div className="field">
        <label>Tags</label>
        <div className="tags-in">
          {tags.map(t => (
            <span key={t} className="tagx">
              {t}
              <i onClick={() => removeTag(t)} role="button" aria-label={`Remove ${t}`}>x</i>
            </span>
          ))}
          <input
            type="text"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault()
                addTag(tagInput)
              }
              if (e.key === 'Backspace' && !tagInput && tags.length) removeTag(tags[tags.length - 1])
            }}
            onBlur={() => tagInput.trim() && addTag(tagInput)}
            placeholder={tags.length === 0 ? 'Add tags...' : ''}
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontFamily: 'inherit',
              fontSize: 13,
              flex: 1,
              minWidth: 80,
            }}
          />
        </div>
      </div>
    </Drawer>
  )
}
