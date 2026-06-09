import { ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export interface Track {
  title:  string
  artist: string
  src:    string
  cover?: string
  key?:   string
  fileName?: string
  position?: number | null
  status?: 'ready' | 'missing-metadata'
  lastModified?: string | null
  size?: number | null
}

type R2Config = {
  client: S3Client
  bucketName: string
  publicUrl: string
}

function env(name: string, fallback?: string) {
  return process.env[name] ?? (fallback ? process.env[fallback] : undefined)
}

export function getR2Config(): R2Config {
  const accountId = env('R2_ACCOUNT_ID', 'CF_R2_ACCOUNT_ID')
  const accessKeyId = env('R2_ACCESS_KEY_ID', 'CF_R2_ACCESS_KEY_ID')
  const secretAccessKey = env('R2_SECRET_ACCESS_KEY', 'CF_R2_SECRET_ACCESS_KEY')
  const bucketName = env('R2_BUCKET_NAME', 'CF_R2_BUCKET_NAME')
  const endpoint = env('R2_ENDPOINT') ?? (accountId ? 'https://' + accountId + '.r2.cloudflarestorage.com' : undefined)
  const publicUrl = env('R2_PUBLIC_URL', 'CF_R2_PUBLIC_URL')

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !endpoint || !publicUrl) {
    throw new Error('Missing R2 environment variables')
  }

  return {
    bucketName,
    publicUrl,
    client: new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    }),
  }
}

function humanize(s: string) {
  return s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function parseKey(key: string): Pick<Track, 'title' | 'artist'> {
  const name = key.replace(/^audio\//, '').replace(/\.mp3$/i, '').replace(/^\d{13}-/, '')
  const parts = name.split('_')

  if (parts.length >= 3) {
    return { artist: humanize(parts[1]), title: humanize(parts.slice(2).join(' ')) }
  }

  if (parts.length === 2) {
    return { artist: humanize(parts[0]), title: humanize(parts[1]) }
  }

  return { artist: '', title: humanize(name) }
}

function decodeXml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
}

function tag(xml: string, name: string) {
  return xml.match(new RegExp('<' + name + '>([\\s\\S]*?)</' + name + '>'))?.[1]
}

function parseListObjects(xml: string) {
  const contents = [...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)].map(match => {
    const item = match[1]
    return {
      key: decodeXml(tag(item, 'Key') ?? ''),
      lastModified: tag(item, 'LastModified') ?? null,
      size: Number(tag(item, 'Size') ?? 0),
    }
  }).filter(item => item.key)

  return {
    contents,
    isTruncated: tag(xml, 'IsTruncated') === 'true',
    nextContinuationToken: tag(xml, 'NextContinuationToken') ? decodeXml(tag(xml, 'NextContinuationToken')!) : null,
  }
}

async function listPage(config: R2Config, continuationToken?: string) {
  const command = new ListObjectsV2Command({
    Bucket: config.bucketName,
    Prefix: 'audio/',
    ContinuationToken: continuationToken,
  })
  const url = await getSignedUrl(config.client as any, command as any, {
    expiresIn: 60,
    signableHeaders: new Set(['host']),
  } as any)
  const response = await fetch(url)
  const text = await response.text()
  if (!response.ok) throw new Error(text || 'R2 list failed with ' + response.status)
  return parseListObjects(text)
}

export async function listRadioTracks(): Promise<Track[]> {
  const config = getR2Config()
  const objects: Array<{ key: string; lastModified: string | null; size: number }> = []
  let continuationToken: string | undefined

  do {
    const page = await listPage(config, continuationToken)
    objects.push(...page.contents)
    continuationToken = page.nextContinuationToken ?? undefined
    if (!page.isTruncated) break
  } while (continuationToken)

  return objects
    .sort((a, b) => (new Date(b.lastModified ?? 0).getTime()) - (new Date(a.lastModified ?? 0).getTime()))
    .map(o => ({
      ...parseKey(o.key),
      key: o.key,
      fileName: o.key.split('/').pop() ?? o.key,
      src: config.publicUrl.replace(/\/$/, '') + '/' + o.key,
      status: 'ready' as const,
      lastModified: o.lastModified,
      size: Number.isFinite(o.size) ? o.size : null,
    }))
}
