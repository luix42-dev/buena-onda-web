'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import SectionHead from '@/components/studio/SectionHead'
import SegmentedControl from '@/components/studio/SegmentedControl'
import UploadDropzone from '@/components/studio/UploadDropzone'
import { useToast } from '@/components/studio/Toast'
import type {
  EventArchiveSheet,
  EventAudioFile,
  EventGalleryItem,
  EventPartner,
  EventStatus,
  EventVideo,
  LiveEvent,
} from '../types'

type Props = {
  event: LiveEvent | null
}

const STATUS_OPTIONS: { value: EventStatus; label: string }[] = [
  { value: 'recurring', label: 'Recurring' },
  { value: 'one-time',  label: 'One-time'  },
  { value: 'archived',  label: 'Archived'  },
]

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function blankGallery(): EventGalleryItem {
  return { image: '', caption: '' }
}

function blankVideo(): EventVideo {
  return { url: '', label: '' }
}

function normalizeVideos(value: LiveEvent['videos']): EventVideo[] {
  if (!Array.isArray(value)) return []
  return value.map(item => {
    if (typeof item === 'string') return { url: item, label: '' }
    return { url: item.url ?? '', label: item.label ?? '' }
  })
}

function blankAudio(): EventAudioFile {
  return { file: '', label: '' }
}

function blankPartner(): EventPartner {
  return { name: '', logo: '' }
}

function blankSheet(): EventArchiveSheet {
  return { file: '', label: '' }
}

