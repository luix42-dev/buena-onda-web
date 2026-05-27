'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import SectionHead from '@/components/studio/SectionHead'
import Drawer from '@/components/studio/Drawer'
import StatusPill from '@/components/studio/StatusPill'
import { useToast } from '@/components/studio/Toast'
import type { Episode } from '@/types'

type Props = {
  initialEpisodes: Episode[]
}

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

function parseTags(raw: string) {
  return raw
    .split(',')
    .map(tag => tag.trim().toLowerCase())
    .filter(Boolean)
}

export default function RadioClient({ initialEpisodes }: Props) {
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [episodes, setEpisodes] = useState<Episode[]>(initialEpisodes)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [episodeNumber, setEpisodeNumber] = useState('')
  const [duration, setDuration] = useState('')
  const [tags, setTags] = useState('archive, radio')
  const [published, setPublished] = useState(false)
  const [audioFile, setAudioFile] = useState<File | null>(null)
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

  const openComposer = () => {
    setTitle('')
    setDescription('')
    setEpisodeNumber('')
    setDuration('')
    setTags('archive, radio')
    setPublished(false)
    setAudioFile(null)
    setError(null)
    setComposerOpen(true)
  }

  const uploadEpisode = async () => {
    if (!title.trim()) {
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
      const uploadData = new FormData()
      uploadData.append('file', audioFile)
      uploadData.append('folder', 'audio')

      const uploadRes = await fetch('/api/admin/upload', {
        method: 'POST',
        body: uploadData,
      })
      const uploadJson = await uploadRes.json()

      if (!uploadRes.ok) {
        throw new Error((uploadJson as { error?: string }).error ?? 'Audio upload failed.')
      }

      const episodeRes = await fetch('/api/admin/episodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          audio_url: (uploadJson as { url?: string }).url,
          episode_number: episodeNumber ? parseInt(episodeNumber, 10) : null,
          duration: duration ? parseInt(duration, 10) : null,
          tags: parseTags(tags),
          published,
        }),
      })
      const episodeJson = await episodeRes.json()

      if (!episodeRes.ok) {
        throw new Error((episodeJson as { error?: string }).error ?? 'Episode create failed.')
      }

      setEpisodes(prev => [episodeJson as Episode, ...prev])
      setComposerOpen(false)
      toast('Episode uploaded.')
      await refreshEpisodes()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Episode upload failed.'
      setError(msg)
      toast(msg)
    } finally {
      setSaving(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    if (!file) return
    if (!file.type.startsWith('audio/')) {
      setError('Please choose an audio file.')
      toast('Please choose an audio file.')
      e.currentTarget.value = ''
      return
    }
    setAudioFile(file)
    setError(null)
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
            Radio archive entries are backed by the current Supabase `episodes` model. Upload sends the
            file to R2 first, then writes the episode record.
          </div>
          <div className="hb">
            <span className="hvis">{loading ? 'Refreshing...' : `${episodes.length} episodes`}</span>
            <span className="hvis">MP3 upload wired</span>
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
              </div>
            </div>

            {episodes.map((episode, index) => (
              <div key={episode.id} className="row in">
                <div className="plnum">{String(index + 1).padStart(2, '0')}</div>
                <div className="rmain">
                  <div className="rttl">{episode.title}</div>
                  <div className="rdek">
                    {episode.description ?? 'No description yet.'}
                  </div>
                </div>
                <div className="rmeta">
                  <StatusPill variant={episode.published ? 'published' : 'draft'} inline rowStyle />
                  <div className="rdate" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {episode.audio_url ?? 'n/a'}
                  </div>
                  <div className="rdate">{formatDuration(episode.duration)}</div>
                  <div className="rdate">{formatDate(episode.published_at ?? episode.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Drawer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        title="Upload episode"
        footer={(
          <>
            <button type="button" className="btn ghost" onClick={() => setComposerOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn coral"
              onClick={uploadEpisode}
              disabled={saving || !title.trim() || !audioFile}
            >
              {saving ? 'Uploading...' : 'Save episode'}
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
            placeholder="Episode title"
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
            MP3 files are required so the track can appear in the existing radio listing.
          </div>
        </div>

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
