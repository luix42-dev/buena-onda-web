import type { Track } from '@/lib/radio'

const TRACK_ORDER_KEY = 'track-order'
const TITLE_PREFIX = 'title:'

export const RADIO_META_KV_MISSING_MESSAGE =
  'Cloudflare KV metadata is not configured. Set BUENA_ONDA_RADIO_META_NAMESPACE_ID.'

type KvConfig = {
  accountId: string
  apiToken: string
  namespaceId: string
}

function trackTimestamp(track: Track) {
  return track.lastModified ? Date.parse(track.lastModified) || 0 : 0
}

function getKvConfig(): KvConfig | null {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || ''
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim() || ''
  const namespaceId = process.env.BUENA_ONDA_RADIO_META_NAMESPACE_ID?.trim() || ''

  if (!accountId || !apiToken || !namespaceId) {
    return null
  }

  return { accountId, apiToken, namespaceId }
}

function getKvValueUrl(config: KvConfig, key: string) {
  const encodedKey = encodeURIComponent(key)
  return `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/storage/kv/namespaces/${config.namespaceId}/values/${encodedKey}`
}

async function readKvValue(key: string): Promise<string | null> {
  const config = getKvConfig()
  if (!config) return null

  const response = await fetch(getKvValueUrl(config, key), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
    },
    cache: 'no-store',
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(body || `Cloudflare KV read failed for ${key}.`)
  }

  return response.text()
}

async function writeKvValue(key: string, value: string) {
  const config = getKvConfig()
  if (!config) {
    throw new Error(RADIO_META_KV_MISSING_MESSAGE)
  }

  const response = await fetch(getKvValueUrl(config, key), {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      'Content-Type': 'text/plain;charset=UTF-8',
    },
    body: value,
    cache: 'no-store',
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(body || `Cloudflare KV write failed for ${key}.`)
  }
}

async function readTrackOrder() {
  const raw = await readKvValue(TRACK_ORDER_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null
    return parsed.filter((value): value is string => typeof value === 'string')
  } catch {
    return null
  }
}

function getTitleKey(key: string) {
  return `${TITLE_PREFIX}${key}`
}

export async function mergeTrackMetadata(rawTracks: Track[]): Promise<Track[]> {
  if (rawTracks.length === 0) return rawTracks

  if (!getKvConfig()) {
    return rawTracks.map((track, index) => ({ ...track, position: index }))
  }

  const storedOrder = await readTrackOrder()
  const rawByKey = new Map(
    rawTracks
      .filter((track): track is Track & { key: string } => typeof track.key === 'string' && track.key.length > 0)
      .map(track => [track.key, track])
  )

  const orderedKeys = (storedOrder ?? []).filter(key => rawByKey.has(key))
  const remainingKeys = rawTracks
    .map(track => track.key)
    .filter((key): key is string => typeof key === 'string' && key.length > 0 && !orderedKeys.includes(key))

  const finalKeys = [...orderedKeys, ...remainingKeys]
  const titleEntries = await Promise.all(
    finalKeys.map(async key => [key, await readKvValue(getTitleKey(key))] as const)
  )
  const titleByKey = new Map(titleEntries)
  const mergedTracks: Track[] = []

  finalKeys.forEach((key, index) => {
    const track = rawByKey.get(key)
    if (!track) return

    const overrideTitle = titleByKey.get(key)?.trim()
    mergedTracks.push({
      ...track,
      title: overrideTitle || track.title,
      position: index,
    })
  })

  return mergedTracks.sort((a, b) => {
    const positionDelta = (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER)
    if (positionDelta !== 0) return positionDelta
    return trackTimestamp(b) - trackTimestamp(a)
  })
}

export async function renameTrackTitle(key: string, title: string) {
  await writeKvValue(getTitleKey(key), title)
}

export async function reorderTracks(orderedKeys: string[]) {
  await writeKvValue(TRACK_ORDER_KEY, JSON.stringify(orderedKeys))
}
