'use client'
import { COMPANION_NAME, COMPANION_THUMB, type Line } from '@/lib/cruise/nova/persona'

/** Accessible subtitles while NOVA's full-body projection owns the bridge scene. */
export default function NovaCaption({ line }: { line: Line | null; speaking?: boolean }) {
  return <div className="nova-caption"><div className="nova-presence" aria-label={`${COMPANION_NAME}, your Retrowave companion`}><img src={COMPANION_THUMB} alt="" width={64} height={80} decoding="async"/><span>{COMPANION_NAME}<small>WITH YOU ON RETROWAVE</small></span></div><div role="status" aria-live="polite">{line && <p key={line.id}><b><span>{COMPANION_NAME}</span>{line.text}</b></p>}</div></div>
}
