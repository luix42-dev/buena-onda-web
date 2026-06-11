import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const baseUrl = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3000'
const now = Date.now()
const image =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII='

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

const cases = [
  {
    destination: 'catalog',
    note: `Catalog destination test ${now}\n1970s test object for intake routing.`,
    url: `https://example.com/catalog-intake-${now}`,
    image,
    table: 'items',
    select: 'id,title,status,cover_image_url',
  },
  {
    destination: 'transmission',
    note: `Transmission destination test ${now}\nManual newsletter draft from intake.`,
    url: `https://example.com/transmission-intake-${now}`,
    image,
    table: 'transmission_issues',
    select: 'id,title,status',
  },
  {
    destination: 'radio',
    note: `Radio destination test ${now}\nManual radio draft from intake.`,
    url: `https://example.com/radio-intake-${now}`,
    table: 'episodes',
    select: 'id,title,published,audio_url',
  },
]

const results = []

for (const entry of cases) {
  const response = await fetch(`${baseUrl}/api/intake`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      destination: entry.destination,
      note: entry.note,
      url: entry.url,
      image: entry.image,
    }),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.ok) {
    throw new Error(`${entry.destination} intake failed: ${response.status} ${JSON.stringify(payload)}`)
  }

  const id = payload.record.id
  const { data, error } = await supabase
    .from(entry.table)
    .select(entry.select)
    .eq('id', id)
    .single()
  if (error) throw error

  results.push({
    destination: entry.destination,
    id,
    record: data,
    telegram: payload.telegram,
    image: payload.image ?? payload.imageUrl ?? null,
  })
}

console.log(JSON.stringify({ results }, null, 2))
