'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import SectionHead from '@/components/studio/SectionHead'
import StatusPill from '@/components/studio/StatusPill'
import { useToast } from '@/components/studio/Toast'
import type { Track } from '@/lib/radio'

type Props = {
  initialTracks: Track[]
  initialError: string | null
}

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

export default function PlayerClient({ initialTracks, initialError }: Props) {
  const toast = useToast()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [tracks, setTracks] = useState<Track[]>(initialTracks)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(initialError)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    setTracks(initialTracks)
    setError(initialError)
  }, [initialTracks, initialError])

  const readResponseBody = async (res: Response) => {
    const contentType = res.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      return res.json() as Promise<unknown>
    }
    return res.text()
  }

  const uploadTrack = async (file: File) => {
    setUploading(true)
    setMessage(null)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'audio')

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      })
      const body = await readResponseBody(res)

      if (!res.ok) {
        let message = 'Audio upload failed.'
        if (typeof body === 'string') {
          message = body
        } else if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
          message = body.error
        }
        throw new Error(message)
      }

      setMessage('Upload complete.')
      toast('Track uploaded.')
      router.refresh()
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
            MP3 uploads use the existing admin upload route with the R2 audio bucket. The page then
            refreshes from the server-side track loader.
          </div>
          <div className="hb">
            <span className="hvis">MP3 files only</span>
            <span className="hvis">{`${tracks.length} tracks`}</span>
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
