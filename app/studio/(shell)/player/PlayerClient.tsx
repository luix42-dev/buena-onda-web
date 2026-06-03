'use client'

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react'
import SectionHead from '@/components/studio/SectionHead'
import StatusPill from '@/components/studio/StatusPill'
import { useToast } from '@/components/studio/Toast'
import type { Track } from '@/lib/radio'

function formatBytes(size: number | null | undefined) {
  if (!size || size <= 0) return 'n/a'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = size
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'n/a'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

async function readJsonOrText(res: Response) {
  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return res.json() as Promise<unknown>
  }
  return res.text()
}

type SortableTrackRowProps = {
  track: Track
  index: number
  editingKey: string | null
  draftTitle: string
  savingTitleKey: string | null
  savingOrder: boolean
  onStartEdit: (track: Track) => void
  onDraftTitleChange: (value: string) => void
  onEditBlur: (track: Track) => void
  onEditKeyDown: (event: KeyboardEvent<HTMLInputElement>, track: Track) => void
}

function SortableTrackRow({
  track,
  index,
  editingKey,
  draftTitle,
  savingTitleKey,
  savingOrder,
  onStartEdit,
  onDraftTitleChange,
  onEditBlur,
  onEditKeyDown,
}: SortableTrackRowProps) {
  const sortableId = track.key ?? track.src
  const isEditing = editingKey === track.key
  const isSavingTitle = savingTitleKey === track.key
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId, disabled: savingOrder })

  const style: CSSProperties = {
    transform: transform
      ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
      : undefined,
    transition,
    cursor: isDragging ? 'grabbing' : 'default',
    position: isDragging ? 'relative' : undefined,
    zIndex: isDragging ? 2 : undefined,
  }

  return (
    <div ref={setNodeRef} className={`row in${isDragging ? ' dragging' : ''}`} style={style}>
      <div className="pllead">
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="plgrab"
          aria-label={`Reorder ${track.title}`}
          disabled={savingOrder}
          {...attributes}
          {...listeners}
        >
          ::
        </button>
        <div className="plnum">{String(index + 1).padStart(2, '0')}</div>
      </div>
      <div className="rmain">
        {isEditing ? (
          <input
            className="plinput"
            value={draftTitle}
            onChange={event => onDraftTitleChange(event.target.value)}
            onBlur={() => onEditBlur(track)}
            onKeyDown={event => onEditKeyDown(event, track)}
            autoFocus
            disabled={isSavingTitle}
            maxLength={140}
          />
        ) : (
          <button
            type="button"
            className="pltitlebtn"
            onClick={() => onStartEdit(track)}
            disabled={!track.key || savingOrder || !!savingTitleKey}
          >
            {track.title}
          </button>
        )}
        <div className="rdek">{track.artist || 'Untitled source'}</div>
      </div>
      <div className="rmeta">
        <div className="rdate" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {track.fileName ?? track.key?.split('/').pop() ?? 'n/a'}
        </div>
        <StatusPill variant="published" inline rowStyle label={track.status ?? 'Ready'} />
        <div className="rdate">{formatBytes(track.size)}</div>
        <div className="rdate">{formatDate(track.lastModified)}</div>
      </div>
    </div>
  )
}

