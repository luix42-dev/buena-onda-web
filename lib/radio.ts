import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'

export interface Track {
  title:  string
  artist: string
  src:    string
  cover?: string
  key?:   string
  fileName?: string
  status?: 'ready' | 'missing-metadata'
  lastModified?: string | null
  size?: number | null
}

const MAX_TRACKS = 50

type R2ClientResult = {
  client: S3Client | null
  error: string | null
}

function getR2Client(): R2ClientResult {
  const accountId = process.env.CF_R2_ACCOUNT_ID
  const accessKeyId = process.env.CF_R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.CF_R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return { client: null, error: 'Missing R2 environment variables' }
  }

  return {
    error: null,
    client: new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    }),
  }
}

function humanize(s: string) {
  return s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function parseKey(key: string): Pick<Track, 'title' | 'artist'> {
  const name = key.replace(/^audio\//, '').replace(/\.mp3$/i, '')
  const parts = name.split('_')

  if (parts.length >= 3) {
    return { artist: humanize(parts[1]), title: humanize(parts.slice(2).join(' ')) }
  }

  if (parts.length === 2) {
    return { artist: humanize(parts[0]), title: humanize(parts[1]) }
  }

  return { artist: '', title: humanize(name) }
}

export async function listRadioTracks(): Promise<Track[]> {
  const { client, error } = getR2Client()

  if (error || !client) {
    throw new Error(error ?? 'Missing R2 environment variables')
  }

  const bucketName = process.env.CF_R2_BUCKET_NAME
  const publicUrl = process.env.CF_R2_PUBLIC_URL

  if (!bucketName || !publicUrl) {
    throw new Error('Missing R2 bucket or public URL configuration')
  }

  const res = await client.send(new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: 'audio/',
  }))

  return (res.Contents ?? [])
    .filter(o => {
      if (!o.Key?.toLowerCase().endsWith('.mp3')) return false
      const filename = o.Key.split('/').pop() ?? ''
      return !filename.startsWith('.')
    })
    .sort((a, b) => (b.LastModified?.getTime() ?? 0) - (a.LastModified?.getTime() ?? 0))
    .slice(0, MAX_TRACKS)
    .map(o => ({
      ...parseKey(o.Key!),
      key: o.Key!,
      fileName: o.Key!.split('/').pop() ?? o.Key!,
      src: `${publicUrl}/${o.Key}`,
      status: 'ready' as const,
      lastModified: o.LastModified?.toISOString() ?? null,
      size: typeof o.Size === 'number' ? o.Size : null,
    }))
}
