'use client'

import { useEffect, useRef, useState, type ChangeEvent, type MouseEvent } from 'react'
import SectionHead from '@/components/studio/SectionHead'
import Drawer from '@/components/studio/Drawer'
import StatusPill from '@/components/studio/StatusPill'
import SegmentedControl from '@/components/studio/SegmentedControl'
import { useToast } from '@/components/studio/Toast'
import type { CruiseScene, CruiseChannel } from '@/types'

// ── Constants ────────────────────────────────────────────────────────────────

type Tab = 'scenes' | 'channels'

const TAB_OPTIONS: { value: Tab; label: string }[] = [
  { value: 'scenes',   label: 'Scenes' },
  { value: 'channels', label: 'Channels' },
]

const CITY_MAP: Record<string, string> = {
  la:          'Los Angeles',
  miami:       'Miami',
  nyc:         'New York City',
  'hong-kong': 'Hong Kong',
}

const CITY_OPTIONS = Object.entries(CITY_MAP).map(([value, label]) => ({ value, label }))

const TIME_OPTIONS = ['day', 'sunset', 'night'] as const

type Props = {
  initialScenes:   CruiseScene[]
  initialChannels: CruiseChannel[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'n/a'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  }).format(new Date(value))
}

function formatDuration(seconds: number | null | undefined) {
  if (seconds == null || Number.isNaN(seconds)) return 'n/a'
  const mins = Math.floor(seconds / 60)
  const secs = String(seconds % 60).padStart(2, '0')
  return `${mins}m ${secs}s`
}

function trackFilename(key: string) {
  return decodeURIComponent(key.split('/').pop() ?? key)
}

async function readJsonOrText(res: Response) {
  const ct = res.headers.get('content-type') ?? ''
  if (ct.includes('application/json')) return res.json() as Promise<unknown>
  return res.text()
}

function extractErrorMessage(body: unknown, fallback: string) {
  if (typeof body === 'string') return body
  if (body && typeof body === 'object' && 'error' in body && typeof (body as Record<string, unknown>).error === 'string') {
    return (body as Record<string, string>).error
  }
  return fallback
}

// ── XHR upload with progress ─────────────────────────────────────────────────

