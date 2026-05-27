import SectionHead from '@/components/studio/SectionHead'
import StatusPill from '@/components/studio/StatusPill'
import { listRadioTracks, type Track } from '@/lib/radio'

export const dynamic = 'force-dynamic'

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

export default async function PlayerPage() {
  let tracks: Track[] = []
  let error: string | null = null

  try {
    tracks = await listRadioTracks()
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load tracks.'
  }

  return (
    <>
      <SectionHead
        title="The Player"
        subtitle="Background music for the store"
      />

      <div className="grid gap-4" style={{ paddingTop: 20 }}>
        <div className="hpcard in">
          <div className="hk">Upload</div>
          <div className="hl">Upload track not wired yet</div>
          <div className="hs">
            The public player reads from Cloudflare R2, but this Studio still has no track upload path.
            The existing admin upload helper writes to Supabase Storage, so I am leaving this button
            intentionally inactive instead of faking the workflow.
          </div>
          <div className="hb">
            <span className="hvis">R2 read-only until a write endpoint is added</span>
            <button type="button" className="btn ghost" disabled>
              + Upload track
            </button>
          </div>
        </div>

        {error ? (
          <div className="empty">
            <div className="em-t">Could not load R2 tracks.</div>
            <div className="em-s">{error}</div>
          </div>
        ) : tracks.length === 0 ? (
          <div className="empty">
            <div className="em-t">No rotation yet.</div>
            <div className="em-s">
              R2 is reachable, but the bucket has no public `audio/` objects to show in Studio.
            </div>
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
