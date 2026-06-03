'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import SectionHead from '@/components/studio/SectionHead'
import { useToast } from '@/components/studio/Toast'

export type TimelineEra = {
  id: string
  slug: string
  year: string
  title: string
  summary: string
  story: string
  photo: string | null
  photos: string[]
  sort_order: number
}

type EditState = TimelineEra

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  )
}

export default function TimelineClient({ initialEras }: { initialEras: TimelineEra[] }) {
  const toast = useToast()
  const [eras, setEras] = useState(initialEras)
  const [editing, setEditing] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    if (!editing) return
    setSaving(true)
    setError(null)

    try {
      const isFallback = editing.id.startsWith('fallback:')
      const editingId = editing.id
      const res = await fetch(isFallback ? '/api/admin/timeline' : `/api/admin/timeline/${editing.id}`, {
        method: isFallback ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: editing.slug,
          year: editing.year,
          title: editing.title,
          summary: editing.summary,
          story: editing.story,
          photo: editing.photo,
          photos: editing.photos,
          sort_order: editing.sort_order,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(typeof data.error === 'string' ? data.error : 'Could not save era.')
      }

      const updated = await res.json() as TimelineEra
      setEras(prev => prev.map(era => era.id === editingId ? updated : era))
      setEditing(null)
      toast('Timeline era saved.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save era.'
      setError(message)
      toast(message)
    } finally {
      setSaving(false)
    }
  }

  const deleteEra = async (era: TimelineEra) => {
    if (eras.length <= 1) return
    if (!window.confirm(`Delete ${era.year} — ${era.title}? This cannot be undone.`)) return
    if (era.id.startsWith('fallback:')) {
      toast('Save this era to the database before deleting it.')
      return
    }
    try {
      const res = await fetch(`/api/admin/timeline/${era.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(typeof data.error === 'string' ? data.error : 'Delete failed.')
      }
      setEras(prev => prev.filter(e => e.id !== era.id))
      toast(`${era.year} deleted.`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed.'
      setError(message)
      toast(message)
    }
  }

  const uploadHeroPhoto = async (file: File) => {
    if (!editing) return
    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'timeline')

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(typeof data.error === 'string' ? data.error : 'Upload failed.')
      }

      const data = await res.json() as { url?: string }
      if (!data.url) throw new Error('Upload did not return a URL.')
      setEditing(prev => prev && { ...prev, photo: data.url ?? null })
      toast('Hero photo uploaded.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed.'
      setError(message)
      toast(message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <SectionHead
        title="Timeline Eras"
        subtitle="Edit the About timeline copy and optional hero photo for each era."
      />

      {error ? <p className="error">{error}</p> : null}

      <div className="grid gap-2">
        {eras.map(era => (
          <div
            key={era.slug}
            style={{ display: 'flex', alignItems: 'stretch', border: '1px solid var(--line)', background: 'var(--paper)' }}
          >
            <button
              type="button"
              className="text-left"
              style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: '96px 160px 1fr',
                gap: 16,
                alignItems: 'baseline',
                padding: '14px 16px',
                background: 'transparent',
                border: 'none',
                color: 'var(--ink)',
                cursor: 'pointer',
              }}
              onClick={() => setEditing({ ...era, photos: [...era.photos] })}
            >
              <span style={{ fontSize: 11, letterSpacing: '.12em', color: 'var(--muted)' }}>{era.year}</span>
              <span style={{ fontFamily: 'var(--studio-display)', fontSize: 19, textTransform: 'uppercase' }}>{era.title}</span>
              <span style={{ fontSize: 13, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{era.summary}</span>
            </button>
            <button
              type="button"
              onClick={() => void deleteEra(era)}
              disabled={eras.length <= 1}
              title={eras.length <= 1 ? 'Cannot delete last era' : `Delete ${era.year}`}
              style={{
                padding: '0 18px',
                background: 'transparent',
                border: 'none',
                borderLeft: '1px solid var(--line)',
                color: eras.length <= 1 ? 'var(--muted)' : '#E8176A',
                cursor: eras.length <= 1 ? 'default' : 'pointer',
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {editing ? (
        <>
          <div className="scrim on" onClick={() => setEditing(null)} />
          <section className="drawer on">
            <div className="dhead">
              <div>
                <p className="ey">Editing Era</p>
                <h2 className="lbl">{editing.year} / {editing.title}</h2>
              </div>
              <button className="x" type="button" onClick={() => setEditing(null)}>x</button>
            </div>

            <div className="dbody">
              <Field label="Era label">
                <input type="text" value={editing.year} onChange={event => setEditing(prev => prev && { ...prev, year: event.target.value })} />
              </Field>
              <Field label="Headline">
                <input type="text" value={editing.title} onChange={event => setEditing(prev => prev && { ...prev, title: event.target.value })} />
              </Field>
              <Field label="Subheadline">
                <input type="text" value={editing.summary} onChange={event => setEditing(prev => prev && { ...prev, summary: event.target.value })} />
              </Field>
              <Field label="Hero photo URL">
                <input type="text" value={editing.photo ?? ''} onChange={event => setEditing(prev => prev && { ...prev, photo: event.target.value.trim() || null })} />
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={event => {
                    const file = event.target.files?.[0]
                    if (file) void uploadHeroPhoto(file)
                  }}
                />
                <small>{uploading ? 'Uploading...' : 'Paste a URL or upload one image for this era.'}</small>
              </Field>
              <Field label="Body">
                <textarea rows={12} value={editing.story} onChange={event => setEditing(prev => prev && { ...prev, story: event.target.value })} />
              </Field>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn ghost" type="button" onClick={() => setEditing(null)}>Cancel</button>
                <button className="btn coral" type="button" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </>
  )
}