async function xhrUpload(
  url: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) { resolve(); return }
      reject(new Error(xhr.responseText || 'R2 upload failed.'))
    }
    xhr.onerror = () => reject(new Error('R2 upload failed.'))
    xhr.send(file)
  })
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CruiseClient({ initialScenes, initialChannels }: Props) {
  const toast = useToast()

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>('scenes')

  // ── Scenes state ───────────────────────────────────────────────────────────
  const [scenes, setScenes] = useState<CruiseScene[]>(initialScenes)
  const [publishingSceneIds, setPublishingSceneIds] = useState<Record<string, boolean>>({})

  // ── Channels state ─────────────────────────────────────────────────────────
  const [channels, setChannels] = useState<CruiseChannel[]>(initialChannels)
  const [publishingChannelIds, setPublishingChannelIds] = useState<Record<string, boolean>>({})

  // ── Drawer state ───────────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'scene' | 'channel'>('scene')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Scene form ─────────────────────────────────────────────────────────────
  const [editingScene, setEditingScene] = useState<CruiseScene | null>(null)
  const [scCity, setScCity] = useState('')
  const [scCityLabel, setScCityLabel] = useState('')
  const [scRouteLabel, setScRouteLabel] = useState('')
  const [scTimeOfDay, setScTimeOfDay] = useState('sunset')
  const [scTitle, setScTitle] = useState('')
  const [scVideoKey, setScVideoKey] = useState('')
  const [scDuration, setScDuration] = useState('')
  const [scSort, setScSort] = useState('0')
  const [scPublished, setScPublished] = useState(false)

  // ── Scene video upload ─────────────────────────────────────────────────────
  const videoFileRef = useRef<HTMLInputElement>(null)
  const [videoUploading, setVideoUploading] = useState(false)
  const [videoProgress, setVideoProgress] = useState<number | null>(null)
  const [videoUploadError, setVideoUploadError] = useState<string | null>(null)

  // ── Channel form ───────────────────────────────────────────────────────────
  const [editingChannel, setEditingChannel] = useState<CruiseChannel | null>(null)
  const [chName, setChName] = useState('')
  const [chSlug, setChSlug] = useState('')
  const [chTrackKeys, setChTrackKeys] = useState<string[]>([])
  const [chSort, setChSort] = useState('0')
  const [chPublished, setChPublished] = useState(false)

  // ── Channel track upload ───────────────────────────────────────────────────
  const trackFileRef = useRef<HTMLInputElement>(null)
  const [trackUploading, setTrackUploading] = useState(false)
  const [trackProgress, setTrackProgress] = useState<string | null>(null)

  // ── Sync initial data ──────────────────────────────────────────────────────
  useEffect(() => { setScenes(initialScenes) }, [initialScenes])
  useEffect(() => { setChannels(initialChannels) }, [initialChannels])

  // ── Drawer open/close ──────────────────────────────────────────────────────

  function closeDrawer() {
    setDrawerOpen(false)
    setEditingScene(null)
    setEditingChannel(null)
    setError(null)
    setVideoUploading(false)
    setVideoProgress(null)
    setVideoUploadError(null)
    setTrackUploading(false)
    setTrackProgress(null)
    if (videoFileRef.current) videoFileRef.current.value = ''
    if (trackFileRef.current) trackFileRef.current.value = ''
  }

  // ── Scene: open create ─────────────────────────────────────────────────────
  function openSceneCreate() {
    setDrawerMode('scene')
    setEditingScene(null)
    setScCity('')
    setScCityLabel('')
    setScRouteLabel('')
    setScTimeOfDay('sunset')
    setScTitle('')
    setScVideoKey('')
    setScDuration('')
    setScSort('0')
    setScPublished(false)
    setError(null)
    setVideoUploading(false)
    setVideoProgress(null)
    setVideoUploadError(null)
    setDrawerOpen(true)
  }

  // ── Scene: open edit ───────────────────────────────────────────────────────
  function openSceneEdit(scene: CruiseScene) {
    setDrawerMode('scene')
    setEditingScene(scene)
    setScCity(scene.city)
    setScCityLabel(scene.city_label)
    setScRouteLabel(scene.route_label ?? '')
    setScTimeOfDay(scene.time_of_day)
    setScTitle(scene.title)
    setScVideoKey(scene.video_key ?? '')
    setScDuration(scene.duration_seconds != null ? String(scene.duration_seconds) : '')
    setScSort(String(scene.sort ?? 0))
    setScPublished(scene.published)
    setError(null)
    setVideoUploading(false)
    setVideoProgress(null)
    setVideoUploadError(null)
    setDrawerOpen(true)
  }

  // ── Channel: open create ───────────────────────────────────────────────────
  function openChannelCreate() {
    setDrawerMode('channel')
    setEditingChannel(null)
    setChName('')
    setChSlug('')
    setChTrackKeys([])
    setChSort('0')
    setChPublished(false)
    setError(null)
    setTrackUploading(false)
    setTrackProgress(null)
    setDrawerOpen(true)
  }

  // ── Channel: open edit ─────────────────────────────────────────────────────
  function openChannelEdit(channel: CruiseChannel) {
    setDrawerMode('channel')
    setEditingChannel(channel)
    setChName(channel.name)
    setChSlug(channel.slug)
    setChTrackKeys([...(channel.track_keys ?? [])])
    setChSort(String(channel.sort ?? 0))
    setChPublished(channel.published)
    setError(null)
    setTrackUploading(false)
    setTrackProgress(null)
    setDrawerOpen(true)
  }

  // ── City auto-fill ─────────────────────────────────────────────────────────
  function onCityChange(value: string) {
    setScCity(value)
    if (CITY_MAP[value]) setScCityLabel(CITY_MAP[value])
  }

  // ── Video upload ───────────────────────────────────────────────────────────

  async function uploadVideo(file: File) {
    if (!scCity || !scTimeOfDay) {
      setVideoUploadError('Select city and time of day first.')
      return
    }

    setVideoUploading(true)
    setVideoProgress(0)
    setVideoUploadError(null)

    try {
      const uuid = crypto.randomUUID()
      const desiredKey = `cruise/video/${scCity}/${scTimeOfDay}-${uuid}.mp4`

      const signedRes = await fetch('/api/admin/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: 'video/mp4',
          prefix: 'cruise/video',
          key: desiredKey,
        }),
      })
      const signedBody = await readJsonOrText(signedRes)

      if (!signedRes.ok) {
        throw new Error(extractErrorMessage(signedBody, 'Could not create upload URL.'))
      }

      const { uploadUrl, key } = signedBody as { uploadUrl?: string; key?: string }
      if (!uploadUrl || !key) throw new Error('Signed upload response is incomplete.')

      await xhrUpload(uploadUrl, file, setVideoProgress)

      setScVideoKey(key)
      setVideoProgress(100)
      toast('Video uploaded. Review and save.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Video upload failed.'
      setVideoUploadError(msg)
      toast(msg)
    } finally {
      setVideoUploading(false)
    }
  }

  function onVideoFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.mp4')) {
      setVideoUploadError('Please choose an MP4 file.')
      toast('Please choose an MP4 file.')
      e.currentTarget.value = ''
      return
    }
    void uploadVideo(file)
  }

  // ── Track upload (channel) ─────────────────────────────────────────────────

  async function uploadTracks(files: File[]) {
    setTrackUploading(true)
    setTrackProgress(`0 / ${files.length}`)
    const newKeys: string[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        const uuid = crypto.randomUUID()
        const desiredKey = `cruise/audio/${uuid}.mp3`

        const signedRes = await fetch('/api/admin/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            contentType: 'audio/mpeg',
            prefix: 'cruise/audio',
            key: desiredKey,
          }),
        })
        const signedBody = await readJsonOrText(signedRes)
        if (!signedRes.ok) throw new Error(extractErrorMessage(signedBody, 'Upload URL failed.'))

        const { uploadUrl, key } = signedBody as { uploadUrl?: string; key?: string }
        if (!uploadUrl || !key) throw new Error('Signed upload response is incomplete.')

        await xhrUpload(uploadUrl, file, () => {})

        newKeys.push(key)
        setTrackProgress(`${i + 1} / ${files.length}`)
      } catch (err) {
        toast(err instanceof Error ? err.message : `Failed to upload ${file.name}`)
      }
    }

    if (newKeys.length > 0) {
      setChTrackKeys(prev => [...prev, ...newKeys])
      toast(`${newKeys.length} track(s) uploaded. Save to persist.`)
    }

    setTrackUploading(false)
    setTrackProgress(null)
    if (trackFileRef.current) trackFileRef.current.value = ''
  }

  function onTrackFileChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const mp3s = files.filter(f => f.name.toLowerCase().endsWith('.mp3'))
    if (mp3s.length === 0) {
      toast('Please choose MP3 files.')
      e.currentTarget.value = ''
      return
    }
    void uploadTracks(mp3s)
  }

  // ── Track reorder & delete ─────────────────────────────────────────────────

  function moveTrack(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= chTrackKeys.length) return
    const next = [...chTrackKeys]
    ;[next[index], next[target]] = [next[target], next[index]]
    setChTrackKeys(next)
  }

  async function removeTrack(index: number) {
    const key = chTrackKeys[index]
    setChTrackKeys(prev => prev.filter((_, i) => i !== index))

    // Delete the R2 object immediately
    try {
      await fetch('/api/admin/cruise/tracks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      })
    } catch {
      // R2 delete is best-effort; track is already removed from the list
    }
  }

  // ── Scene: save ────────────────────────────────────────────────────────────

  async function saveScene() {
    if (!scTitle.trim()) { setError('Title is required.'); return }
    if (!scCity)          { setError('City is required.'); return }
    if (!scTimeOfDay)     { setError('Time of day is required.'); return }
    if (!scCityLabel.trim()) { setError('City label is required.'); return }

    setSaving(true)
    setError(null)

    const payload = {
      city: scCity,
      city_label: scCityLabel.trim(),
      route_label: scRouteLabel.trim() || null,
      time_of_day: scTimeOfDay,
      title: scTitle.trim(),
      video_key: scVideoKey || null,
      duration_seconds: scDuration ? parseInt(scDuration, 10) : null,
      sort: parseInt(scSort, 10) || 0,
      published: scPublished,
    }

    try {
      if (editingScene) {
        const res = await fetch(`/api/admin/cruise/scenes/${editingScene.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const body = await readJsonOrText(res)
        if (!res.ok) throw new Error(extractErrorMessage(body, 'Could not save scene.'))
        const saved = body as CruiseScene
        setScenes(prev => prev.map(s => s.id === editingScene.id ? saved : s))
        toast('Scene updated.')
      } else {
        const res = await fetch('/api/admin/cruise/scenes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const body = await readJsonOrText(res)
        if (!res.ok) throw new Error(extractErrorMessage(body, 'Could not create scene.'))
        setScenes(prev => [body as CruiseScene, ...prev])
        toast('Scene created.')
      }
      closeDrawer()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save scene.'
      setError(msg)
      toast(msg)
    } finally {
      setSaving(false)
    }
  }

  // ── Scene: delete ──────────────────────────────────────────────────────────

  async function deleteScene() {
    if (!editingScene) return
    if (!window.confirm('Delete this scene? The video file will also be removed.')) return

    try {
      const res = await fetch(`/api/admin/cruise/scenes/${editingScene.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await readJsonOrText(res)
        toast(extractErrorMessage(body, 'Could not delete scene.'))
        return
      }
      setScenes(prev => prev.filter(s => s.id !== editingScene.id))
      closeDrawer()
      toast('Scene deleted.')
    } catch {
      toast('Could not delete scene.')
    }
  }

  // ── Scene: toggle published ────────────────────────────────────────────────

  async function toggleScenePublished(scene: CruiseScene, event?: MouseEvent<HTMLButtonElement>) {
    event?.stopPropagation()
    if (publishingSceneIds[scene.id]) return

    const next = !scene.published
    setPublishingSceneIds(c => ({ ...c, [scene.id]: true }))
    setScenes(c => c.map(s => s.id === scene.id ? { ...s, published: next } : s))

    try {
      const res = await fetch(`/api/admin/cruise/scenes/${scene.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: next }),
      })
      const body = await readJsonOrText(res)
      if (!res.ok) throw new Error(extractErrorMessage(body, 'Could not update scene.'))
      setScenes(c => c.map(s => s.id === scene.id ? body as CruiseScene : s))
      toast(next ? 'Scene published.' : 'Scene unpublished.')
    } catch (err) {
      setScenes(c => c.map(s => s.id === scene.id ? scene : s))
      toast(err instanceof Error ? err.message : 'Could not update scene.')
    } finally {
      setPublishingSceneIds(c => { const n = { ...c }; delete n[scene.id]; return n })
    }
  }

  // ── Channel: save ──────────────────────────────────────────────────────────

  async function saveChannel() {
    if (!chName.trim()) { setError('Name is required.'); return }
    if (!chSlug.trim()) { setError('Slug is required.'); return }

    setSaving(true)
    setError(null)

    const payload = {
      name: chName.trim(),
      slug: chSlug.trim(),
      track_keys: chTrackKeys,
      sort: parseInt(chSort, 10) || 0,
      published: chPublished,
    }

    try {
      if (editingChannel) {
        const res = await fetch(`/api/admin/cruise/channels/${editingChannel.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const body = await readJsonOrText(res)
        if (!res.ok) throw new Error(extractErrorMessage(body, 'Could not save channel.'))
        const saved = body as CruiseChannel
        setChannels(prev => prev.map(c => c.id === editingChannel.id ? saved : c))
        toast('Channel updated.')
      } else {
        const res = await fetch('/api/admin/cruise/channels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const body = await readJsonOrText(res)
        if (!res.ok) throw new Error(extractErrorMessage(body, 'Could not create channel.'))
        setChannels(prev => [body as CruiseChannel, ...prev])
        toast('Channel created.')
      }
      closeDrawer()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save channel.'
      setError(msg)
      toast(msg)
    } finally {
      setSaving(false)
    }
  }

  // ── Channel: delete ────────────────────────────────────────────────────────

  async function deleteChannel() {
    if (!editingChannel) return
    if (!window.confirm('Delete this channel? All associated track files will also be removed.')) return

    try {
      const res = await fetch(`/api/admin/cruise/channels/${editingChannel.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await readJsonOrText(res)
        toast(extractErrorMessage(body, 'Could not delete channel.'))
        return
      }
      setChannels(prev => prev.filter(c => c.id !== editingChannel.id))
      closeDrawer()
      toast('Channel deleted.')
    } catch {
      toast('Could not delete channel.')
    }
  }

  // ── Channel: toggle published ──────────────────────────────────────────────

  async function toggleChannelPublished(channel: CruiseChannel, event?: MouseEvent<HTMLButtonElement>) {
    event?.stopPropagation()
    if (publishingChannelIds[channel.id]) return

    const next = !channel.published
    setPublishingChannelIds(c => ({ ...c, [channel.id]: true }))
    setChannels(c => c.map(ch => ch.id === channel.id ? { ...ch, published: next } : ch))

    try {
      const res = await fetch(`/api/admin/cruise/channels/${channel.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: next }),
      })
      const body = await readJsonOrText(res)
      if (!res.ok) throw new Error(extractErrorMessage(body, 'Could not update channel.'))
      setChannels(c => c.map(ch => ch.id === channel.id ? body as CruiseChannel : ch))
      toast(next ? 'Channel published.' : 'Channel unpublished.')
    } catch (err) {
      setChannels(c => c.map(ch => ch.id === channel.id ? channel : ch))
      toast(err instanceof Error ? err.message : 'Could not update channel.')
    } finally {
      setPublishingChannelIds(c => { const n = { ...c }; delete n[channel.id]; return n })
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const drawerTitle = drawerMode === 'scene'
    ? (editingScene ? 'Edit scene' : 'New scene')
    : (editingChannel ? 'Edit channel' : 'New channel')

  const actionLabel = tab === 'scenes'
    ? (saving ? 'Saving...' : '+ New scene')
    : (saving ? 'Saving...' : '+ New channel')

  return (
    <>
      <SectionHead
        title="Cruise"
        subtitle="Scenes and audio channels for the cruising player"
        actionLabel={actionLabel}
        onAction={tab === 'scenes' ? openSceneCreate : openChannelCreate}
      />

      <div style={{ paddingTop: 16, paddingBottom: 8 }}>
        <SegmentedControl
          variant="pub"
          options={TAB_OPTIONS}
          value={tab}
          onChange={setTab}
        />
      </div>

      <div className="grid gap-4" style={{ paddingTop: 12 }}>
        {/* ── Scenes tab ──────────────────────────────────────────────────── */}
        {tab === 'scenes' && (
          <>
            <div className="hpcard in">
              <div className="hk">Scenes</div>
              <div className="hl">cruise_scenes table</div>
              <div className="hs">
                Each scene maps a city + time of day to a looping video file stored in R2 at cruise/video/.
              </div>
              <div className="hb">
                <span className="hvis">{scenes.length} scene{scenes.length !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {scenes.length === 0 ? (
              <div className="empty">
                <div className="em-t">No scenes yet.</div>
                <div className="em-s">Create the first scene to upload a cruise video.</div>
              </div>
            ) : (
              <div className="rows">
                <div className="row" style={{ borderTop: '1px solid var(--line)' }}>
                  <div className="num">#</div>
                  <div className="rmain"><div className="rttl">Scene</div></div>
                  <div className="rmeta">
                    <div className="rdate">City</div>
                    <div className="rdate">Time</div>
                    <div className="rdate">Video</div>
                    <div className="rdate">Status</div>
                    <div className="rdate">Action</div>
                  </div>
                </div>

                {scenes.map((scene, i) => (
                  <div key={scene.id} className="row in" onClick={() => openSceneEdit(scene)}>
                    <div className="plnum">{String(i + 1).padStart(2, '0')}</div>
                    <div className="rmain">
                      <div className="rttl">{scene.title}</div>
                      <div className="rdek">{scene.route_label || scene.city_label}</div>
                    </div>
                    <div className="rmeta">
                      <div className="rdate">{scene.city_label}</div>
                      <div className="rdate">{scene.time_of_day}</div>
                      <div className="rdate" style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {scene.video_key ? trackFilename(scene.video_key) : '—'}
                      </div>
                      <StatusPill variant={scene.published ? 'published' : 'draft'} inline rowStyle />
                      <button
                        type="button"
                        className="raction"
                        onClick={e => void toggleScenePublished(scene, e)}
                        disabled={!!publishingSceneIds[scene.id]}
                      >
                        {publishingSceneIds[scene.id] ? 'Saving...' : scene.published ? 'Unpublish' : 'Publish'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Channels tab ────────────────────────────────────────────────── */}
        {tab === 'channels' && (
          <>
            <div className="hpcard in">
              <div className="hk">Channels</div>
              <div className="hl">cruise_channels table</div>
              <div className="hs">
                Audio channels with ordered track playlists stored in R2 at cruise/audio/.
              </div>
              <div className="hb">
                <span className="hvis">{channels.length} channel{channels.length !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {channels.length === 0 ? (
              <div className="empty">
                <div className="em-t">No channels yet.</div>
                <div className="em-s">Create a channel and upload audio tracks.</div>
              </div>
            ) : (
              <div className="rows">
                <div className="row" style={{ borderTop: '1px solid var(--line)' }}>
                  <div className="num">#</div>
                  <div className="rmain"><div className="rttl">Channel</div></div>
                  <div className="rmeta">
                    <div className="rdate">Slug</div>
                    <div className="rdate">Tracks</div>
                    <div className="rdate">Status</div>
                    <div className="rdate">Action</div>
                  </div>
                </div>

                {channels.map((channel, i) => (
                  <div key={channel.id} className="row in" onClick={() => openChannelEdit(channel)}>
                    <div className="plnum">{String(i + 1).padStart(2, '0')}</div>
                    <div className="rmain">
                      <div className="rttl">{channel.name}</div>
                      <div className="rdek">/{channel.slug}</div>
                    </div>
                    <div className="rmeta">
                      <div className="rdate">{channel.slug}</div>
                      <div className="rdate">{channel.track_keys?.length ?? 0}</div>
                      <StatusPill variant={channel.published ? 'published' : 'draft'} inline rowStyle />
                      <button
                        type="button"
                        className="raction"
                        onClick={e => void toggleChannelPublished(channel, e)}
                        disabled={!!publishingChannelIds[channel.id]}
                      >
                        {publishingChannelIds[channel.id] ? 'Saving...' : channel.published ? 'Unpublish' : 'Publish'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Drawer ──────────────────────────────────────────────────────────── */}
      <Drawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={drawerTitle}
        footer={(
          <>
            {(drawerMode === 'scene' && editingScene) && (
              <button type="button" className="del" onClick={deleteScene}>Delete scene</button>
            )}
            {(drawerMode === 'channel' && editingChannel) && (
              <button type="button" className="del" onClick={deleteChannel}>Delete channel</button>
            )}
            <button type="button" className="btn ghost" onClick={closeDrawer}>Cancel</button>
            <button
              type="button"
              className="btn coral"
              onClick={drawerMode === 'scene' ? saveScene : saveChannel}
              disabled={saving}
            >
              {saving ? 'Saving...' : (drawerMode === 'scene' ? (editingScene ? 'Save changes' : 'Create scene') : (editingChannel ? 'Save changes' : 'Create channel'))}
            </button>
          </>
        )}
      >
        {error && (
          <div className="empty" style={{ padding: '12px 16px', textAlign: 'left', marginBottom: 12 }}>
            <div className="em-t" style={{ textAlign: 'left' }}>Error</div>
            <div className="em-s" style={{ textAlign: 'left' }}>{error}</div>
          </div>
        )}

        {/* ── Scene form ────────────────────────────────────────────────── */}
        {drawerMode === 'scene' && (
          <>
            <div className="field">
              <label htmlFor="cr-city">City</label>
              <select
                id="cr-city"
                value={scCity}
                onChange={e => onCityChange(e.target.value)}
              >
                <option value="">Select a city</option>
                {CITY_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="cr-city-label">City label</label>
              <input
                id="cr-city-label"
                type="text"
                value={scCityLabel}
                onChange={e => setScCityLabel(e.target.value)}
                placeholder="Los Angeles"
              />
            </div>

            <div className="field">
              <label htmlFor="cr-route">Route label (optional)</label>
              <input
                id="cr-route"
                type="text"
                value={scRouteLabel}
                onChange={e => setScRouteLabel(e.target.value)}
                placeholder="Pacific Coast Highway"
              />
            </div>

            <div className="field">
              <label htmlFor="cr-time">Time of day</label>
              <select
                id="cr-time"
                value={scTimeOfDay}
                onChange={e => setScTimeOfDay(e.target.value)}
              >
                {TIME_OPTIONS.map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="cr-title">Title</label>
              <input
                id="cr-title"
                type="text"
                value={scTitle}
                onChange={e => setScTitle(e.target.value)}
                placeholder="Midnight at Ocean Drive"
              />
            </div>

            <div className="field">
              <label htmlFor="cr-sort">Sort order</label>
              <input
                id="cr-sort"
                type="number"
                min="0"
                value={scSort}
                onChange={e => setScSort(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="cr-duration">Duration (seconds)</label>
              <input
                id="cr-duration"
                type="number"
                min="0"
                value={scDuration}
                onChange={e => setScDuration(e.target.value)}
                placeholder="900"
              />
            </div>

            <div className="field">
              <label htmlFor="cr-published">Publish now</label>
              <input
                id="cr-published"
                type="checkbox"
                checked={scPublished}
                onChange={e => setScPublished(e.target.checked)}
              />
            </div>

            {/* Video upload */}
            <div className="field">
              <label>Video file</label>
              {scVideoKey && (
                <div className="hs" style={{ marginBottom: 8 }}>
                  Current: <strong>{trackFilename(scVideoKey)}</strong>
                </div>
              )}
              <input
                ref={videoFileRef}
                type="file"
                accept="video/mp4,.mp4"
                onChange={onVideoFileChange}
                disabled={videoUploading || !scCity || !scTimeOfDay}
              />
              {(!scCity || !scTimeOfDay) && (
                <div className="hs" style={{ marginTop: 8 }}>
                  Select city and time of day before uploading.
                </div>
              )}
              {videoUploading && (
                <div style={{ marginTop: 8 }}>
                  <div style={{
                    height: 6,
                    borderRadius: 3,
                    background: 'var(--line)',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${videoProgress ?? 0}%`,
                      background: 'var(--coral)',
                      borderRadius: 3,
                      transition: 'width 0.2s ease',
                    }} />
                  </div>
                  <div className="hs" style={{ marginTop: 4 }}>
                    Uploading... {videoProgress ?? 0}%
                  </div>
                </div>
              )}
              {videoUploadError && (
                <div className="hs" style={{ marginTop: 8, color: 'var(--coral)' }}>
                  {videoUploadError}
                </div>
              )}
              <div className="hs" style={{ marginTop: 8 }}>
                H.264 MP4, 1080p, ≤10 Mbps, target 10–20 min seamless loop.
              </div>
            </div>
          </>
        )}

        {/* ── Channel form ──────────────────────────────────────────────── */}
        {drawerMode === 'channel' && (
          <>
            <div className="field">
              <label htmlFor="ch-name">Name</label>
              <input
                id="ch-name"
                type="text"
                value={chName}
                onChange={e => {
                  setChName(e.target.value)
                  if (!editingChannel) setChSlug(slugify(e.target.value))
                }}
                placeholder="Sunset Cruise"
              />
            </div>

            <div className="field">
              <label htmlFor="ch-slug">Slug</label>
              <input
                id="ch-slug"
                type="text"
                value={chSlug}
                onChange={e => setChSlug(e.target.value)}
                placeholder="sunset-cruise"
              />
            </div>

            <div className="field">
              <label htmlFor="ch-sort">Sort order</label>
              <input
                id="ch-sort"
                type="number"
                min="0"
                value={chSort}
                onChange={e => setChSort(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="ch-published">Publish now</label>
              <input
                id="ch-published"
                type="checkbox"
                checked={chPublished}
                onChange={e => setChPublished(e.target.checked)}
              />
            </div>

            {/* Track list */}
            <div className="field">
              <label>Tracks ({chTrackKeys.length})</label>
              {chTrackKeys.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                  {chTrackKeys.map((key, i) => (
                    <div
                      key={key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 8px',
                        borderRadius: 4,
                        background: 'var(--card)',
                        border: '1px solid var(--line)',
                        fontSize: 13,
                      }}
                    >
                      <span style={{ opacity: 0.5, minWidth: 20 }}>{i + 1}.</span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {trackFilename(key)}
                      </span>
                      <button
                        type="button"
                        className="btn ghost"
                        style={{ padding: '2px 6px', fontSize: 12, lineHeight: 1 }}
                        onClick={() => moveTrack(i, -1)}
                        disabled={i === 0}
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        style={{ padding: '2px 6px', fontSize: 12, lineHeight: 1 }}
                        onClick={() => moveTrack(i, 1)}
                        disabled={i === chTrackKeys.length - 1}
                        title="Move down"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        style={{ padding: '2px 6px', fontSize: 12, lineHeight: 1, color: 'var(--coral)' }}
                        onClick={() => void removeTrack(i)}
                        title="Remove track"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <input
                ref={trackFileRef}
                type="file"
                accept="audio/mpeg,.mp3"
                multiple
                onChange={onTrackFileChange}
                disabled={trackUploading}
              />
              {trackUploading && (
                <div className="hs" style={{ marginTop: 8 }}>
                  Uploading tracks... {trackProgress}
                </div>
              )}
              <div className="hs" style={{ marginTop: 8 }}>
                MP3 files uploaded directly to R2 at cruise/audio/. Reorder with ↑↓ buttons.
              </div>
            </div>
          </>
        )}
      </Drawer>
    </>
  )
}
