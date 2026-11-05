'use client'
import { useEffect, useRef, useState } from 'react'
import { createPostcardBlob, normalizePostcardDetails, postcardUrl, type PostcardDetails } from '@/lib/experience/postcard'
import './postcard.css'

export type CruisePostcardProps = PostcardDetails & { capture: () => Promise<Blob>; onShared?: () => void }
export default function CruisePostcard({ capture, carLabel, location, station, verifiedTrack, url, attribution, onShared }: CruisePostcardProps) {
  const [busy, setBusy] = useState(false), [preview, setPreview] = useState<{ blob: Blob; url: string; details: PostcardDetails } | null>(null), [note, setNote] = useState('')
  const dialog = useRef<HTMLDialogElement>(null), trigger = useRef<HTMLButtonElement>(null), mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url) }, [preview])
  useEffect(() => {
    if (!preview) return
    const target = dialog.current
    try { target?.showModal() } catch { target?.setAttribute('open', '') }
    target?.querySelector<HTMLElement>('button')?.focus()
    return () => { target?.close(); trigger.current?.focus({ preventScroll: true }) }
  }, [preview])
  const make = async () => {
    if (busy) return
    setBusy(true); setNote('')
    // Freeze attribution and verified metadata at the listener's capture request.
    const details = normalizePostcardDetails({ carLabel, location, station, verifiedTrack, url, attribution })
    try {
      const blob = await createPostcardBlob(await capture(), details)
      if (mounted.current) setPreview({ blob, url: URL.createObjectURL(blob), details })
    } catch (error) { if (mounted.current) setNote(error instanceof Error ? error.message : 'Postcard capture is unavailable. You can still copy the link.') }
    finally { if (mounted.current) setBusy(false) }
  }
  const copied = async (value: string) => {
    const link = postcardUrl(value)
    if (!link) { setNote('A valid Cruise link is not available yet.'); return }
    try { await navigator.clipboard.writeText(link); setNote('Cruise link copied.'); onShared?.() }
    catch { setNote(`Copy this Cruise link: ${link}`) }
  }
  const share = async () => {
    if (!preview) return
    const file = new File([preview.blob], 'buena-onda-cruise.png', { type: 'image/png' })
    try {
      if (navigator.share && navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'Buena Onda Cruise', text: 'Take the long way to good music.', url: preview.details.url || undefined }); onShared?.(); setNote('Postcard shared.') }
      else await copied(preview.details.url)
    } catch (error) { if ((error as Error).name !== 'AbortError') { setNote('File sharing is unavailable here. Download the PNG or copy the link.'); } }
  }
  const download = () => {
    if (!preview) return
    const anchor = document.createElement('a'); anchor.href = preview.url; anchor.download = 'buena-onda-cruise.png'; anchor.click(); setNote('PNG download started.')
  }
  return <div className="cruise-postcard">
    <button ref={trigger} type="button" className="postcard-trigger" onClick={() => void make()} disabled={busy}>{busy ? 'Capturing…' : 'Capture postcard'}</button>
    {!preview && note && <div className="postcard-feedback" role="status"><p>{note}</p><button type="button" onClick={() => void copied(url)}>Copy Cruise link</button></div>}
    {preview && <dialog ref={dialog} className="postcard-dialog" aria-labelledby="postcard-title" onCancel={event => { event.preventDefault(); setPreview(null) }}>
      <header><div><span>BUENA ONDA / A MOMENT FROM YOUR DRIVE</span><h2 id="postcard-title">Wish you were here.</h2></div><button type="button" aria-label="Close postcard preview" onClick={() => setPreview(null)}>Close</button></header>
      <img src={preview.url} alt={`Actual Cruise scene at ${preview.details.location}, with ${preview.details.carLabel} and ${preview.details.station} attribution.`}/>
      <p className="postcard-caption">An image of your actual drive. No recorded radio audio. Your file stays in this browser until you choose to share it.</p>
      <div className="postcard-actions"><button type="button" onClick={download}>Download PNG</button><button type="button" onClick={() => void share()}>Share postcard</button><button type="button" onClick={() => void copied(preview.details.url)}>Copy Cruise link</button></div>
      {note && <p role="status" className="postcard-caption">{note}</p>}
    </dialog>}
  </div>
}
