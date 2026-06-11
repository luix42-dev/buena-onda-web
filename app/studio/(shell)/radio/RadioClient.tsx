'use client'

import { useEffect, useRef, useState, type ChangeEvent, type MouseEvent } from 'react'
import SectionHead from '@/components/studio/SectionHead'
import Drawer from '@/components/studio/Drawer'
import StatusPill from '@/components/studio/StatusPill'
import { useToast } from '@/components/studio/Toast'
import type { Episode } from '@/types'

type Props = {
  initialEpisodes: Episode[]
}

type EpisodeWithAudioKey = Episode & { audio_key?: string | null }

function formatDate(value: string | null | undefined) {
  if (!value) return 'n/a'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function formatDuration(seconds: number | null | undefined) {
  if (seconds == null || Number.isNaN(seconds)) return 'n/a'
  const mins = Math.floor(seconds / 60)
  const secs = String(seconds % 60).padStart(2, '0')
  return `${mins}m ${secs}s`
}

const UPLOAD_PREFIX_RE = /^\d{10,}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function titleCase(value: string) {
  return value.replace(/\b[a-z]/g, char => char.toUpperCase())
}

function deriveEpisodeTitleFromFileName(fileName: string) {
  const stem = fileName.replace(/\.[^.]+$/, '')
  const withoutPrefix = stem
    .replace(UPLOAD_PREFIX_RE, '')
    .replace(/^\d{10,}-/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return titleCase(withoutPrefix || stem)
}

function getAudioFileName(audioUrl: string | null | undefined) {
  if (!audioUrl) return 'n/a'

  try {
    const pathname = new URL(audioUrl).pathname
    return decodeURIComponent(pathname.split('/').pop() ?? audioUrl)
  } catch {
    const fallback = audioUrl.split('/').pop() ?? audioUrl
    try {
      return decodeURIComponent(fallback)
    } catch {
      return fallback
    }
  }
}

function truncateMiddle(value: string, maxLength = 34) {
  if (value.length <= maxLength) return value
  const head = Math.ceil((maxLength - 3) / 2)
  const tail = Math.floor((maxLength - 3) / 2)
  return `${value.slice(0, head)}...${value.slice(value.length - tail)}`
}

function parseTags(raw: string) {
  return raw
    .split(',')
    .map(tag => tag.trim().toLowerCase())
    .filter(Boolean)
}

async function readJsonOrText(res: Response) {
  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return res.json() as Promise<unknown>
  }
  return res.text()
}

export default function RadioClient({ initialEpisodes }: Props) {
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const editFileRef = useRef<HTMLInputElement>(null)
  const [episodes, setEpisodes] = useState<Episode[]>(initialEpisodes)
  const [publishingIds, setPublishingIds] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [episodeNumber, setEpisodeNumber] = useState('')
  const [duration, setDuration] = useState('')
  const [tags, setTags] = useState('archive, radio')
  const [published, setPublished] = useState(false)
  const [audioUrl, setAudioUrl] = useState('')
  const [audioKey, setAudioKey] = useState('')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [editUploading, setEditUploading] = useState(false)
  const [editUploadProgress, setEditUploadProgress] = useState<number | null>(null)
  const [editUploadError, setEditUploadError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setEpisodes(initialEpisodes)
  }, [initialEpisodes])

  const refreshEpisodes = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/episodes', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error((data as { error?: string }).error ?? 'Failed to load episodes.')
      }
      setEpisodes(Array.isArray(data) ? data : [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load episodes.'
      setError(msg)
      toast(msg)
    } finally {
      setLoading(false)
    }
  }

  const closeComposer = () => {
    setComposerOpen(false)
    setEditingEpisode(null)
    setAudioFile(null)
    setAudioUrl('')
    setAudioKey('')
    if (fileRef.current) fileRef.current.value = ''
    if (editFileRef.current) editFileRef.current.value = ''
    setEditUploading(false)
    setEditUploadProgress(null)
    setEditUploadError(null)
  }

  const openComposer = () => {
    setEditingEpisode(null)
    setTitle('')
    setDescription('')
    setEpisodeNumber('')
    setDuration('')
    setTags('archive, radio')
    setPublished(false)
    setAudioUrl('')
    setAudioKey('')
    setAudioFile(null)
    setError(null)
    setEditUploading(false)
    setEditUploadProgress(null)
    setEditUploadError(null)
    setComposerOpen(true)
  }

  const openEditor = (episode: Episode) => {
    setEditingEpisode(episode)
    setTitle(episode.title ?? '')
    setDescription(episode.description ?? '')
    setEpisodeNumber(episode.episode_number != null ? String(episode.episode_number) : '')
    setDuration(episode.duration != null ? String(episode.duration) : '')
    setTags((episode.tags ?? []).join(', '))
    setPublished(episode.published)
    setAudioUrl(episode.audio_url ?? '')
    const episodeWithAudioKey = episode as EpisodeWithAudioKey
    setAudioKey(typeof episodeWithAudioKey.audio_key === 'string' ? episodeWithAudioKey.audio_key : '')
    setAudioFile(null)
    setError(null)
    setEditUploading(false)
    setEditUploadProgress(null)
    setEditUploadError(null)
    setComposerOpen(true)
  }

  const uploadEditedEpisodeAudio = async (file: File) => {
    setEditUploading(true)
    setEditUploadProgress(0)
    setEditUploadError(null)
    setError(null)

    try {
      const signedRes = await fetch('/api/admin/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type || 'audio/mpeg',
          prefix: 'episodes',
        }),
      })
      const signedBody = await readJsonOrText(signedRes)

      if (!signedRes.ok) {
        let msg = `HTTP ${signedRes.status}`
        if (typeof signedBody === 'string' && signedBody) {
          msg = signedBody
        } else if (signedBody && typeof signedBody === 'object' && 'error' in signedBody && typeof signedBody.error === 'string') {
          msg = signedBody.error
        }
        throw new Error(`Signed URL request failed: ${msg}`)
      }

      const uploadData = signedBody as { uploadUrl?: string; publicUrl?: string; key?: string }
      if (!uploadData.uploadUrl || !uploadData.publicUrl || !uploadData.key) {
        throw new Error('Signed upload response is incomplete.')
      }

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', uploadData.uploadUrl!)
        xhr.upload.onprogress = event => {
          if (!event.lengthComputable) return
          setEditUploadProgress(Math.round((event.loaded / event.total) * 100))
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
            return
          }
          reject(new Error(`Transfer to storage failed: HTTP ${xhr.status}${xhr.responseText ? ` — ${xhr.responseText}` : ''}`))
        }
        xhr.onerror = () => reject(new Error('Transfer to storage failed: network or CORS error (no response from R2).'))
        xhr.send(file)
      })

      setAudioUrl(uploadData.publicUrl)
      setAudioKey(uploadData.key)
      setEditUploadProgress(100)
      toast('Audio uploaded. Review and save changes.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Audio upload failed.'
      setEditUploadError(msg)
      toast(msg)
    } finally {
      setEditUploading(false)
    }
  }

  const uploadNewEpisode = async () => {
    const nextTitle = title.trim() || (audioFile ? deriveEpisodeTitleFromFileName(audioFile.name) : '')

    if (!nextTitle) {
      setError('Title is required.')
      return
    }

    if (!audioFile) {
      setError('Choose an MP3 file first.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const signedRes = await fetch('/api/admin/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: audioFile.name,
          contentType: audioFile.type || 'audio/mpeg',
          prefix: 'episodes',
        }),
      })
      const signedBody = await readJsonOrText(signedRes)

      if (!signedRes.ok) {
        let msg = `HTTP ${signedRes.status}`
        if (typeof signedBody === 'string' && signedBody) {
          msg = signedBody
        } else if (signedBody && typeof signedBody === 'object' && 'error' in signedBody && typeof signedBody.error === 'string') {
          msg = signedBody.error
        }
        throw new Error(`Signed URL request failed: ${msg}`)
      }

      const uploadData = signedBody as { uploadUrl?: string; publicUrl?: string; key?: string }
      if (!uploadData.uploadUrl || !uploadData.publicUrl || !uploadData.key) {
        throw new Error('Signed upload response is incomplete.')
      }

      let uploadRes: Response
      try {
        uploadRes = await fetch(uploadData.uploadUrl, {
          method: 'PUT',
          body: audioFile,
        })
      } catch {
        throw new Error('Transfer to storage failed: network or CORS error (no response from R2).')
      }

      if (!uploadRes.ok) {
        const uploadText = await uploadRes.text().catch(() => '')
        throw new Error(`Transfer to storage failed: HTTP ${uploadRes.status}${uploadText ? ` — ${uploadText}` : ''}`)
      }

      const episodeRes = await fetch('/api/admin/episodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: nextTitle,
          description: description.trim() || undefined,
          audio_url: uploadData.publicUrl,
          audio_key: uploadData.key,
          episode_number: episodeNumber ? parseInt(episodeNumber, 10) : null,
          duration: duration ? parseInt(duration, 10) : null,
          tags: parseTags(tags),
          published,
        }),
      })
      const episodeBody = await readJsonOrText(episodeRes)

      if (!episodeRes.ok) {
        let msg = 'Episode create failed.'
        if (typeof episodeBody === 'string') {
          msg = episodeBody
        } else if (episodeBody && typeof episodeBody === 'object' && 'error' in episodeBody && typeof episodeBody.error === 'string') {
          msg = episodeBody.error
        }
        throw new Error(msg)
      }

      setEpisodes(prev => [episodeBody as Episode, ...prev])
      closeComposer()
      toast('Episode uploaded.')
      await refreshEpisodes()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Episode upload failed.'
      setError(msg)
      toast(msg)
    } finally {
      setSaving(false)
    }
  }

  const saveEditedEpisode = async () => {
    if (!editingEpisode || !title.trim()) {
      setError('Title is required.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/episodes/${editingEpisode.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          slug: slugify(title.trim()),
          description: description.trim() || undefined,
          audio_url: audioUrl.trim() || undefined,
          audio_key: audioKey.trim() || undefined,
          episode_number: episodeNumber ? parseInt(episodeNumber, 10) : null,
          duration: duration ? parseInt(duration, 10) : null,
          tags: parseTags(tags),
          published,
        }),
      })
      const body = await readJsonOrText(res)

      if (!res.ok) {
        const msg = typeof body === 'string'
          ? body
          : body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
            ? body.error
            : 'Could not save episode.'
        throw new Error(msg)
      }

      const saved = body as Episode
      setEpisodes(prev => prev.map(episode => episode.id === editingEpisode.id ? saved : episode))
      closeComposer()
      toast('Episode updated.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save episode.'
      setError(msg)
      toast(msg)
    } finally {
      setSaving(false)
    }
  }

  const saveEpisode = async () => {
    if (editingEpisode) {
      await saveEditedEpisode()
      return
    }
    await uploadNewEpisode()
  }

  const deleteEpisode = async () => {
    if (!editingEpisode) return
    if (!window.confirm('Delete this episode? This cannot be undone.')) return

    const res = await fetch(`/api/admin/episodes/${editingEpisode.id}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      const body = await readJsonOrText(res)
      const msg = typeof body === 'string'
        ? body
        : body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
          ? body.error
          : 'Could not delete episode.'
      toast(msg)
      return
    }

    setEpisodes(prev => prev.filter(episode => episode.id !== editingEpisode.id))
    closeComposer()
    toast('Episode deleted.')
  }

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.mp3')) {
      setError('Please choose an MP3 file.')
      toast('Please choose an MP3 file.')
      e.currentTarget.value = ''
      return
    }
    setAudioFile(file)
    setTitle(deriveEpisodeTitleFromFileName(file.name))
    setError(null)

    const url = URL.createObjectURL(file)
    const audio = new Audio()
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => {
      const nextDuration = Number.isFinite(audio.duration) ? Math.round(audio.duration) : 0
      setDuration(String(nextDuration))
      URL.revokeObjectURL(url)
    }
    audio.onerror = () => {
      URL.revokeObjectURL(url)
    }
    audio.src = url
  }

  const onEditFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.mp3')) {
      const msg = 'Please choose an MP3 file.'
      setEditUploadError(msg)
      toast(msg)
      e.currentTarget.value = ''
      return
    }

    await uploadEditedEpisodeAudio(file)

    if (editFileRef.current) editFileRef.current.value = ''
    e.currentTarget.value = ''
  }

  const togglePublished = async (episode: Episode, event?: MouseEvent<HTMLButtonElement>) => {
    event?.stopPropagation()
    if (publishingIds[episode.id]) return

    const nextPublished = !episode.published
    const optimisticEpisode: Episode = {
      ...episode,
      published: nextPublished,
      published_at: nextPublished ? new Date().toISOString() : null,
    }

    setPublishingIds(current => ({ ...current, [episode.id]: true }))
    setEpisodes(current => current.map(item => (
      item.id === episode.id ? optimisticEpisode : item
    )))

    try {
      const res = await fetch(`/api/admin/episodes/${episode.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: nextPublished }),
      })
      const body = await readJsonOrText(res)

      if (!res.ok) {
        let msg = nextPublished ? 'Could not publish episode.' : 'Could not unpublish episode.'
        if (typeof body === 'string') {
          msg = body
        } else if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
          msg = body.error
        }
        throw new Error(msg)
      }

      setEpisodes(current => current.map(item => (
        item.id === episode.id ? body as Episode : item
      )))
      toast(nextPublished ? 'Episode published.' : 'Episode unpublished.')
    } catch (err) {
      setEpisodes(current => current.map(item => (
        item.id === episode.id ? episode : item
      )))
      toast(err instanceof Error ? err.message : 'Could not update episode status.')
    } finally {
      setPublishingIds(current => {
        const next = { ...current }
        delete next[episode.id]
        return next
      })
    }
  }

  return (
    <>
      <SectionHead
        title="The Archive"
        subtitle="Curated mixes, sessions, field recordings"
        actionLabel={saving ? 'Uploading...' : '+ Upload episode'}
        onAction={openComposer}
      />

      <div className="grid gap-4" style={{ paddingTop: 20 }}>
        <div className="hpcard in">
          <div className="hk">Episodes</div>
          <div className="hl">Existing `episodes` table</div>
          <div className="hs">
            Radio archive entries are backed by the current Supabase `episodes` model. Upload requests
            a signed R2 URL, sends the MP3 directly from the browser, then writes the episode record.
          </div>
          <div className="hb">
            <span className="hvis">{loading ? 'Refreshing...' : `${episodes.length} episodes`}</span>
            <span className="hvis">Direct R2 upload wired</span>
          </div>
        </div>

        {error && (
          <div className="empty" style={{ padding: '20px', textAlign: 'left' }}>
            <div className="em-t" style={{ textAlign: 'left' }}>Could not save episode.</div>
            <div className="em-s" style={{ textAlign: 'left' }}>{error}</div>
          </div>
        )}

        {episodes.length === 0 ? (
          <div className="empty">
            <div className="em-t">No episodes wired in yet.</div>
            <div className="em-s">Use Upload episode to seed the archive from the existing API.</div>
          </div>
        ) : (
          <div className="rows">
            <div className="row" style={{ borderTop: '1px solid var(--line)' }}>
              <div className="num">#</div>
              <div className="rmain">
                <div className="rttl">Episode</div>
              </div>
              <div className="rmeta">
                <div className="rdate">Status</div>
                <div className="rdate">Audio</div>
                <div className="rdate">Length</div>
                <div className="rdate">Updated</div>
                <div className="rdate">Action</div>
              </div>
            </div>

            {episodes.map((episode, index) => (
              <div key={episode.id} className="row in" onClick={() => openEditor(episode)}>
                <div className="plnum">{String(index + 1).padStart(2, '0')}</div>
                <div className="rmain">
                  <div className="rttl">{episode.title}</div>
                  <div className="rdek">
                    {episode.description ?? 'No description yet.'}
                  </div>
                </div>
                <div className="rmeta">
                  <StatusPill variant={episode.published ? 'published' : 'draft'} inline rowStyle />
                  <div
                    className="rdate"
                    title={getAudioFileName(episode.audio_url)}
                    style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    {truncateMiddle(getAudioFileName(episode.audio_url))}
                  </div>
                  <div className="rdate">{formatDuration(episode.duration)}</div>
                  <div className="rdate">{formatDate(episode.published_at ?? episode.created_at)}</div>
                  <button
                    type="button"
                    className="raction"
                    onClick={event => void togglePublished(episode, event)}
                    disabled={!!publishingIds[episode.id]}
                  >
                    {publishingIds[episode.id]
                      ? 'Saving...'
                      : episode.published ? 'Unpublish' : 'Publish'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Drawer
        open={composerOpen}
        onClose={closeComposer}
        title={editingEpisode ? 'Edit episode' : 'Upload episode'}
        footer={(
          <>
            {editingEpisode ? (
              <button type="button" className="del" onClick={deleteEpisode}>
                Delete episode
              </button>
            ) : null}
            <button type="button" className="btn ghost" onClick={closeComposer}>
              Cancel
            </button>
            <button
              type="button"
              className="btn coral"
              onClick={saveEpisode}
              disabled={saving || (!editingEpisode && !audioFile) || !title.trim()}
            >
              {saving ? (editingEpisode ? 'Saving...' : 'Uploading...') : editingEpisode ? 'Save changes' : 'Save episode'}
            </button>
          </>
        )}
      >
        <div className="field">
          <label htmlFor="ra-title">Title</label>
          <input
            id="ra-title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Auto-filled from the MP3 filename"
          />
        </div>

        <div className="field">
          <label htmlFor="ra-description">Description</label>
          <textarea
            id="ra-description"
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Notes, lineup, context"
          />
        </div>

        {!editingEpisode ? (
          <div className="field">
            <label htmlFor="ra-audio">Audio file</label>
            <input
              id="ra-audio"
              ref={fileRef}
              type="file"
              accept="audio/mpeg,.mp3"
              onChange={onFileChange}
            />
            <div className="hs" style={{ marginTop: 8 }}>
              MP3 files are uploaded directly to R2 from the browser. The title auto-fills from the
              original filename and can be edited before save.
            </div>
          </div>
        ) : (
          <div className="field">
            <input
              ref={editFileRef}
              type="file"
              accept="audio/mpeg,.mp3"
              style={{ display: 'none' }}
              onChange={event => void onEditFileChange(event)}
            />
            <label htmlFor="ra-audio-url">Audio URL</label>
            <input
              id="ra-audio-url"
              type="url"
              value={audioUrl}
              onChange={e => setAudioUrl(e.target.value)}
              disabled={editUploading}
              placeholder="https://..."
            />
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => editFileRef.current?.click()}
                disabled={editUploading}
              >
                {editUploading ? 'Uploading audio...' : 'Upload audio file'}
              </button>
              {editUploading && (
                <div className="hs">
                  Uploading... {editUploadProgress ?? 0}%
                </div>
              )}
            </div>
            {editUploadError ? <div className="hs" style={{ marginTop: 8 }}>{editUploadError}</div> : null}
            <div className="hs" style={{ marginTop: 8 }}>Upload replaces the Audio URL field only after transfer completes. Save changes manually.</div>
          </div>
        )}

        <div className="field">
          <label htmlFor="ra-number">Episode number</label>
          <input
            id="ra-number"
            type="number"
            min="1"
            value={episodeNumber}
            onChange={e => setEpisodeNumber(e.target.value)}
            placeholder="18"
          />
        </div>

        <div className="field">
          <label htmlFor="ra-duration">Duration (seconds)</label>
          <input
            id="ra-duration"
            type="number"
            min="0"
            value={duration}
            onChange={e => setDuration(e.target.value)}
            placeholder="7440"
          />
        </div>

        <div className="field">
          <label htmlFor="ra-tags">Tags</label>
          <input
            id="ra-tags"
            type="text"
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="archive, radio"
          />
        </div>

        <div className="field">
          <label htmlFor="ra-published">Publish now</label>
          <input
            id="ra-published"
            type="checkbox"
            checked={published}
            onChange={e => setPublished(e.target.checked)}
          />
        </div>
      </Drawer>
    </>
  )
}
