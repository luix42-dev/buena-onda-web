'use client'

import { FormEvent, useState } from 'react'
import SegmentedControl from '@/components/studio/SegmentedControl'

type Destination = 'catalog' | 'transmission' | 'radio'

const DESTINATION_OPTIONS: { value: Destination; label: string }[] = [
  { value: 'catalog', label: 'Catalog' },
  { value: 'transmission', label: 'Transmission' },
  { value: 'radio', label: 'Radio' },
]

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export default function IntakeClient() {
  const [destination, setDestination] = useState<Destination>('catalog')
  const [note, setNote] = useState('')
  const [link, setLink] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<unknown>(null)
  const [error, setError] = useState('')

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const imageBase64 = image ? await fileToBase64(image) : undefined
      const response = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          destination,
          note: note.trim() || undefined,
          image: imageBase64,
          url: link.trim() || undefined,
        }),
      })
      const data = await response.json()
      setResult(data)
      if (!response.ok || data?.ok === false) {
        setError(data?.error || 'Intake failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Intake failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section style={{ maxWidth: 920, padding: 24 }}>
      <div className="sec-head">
        <div className="ttl">Intake</div>
      </div>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 16 }}>
        <div className="field">
          <label>Destination</label>
          <SegmentedControl
            variant="status"
            options={DESTINATION_OPTIONS}
            value={destination}
            onChange={setDestination}
          />
        </div>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Note</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="What is this? Any context."
            rows={10}
            style={{ width: '100%', padding: 12, font: 'inherit' }}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Image</span>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setImage(event.target.files?.[0] ?? null)}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Link</span>
          <input
            type="text"
            value={link}
            onChange={(event) => setLink(event.target.value)}
            placeholder="URL if you have one"
            style={{ width: '100%', padding: 12, font: 'inherit' }}
          />
        </label>

        <button type="submit" disabled={loading} style={{ width: 160, padding: '10px 14px' }}>
          {loading ? 'Submitting...' : 'Submit'}
        </button>
      </form>

      {error ? (
        <div style={{ marginTop: 24, color: '#9b1c1c', whiteSpace: 'pre-wrap' }}>
          {error}
        </div>
      ) : null}

      {result ? (
        <pre style={{ marginTop: 24, padding: 16, overflow: 'auto', background: '#f4f1eb' }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </section>
  )
}
