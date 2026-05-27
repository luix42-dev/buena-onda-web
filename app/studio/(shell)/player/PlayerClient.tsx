'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
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

export default function PlayerClient() {
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const loadTracks = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/radio/tracks', { cache: 'no-store' })
      const body = await readJsonOrText(res)

      if (!res.ok) {
        let message = 'Failed to load tracks.'
        if (typeof body === 'string') {
          message = body
        } else if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
          message = body.error
        }
        throw new Error(message)
      }

      setTracks(Array.isArray(body) ? body : [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load tracks.'
      setError(msg)
      toast(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadTracks()
  }, [])

  const uploadTrack = async (file: File) => {
    setUploading(true)
    setMessage(null)
    setError(null)

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
        let message = 'Could not create upload URL.'
        if (typeof body === 'string') {
          message = body
        } else if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
          message = body.error
        }
        throw new Error(message)
      }

      const uploadData = body as { uploadUrl?: string; publicUrl?: string; key?: string }
      if (!uploadData.uploadUrl || !uploadData.publicUrl || !uploadData.key) {
        throw new Error('Signed upload response is incomplete.')
      }

      const uploadRes = await fetch(uploadData.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'audio/mpeg',
        },
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
      const msg = err instanceof Error ? err.message : 'Audio upload failed.'
      setError(msg)
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
      setError('Please choose an audio file.')
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

        {message && (
          <div className="empty" style={{ padding: '20px', textAlign: 'left' }}>
            <div className="em-t" style={{ textAlign: 'left' }}>{message}</div>
            <div className="em-s" style={{ textAlign: 'left' }}>Track list refreshed from R2.</div>
          </div>
        )}

        {error ? (
          <div className="empty">
            <div className="em-t">Could not load tracks.</div>
            <div className="em-s">{error}</div>
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
              <div className="num">#</div>
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

            {tracks.map((track, index) => (
              <div key={track.key ?? `${track.src}-${index}`} className="row in">
                <div className="plnum">{String(index + 1).padStart(2, '0')}</div>
                <div className="rmain">
                  <div className="rttl">{track.title}</div>
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
            ))}
          </div>
        )}
      </div>
    </>
  )
}