export default function PlayerClient() {
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const blurActionRef = useRef<'save' | 'cancel' | null>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [savingOrder, setSavingOrder] = useState(false)
  const [savingTitleKey, setSavingTitleKey] = useState<string | null>(null)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  )

  const loadTracks = async () => {
    setLoading(true)
    setLoadError(null)

    try {
      console.log('[player] loadTracks: GET /api/radio/tracks')
      const res = await fetch('/api/radio/tracks', { cache: 'no-store' })
      console.log('[player] loadTracks: status', res.status, 'url', res.url)
      const body = await readJsonOrText(res)

      if (!res.ok) {
        let msg = 'Failed to load tracks.'
        if (typeof body === 'string') {
          msg = body
        } else if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
          msg = body.error
        }
        throw new Error(msg)
      }

      const list = Array.isArray(body) ? body : []
      console.log('[player] loadTracks: loaded', list.length, 'tracks')
      setTracks(list as Track[])
      setEditingKey(null)
      setDraftTitle('')
    } catch (err) {
      console.error('[player] loadTracks: error', err)
      const msg = err instanceof Error ? err.message : 'Failed to load tracks.'
      setLoadError(msg)
      toast(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadTracks()
  }, [])

  const startEditing = (track: Track) => {
    if (!track.key || savingOrder || savingTitleKey) return
    setEditingKey(track.key)
    setDraftTitle(track.title)
  }

  const stopEditing = () => {
    setEditingKey(null)
    setDraftTitle('')
  }

  const saveEditedTitle = async (track: Track) => {
    const trackKey = track.key?.trim()
    const nextTitle = draftTitle.trim()

    if (!trackKey) {
      stopEditing()
      return
    }

    if (!nextTitle) {
      toast('Track title cannot be empty.')
      stopEditing()
      return
    }

    if (nextTitle === track.title) {
      stopEditing()
      return
    }

    setSavingTitleKey(trackKey)

    try {
      const res = await fetch('/api/radio/tracks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: trackKey, title: nextTitle }),
      })
      const body = await readJsonOrText(res)

      if (!res.ok) {
        let msg = 'Could not save track title.'
        if (typeof body === 'string') {
          msg = body
        } else if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
          msg = body.error
        }
        throw new Error(msg)
      }

      setTracks(current =>
        current.map(item => (
          item.key === trackKey
            ? { ...item, title: nextTitle }
            : item
        ))
      )
      toast('Track title updated.')
      stopEditing()
    } catch (err) {
      console.error('[player] saveEditedTitle: error', err)
      const msg = err instanceof Error ? err.message : 'Could not save track title.'
      toast(msg)
      stopEditing()
    } finally {
      setSavingTitleKey(null)
    }
  }

  const handleEditBlur = (track: Track) => {
    const action = blurActionRef.current
    blurActionRef.current = null

    if (action === 'cancel') {
      stopEditing()
      return
    }

    void saveEditedTitle(track)
  }

  const handleEditKeyDown = (event: KeyboardEvent<HTMLInputElement>, track: Track) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      blurActionRef.current = 'cancel'
      event.currentTarget.blur()
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      blurActionRef.current = 'save'
      event.currentTarget.blur()
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || savingOrder) return

    const oldIndex = tracks.findIndex(track => (track.key ?? track.src) === active.id)
    const newIndex = tracks.findIndex(track => (track.key ?? track.src) === over.id)

    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return

    const previousTracks = tracks
    const nextTracks = arrayMove(tracks, oldIndex, newIndex).map((track, index) => ({
      ...track,
      position: index,
    }))
    const orderedKeys = nextTracks
      .map(track => track.key)
      .filter((key): key is string => typeof key === 'string' && key.length > 0)

    setTracks(nextTracks)
    setSavingOrder(true)
    stopEditing()

    try {
      const res = await fetch('/api/radio/tracks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedKeys }),
      })
      const body = await readJsonOrText(res)

      if (!res.ok) {
        let msg = 'Could not save track order.'
        if (typeof body === 'string') {
          msg = body
        } else if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
          msg = body.error
        }
        throw new Error(msg)
      }

      toast('Track order updated.')
    } catch (err) {
      console.error('[player] handleDragEnd: error', err)
      const msg = err instanceof Error ? err.message : 'Could not save track order.'
      setTracks(previousTracks)
      toast(msg)
    } finally {
      setSavingOrder(false)
    }
  }

  const uploadTrack = async (file: File) => {
    setUploading(true)
    setMessage(null)
    setUploadError(null)

    try {
      const signedRes = await fetch('/api/admin/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type || 'audio/mpeg',
          folder: 'audio',
        }),
      })
      const body = await readJsonOrText(signedRes)

      if (!signedRes.ok) {
        let msg = 'Could not create upload URL.'
        if (typeof body === 'string') {
          msg = body
        } else if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
          msg = body.error
        }
        throw new Error(msg)
      }

      const uploadData = body as { uploadUrl?: string; publicUrl?: string; key?: string }
      if (!uploadData.uploadUrl || !uploadData.publicUrl || !uploadData.key) {
        throw new Error('Signed upload response is incomplete.')
      }

      console.log('[player] uploadTrack: PUT', uploadData.uploadUrl.split('?')[0])
      const uploadRes = await fetch(uploadData.uploadUrl, {
        method: 'PUT',
        body: file,
      })

      if (!uploadRes.ok) {
        const uploadText = await uploadRes.text().catch(() => '')
        throw new Error(uploadText || 'R2 upload failed.')
      }

      setMessage('Upload complete.')
      toast('Track uploaded.')
      await loadTracks()
    } catch (err) {
      console.error('[player] uploadTrack: error', err)
      const msg = err instanceof Error ? err.message : 'Audio upload failed.'
      setUploadError(msg)
      toast(msg)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('audio/')) {
      setUploadError('Please choose an audio file.')
      toast('Please choose an audio file.')
      e.currentTarget.value = ''
      return
    }
    await uploadTrack(file)
  }

  return (
    <>
      <SectionHead
        title="The Player"
        subtitle="Background music for the store"
        actionLabel={uploading ? 'Uploading...' : '+ Upload track'}
        onAction={() => fileRef.current?.click()}
      />

      <input
        ref={fileRef}
        type="file"
        accept="audio/mpeg,.mp3"
        style={{ display: 'none' }}
        onChange={onFileChange}
      />

      <div className="grid gap-4" style={{ paddingTop: 20 }}>
        <div className="hpcard in">
          <div className="hk">Upload</div>
          <div className="hl">Track upload wired</div>
          <div className="hs">
            MP3 uploads request a signed R2 upload URL, then send the file directly to R2 from the
            browser. The track list refreshes after upload.
          </div>
          <div className="hb">
            <span className="hvis">MP3 files only</span>
            <span className="hvis">{loading ? 'Loading...' : `${tracks.length} tracks`}</span>
          </div>
        </div>

        {uploadError && (
          <div className="empty">
            <div className="em-t">Upload failed.</div>
            <div className="em-s">{uploadError}</div>
          </div>
        )}

        {message && (
          <div className="empty" style={{ padding: '20px', textAlign: 'left' }}>
            <div className="em-t" style={{ textAlign: 'left' }}>{message}</div>
            <div className="em-s" style={{ textAlign: 'left' }}>Track list refreshed from R2.</div>
          </div>
        )}

        {loadError ? (
          <div className="empty">
            <div className="em-t">Could not load tracks.</div>
            <div className="em-s">{loadError}</div>
          </div>
        ) : loading ? (
          <div className="empty">
            <div className="em-t">Loading tracks...</div>
            <div className="em-s">Fetching the current R2 track list.</div>
          </div>
        ) : tracks.length === 0 ? (
          <div className="empty">
            <div className="em-t">No rotation yet.</div>
            <div className="em-s">R2 is reachable, but the bucket has no public `audio/` objects to show in Studio.</div>
          </div>
        ) : (
          <div className="rows">
            <div className="row" style={{ borderTop: '1px solid var(--line)' }}>
              <div className="pllead">
                <div className="num">#</div>
              </div>
              <div className="rmain">
                <div className="rttl">Track</div>
              </div>
              <div className="rmeta">
                <div className="rdate">File</div>
                <div className="rdate">Status</div>
                <div className="rdate">Size</div>
                <div className="rdate">Updated</div>
              </div>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext
                items={tracks.map(track => track.key ?? track.src)}
                strategy={verticalListSortingStrategy}
              >
                {tracks.map((track, index) => (
                  <SortableTrackRow
                    key={track.key ?? `${track.src}-${index}`}
                    track={track}
                    index={index}
                    editingKey={editingKey}
                    draftTitle={draftTitle}
                    savingTitleKey={savingTitleKey}
                    savingOrder={savingOrder}
                    onStartEdit={startEditing}
                    onDraftTitleChange={setDraftTitle}
                    onEditBlur={handleEditBlur}
                    onEditKeyDown={handleEditKeyDown}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}
      </div>
    </>
  )
}