export default function EventEditor({ event }: Props) {
  const router = useRouter()
  const toast = useToast()
  const coverRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [slugTouched, setSlugTouched] = useState(Boolean(event))

  const [name, setName] = useState(event?.name ?? '')
  const [slug, setSlug] = useState(event?.slug ?? '')
  const [tagline, setTagline] = useState(event?.tagline ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [tags, setTags] = useState<string[]>(event?.tags ?? [])
  const [tagInput, setTagInput] = useState('')
  const [status, setStatus] = useState<EventStatus>(event?.status ?? 'recurring')
  const [venueName, setVenueName] = useState(event?.venue_name ?? '')
  const [venueCity, setVenueCity] = useState(event?.venue_city ?? '')
  const [eventDate, setEventDate] = useState(event?.event_date ?? '')
  const [lineup, setLineup] = useState(event?.lineup ?? '')
  const [coverImageUrl, setCoverImageUrl] = useState(event?.cover_image_url ?? '')
  const [gallery, setGallery] = useState<EventGalleryItem[]>(event?.gallery ?? [])
  const [videos, setVideos] = useState<EventVideo[]>(normalizeVideos(event?.videos ?? []))
  const [playlistUrl, setPlaylistUrl] = useState(event?.playlist_url ?? '')
  const [audioFiles, setAudioFiles] = useState<EventAudioFile[]>(event?.audio_files ?? [])
  const [partners, setPartners] = useState<EventPartner[]>(event?.partners ?? [])
  const [archiveSheets, setArchiveSheets] = useState<EventArchiveSheet[]>(event?.archive_sheets ?? [])
  const [archiveNotes, setArchiveNotes] = useState(event?.archive_notes ?? '')

  useEffect(() => {
    setSlugTouched(Boolean(event))
    setName(event?.name ?? '')
    setSlug(event?.slug ?? '')
    setTagline(event?.tagline ?? '')
    setDescription(event?.description ?? '')
    setTags(event?.tags ?? [])
    setTagInput('')
    setStatus(event?.status ?? 'recurring')
    setVenueName(event?.venue_name ?? '')
    setVenueCity(event?.venue_city ?? '')
    setEventDate(event?.event_date ?? '')
    setLineup(event?.lineup ?? '')
    setCoverImageUrl(event?.cover_image_url ?? '')
    setGallery(event?.gallery ?? [])
    setVideos(normalizeVideos(event?.videos ?? []))
    setPlaylistUrl(event?.playlist_url ?? '')
    setAudioFiles(event?.audio_files ?? [])
    setPartners(event?.partners ?? [])
    setArchiveSheets(event?.archive_sheets ?? [])
    setArchiveNotes(event?.archive_notes ?? '')
  }, [event])

  useEffect(() => {
    if (!slugTouched && !event) setSlug(slugify(name))
  }, [name, slugTouched, event])

  const addTag = (raw: string) => {
    const t = raw.trim().toLowerCase()
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
  }

  const removeTag = (t: string) => setTags(prev => prev.filter(x => x !== t))

  async function uploadFile(file: File, folder: string) {
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('folder', folder)
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
    setUploading(false)

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast((err as { error?: string }).error ?? 'Upload failed.')
      return null
    }

    const uploaded = await res.json()
    return typeof uploaded.url === 'string' ? uploaded.url : null
  }

  const uploadCover = async (files: File[]) => {
    const file = files[0]
    if (!file) return
    const url = await uploadFile(file, 'events')
    if (url) setCoverImageUrl(url)
  }

  const uploadIntoGallery = async (idx: number, file: File) => {
    const url = await uploadFile(file, 'events/gallery')
    if (!url) return
    setGallery(prev => prev.map((item, i) => i === idx ? { ...item, image: url } : item))
  }

  const uploadMultipleIntoGallery = async (idx: number, files: File[]) => {
    if (files.length === 0) return

    const uploaded: EventGalleryItem[] = []
    for (const file of files) {
      const url = await uploadFile(file, 'events/gallery')
      if (url) uploaded.push({ image: url, caption: '' })
    }

    if (uploaded.length === 0) return
    setGallery(prev => {
      const next = [...prev]
      const first = uploaded[0]
      next[idx] = { ...next[idx], image: first.image }
      next.splice(idx + 1, 0, ...uploaded.slice(1))
      return next
    })
  }

  const uploadIntoAudio = async (idx: number, file: File) => {
    const url = await uploadFile(file, 'events/audio')
    if (!url) return
    setAudioFiles(prev => prev.map((item, i) => i === idx ? { ...item, file: url } : item))
  }

  const uploadIntoPartner = async (idx: number, file: File) => {
    const url = await uploadFile(file, 'events/partners')
    if (!url) return
    setPartners(prev => prev.map((item, i) => i === idx ? { ...item, logo: url } : item))
  }

  const uploadIntoSheet = async (idx: number, file: File) => {
    const url = await uploadFile(file, 'events/archive')
    if (!url) return
    setArchiveSheets(prev => prev.map((item, i) => i === idx ? { ...item, file: url } : item))
  }

  async function saveEvent() {
    if (!name.trim() || !slug.trim()) return
    setSaving(true)

    const body = {
      name: name.trim(),
      slug: slug.trim(),
      tagline: tagline.trim() || null,
      description: description.trim() || null,
      tags,
      status,
      venue_name: venueName.trim() || null,
      venue_city: venueCity.trim() || null,
      event_date: eventDate || null,
      lineup: lineup.trim() || null,
      cover_image_url: coverImageUrl.trim() || null,
      gallery: gallery.filter(item => item.image || item.caption),
      videos: videos.filter(item => item.url || item.label),
      playlist_url: playlistUrl.trim() || null,
      audio_files: audioFiles.filter(item => item.file || item.label),
      partners: partners.filter(item => item.name || item.logo),
      archive_sheets: archiveSheets.filter(item => item.file || item.label),
      archive_notes: archiveNotes.trim() || null,
    }

    const res = event
      ? await fetch(`/api/admin/events/${event.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      : await fetch('/api/admin/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

    setSaving(false)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast((err as { error?: string }).error ?? 'Save failed.')
      return
    }

    const saved: LiveEvent = await res.json()
    toast('Saved.')
    router.push(`/studio/events/${saved.id}`)
    router.refresh()
  }

  async function deleteEvent() {
    if (!event) return
    if (!window.confirm('Delete this event? This cannot be undone.')) return

    const res = await fetch(`/api/admin/events/${event.id}`, { method: 'DELETE' })
    if (!res.ok) {
      toast('Delete failed.')
      return
    }
    toast('Deleted.')
    router.push('/studio/events')
    router.refresh()
  }

  return (
    <>
      <SectionHead
        title={event ? event.name : 'New Event'}
        subtitle="Live Events archive"
        actionLabel="Back to events"
        actionHref="/studio/events"
      />

      <div className="editor-grid" style={{ maxWidth: 820 }}>
        <div className="hpcard in">
          <div className="hk">Core</div>
          <div className="field">
            <label htmlFor="event-name">Name</label>
            <input id="event-name" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="event-slug">Slug</label>
            <input
              id="event-slug"
              value={slug}
              onChange={e => { setSlug(e.target.value); setSlugTouched(true) }}
            />
          </div>
          <div className="field">
            <label htmlFor="event-tagline">Tagline</label>
            <input id="event-tagline" value={tagline} onChange={e => setTagline(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="event-description">Description</label>
            <textarea id="event-description" rows={5} value={description} onChange={e => setDescription(e.target.value)} />
          </div>
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
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput) }
                  if (e.key === 'Backspace' && !tagInput && tags.length) removeTag(tags[tags.length - 1])
                }}
                onBlur={() => tagInput.trim() && addTag(tagInput)}
                placeholder={tags.length === 0 ? 'Add tags...' : ''}
              />
            </div>
          </div>
          <div className="field">
            <label>Status</label>
            <SegmentedControl variant="status" options={STATUS_OPTIONS} value={status} onChange={setStatus} />
          </div>
          <div className="field">
            <label htmlFor="event-venue-name">Venue name</label>
            <input id="event-venue-name" value={venueName} onChange={e => setVenueName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="event-venue-city">Venue city</label>
            <input id="event-venue-city" value={venueCity} onChange={e => setVenueCity(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="event-date">EVENT DATE</label>
            <input id="event-date" type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="event-lineup">LINEUP / SOUND BY</label>
            <input id="event-lineup" value={lineup} onChange={e => setLineup(e.target.value)} placeholder="DJ Kumi · Tostao" />
          </div>
        </div>

        <div className="hpcard in">
          <div className="hk">Media</div>
          <div className="field">
            <label>Cover image</label>
            {coverImageUrl ? <div className="rdek">{coverImageUrl}</div> : null}
            <UploadDropzone
              title={coverImageUrl ? 'Replace cover image' : 'Drop cover image here'}
              hint="JPG, PNG, WEBP"
              onDrop={uploadCover}
              onClick={() => coverRef.current?.click()}
            />
            <input
              ref={coverRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => {
                const files = Array.from(e.target.files ?? [])
                if (files.length) uploadCover(files)
                e.target.value = ''
              }}
            />
          </div>
          <ArrayEditor
            title="Gallery"
            items={gallery}
            addItem={() => setGallery(prev => [...prev, blankGallery()])}
            render={(item, idx) => (
              <>
                <UploadRow
                  label="Image"
                  value={item.image}
                  accept="image/*"
                  multiple
                  onUpload={file => uploadIntoGallery(idx, file)}
                  onUploadMany={files => uploadMultipleIntoGallery(idx, files)}
                />
                <input
                  value={item.caption ?? ''}
                  onChange={e => setGallery(prev => prev.map((row, i) => i === idx ? { ...row, caption: e.target.value } : row))}
                  placeholder="Caption"
                />
              </>
            )}
            remove={idx => setGallery(prev => prev.filter((_, i) => i !== idx))}
          />
        </div>

        <div className="hpcard in">
          <div className="hk">Sound</div>
          <div className="field">
            <label htmlFor="event-playlist">YouTube Playlist URL</label>
            <input id="event-playlist" value={playlistUrl} onChange={e => setPlaylistUrl(e.target.value)} />
          </div>
          <ArrayEditor
            title="Videos"
            items={videos}
            addItem={() => setVideos(prev => [...prev, blankVideo()])}
            render={(item, idx) => (
              <>
                <input
                  value={item.url}
                  onChange={e => setVideos(prev => prev.map((row, i) => i === idx ? { ...row, url: e.target.value } : row))}
                  placeholder="YouTube URL"
                />
                <input
                  value={item.label ?? ''}
                  onChange={e => setVideos(prev => prev.map((row, i) => i === idx ? { ...row, label: e.target.value } : row))}
                  placeholder="Video title"
                />
              </>
            )}
            remove={idx => setVideos(prev => prev.filter((_, i) => i !== idx))}
          />
          <ArrayEditor
            title="Audio files"
            items={audioFiles}
            addItem={() => setAudioFiles(prev => [...prev, blankAudio()])}
            render={(item, idx) => (
              <>
                <UploadRow label="File" value={item.file} accept="audio/*" onUpload={file => uploadIntoAudio(idx, file)} />
                <input
                  value={item.label}
                  onChange={e => setAudioFiles(prev => prev.map((row, i) => i === idx ? { ...row, label: e.target.value } : row))}
                  placeholder="Label"
                />
              </>
            )}
            remove={idx => setAudioFiles(prev => prev.filter((_, i) => i !== idx))}
          />
        </div>

        <div className="hpcard in">
          <div className="hk">Partners</div>
          <ArrayEditor
            title="Partners"
            items={partners}
            addItem={() => setPartners(prev => [...prev, blankPartner()])}
            render={(item, idx) => (
              <>
                <input
                  value={item.name}
                  onChange={e => setPartners(prev => prev.map((row, i) => i === idx ? { ...row, name: e.target.value } : row))}
                  placeholder="Name"
                />
                <UploadRow label="Logo" value={item.logo ?? ''} accept="image/*" onUpload={file => uploadIntoPartner(idx, file)} />
              </>
            )}
            remove={idx => setPartners(prev => prev.filter((_, i) => i !== idx))}
          />
        </div>

        <div className="hpcard in">
          <div className="hk">Archive</div>
          <div className="field">
            <label>Signup sheets</label>
            <div style={{ display: 'grid', gap: 10 }}>
              {archiveSheets.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 10,
                    minWidth: 0,
                    padding: 10,
                    border: '1px solid var(--line)',
                    background: 'var(--paper-2)',
                  }}
                >
                  <label
                    className="btn ghost"
                    style={{
                      width: 112,
                      minWidth: 112,
                      height: 72,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: item.file ? 0 : '10px 12px',
                      overflow: 'hidden',
                      whiteSpace: item.file ? 'normal' : 'nowrap',
                    }}
                  >
                    {item.file ? (
                      item.file.toLowerCase().split('?')[0].endsWith('.pdf') ? (
                        <span style={{ fontSize: 12, fontWeight: 700 }}>PDF</span>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.file}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      )
                    ) : (
                      'Upload sheet'
                    )}
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      multiple
                      style={{ display: 'none' }}
                      onChange={async e => {
                        const files = Array.from(e.target.files ?? [])
                        if (files[0]) await uploadIntoSheet(idx, files[0])
                        for (const [offset, file] of files.slice(1).entries()) {
                          const nextIdx = archiveSheets.length + offset
                          setArchiveSheets(prev => [...prev, blankSheet()])
                          await uploadIntoSheet(nextIdx, file)
                        }
                        e.target.value = ''
                      }}
                    />
                  </label>
                  <div style={{ flex: '1 1 220px', minWidth: 0, display: 'grid', gap: 6 }}>
                    <input
                      value={item.label}
                      onChange={e => setArchiveSheets(prev => prev.map((row, i) => i === idx ? { ...row, label: e.target.value } : row))}
                      placeholder="Open Decks #1 - March 2025"
                    />
                    {item.file ? (
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11, color: '#999', minWidth: 0 }}>
                        {item.file}
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="btn ghost"
                    style={{ marginLeft: 'auto', flex: '0 0 auto' }}
                    onClick={() => setArchiveSheets(prev => prev.filter((_, i) => i !== idx))}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" className="btn ghost" onClick={() => setArchiveSheets(prev => [...prev, blankSheet()])}>
                + Add signup sheets
              </button>
            </div>
          </div>
          <div className="field">
            <label htmlFor="event-archive-notes">Archivist notes</label>
            <textarea id="event-archive-notes" rows={5} value={archiveNotes} onChange={e => setArchiveNotes(e.target.value)} />
          </div>
        </div>

        <div className="dfoot">
          {event ? (
            <button type="button" className="del" onClick={deleteEvent}>
              Delete event
            </button>
          ) : null}
          <button type="button" className="btn ghost" onClick={() => router.push('/studio/events')}>
            Cancel
          </button>
          <button type="button" className="btn" onClick={saveEvent} disabled={saving || uploading || !name.trim() || !slug.trim()}>
            {saving ? 'Saving...' : uploading ? 'Uploading...' : 'Save event'}
          </button>
        </div>
      </div>
    </>
  )
}

function ArrayEditor<T>({
  title,
  items,
  addItem,
  render,
  remove,
}: {
  title: string
  items: T[]
  addItem: () => void
  render: (item: T, idx: number) => React.ReactNode
  remove: (idx: number) => void
}) {
  return (
    <div className="field">
      <label>{title}</label>
      <div style={{ display: 'grid', gap: 10 }}>
        {items.map((item, idx) => (
          <div key={idx} style={{ display: 'grid', gap: 8, padding: 10, border: '1px solid var(--line)', background: 'var(--paper-2)' }}>
            {render(item, idx)}
            <button type="button" className="btn ghost" onClick={() => remove(idx)}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="btn ghost" onClick={addItem}>
          + Add {title.toLowerCase()}
        </button>
      </div>
    </div>
  )
}

function UploadRow({
  label,
  value,
  accept,
  multiple,
  onUpload,
  onUploadMany,
}: {
  label: string
  value: string
  accept: string
  multiple?: boolean
  onUpload: (file: File) => void
  onUploadMany?: (files: File[]) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <button type="button" className="btn ghost" onClick={() => ref.current?.click()}>
        Upload {label}
      </button>
      {value ? <div className="rdek">{value}</div> : null}
      <input
        ref={ref}
        type="file"
        accept={accept}
        multiple={multiple}
        style={{ display: 'none' }}
        onChange={e => {
          const files = Array.from(e.target.files ?? [])
          if (multiple && onUploadMany) {
            onUploadMany(files)
          } else if (files[0]) {
            onUpload(files[0])
          }
          e.target.value = ''
        }}
      />
    </div>
  )
}
