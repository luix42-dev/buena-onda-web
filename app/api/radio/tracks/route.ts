import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { NextResponse } from 'next/server'
import type { Track } from '@/lib/radio'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function getR2Client(): { client: S3Client | null; error: string | null } {
  const accountId = process.env.CF_R2_ACCOUNT_ID
  const accessKeyId = process.env.CF_R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.CF_R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return {
      error: 'Missing R2 environment variables',
      client: null,
    }
  }

  return {
    error: null,
    client: new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    }),
  }
}

function humanize(s: string) {
  return s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function parseKey(key: string): Pick<Track, 'title' | 'artist'> {
  const name  = key.replace(/^audio\//, '').replace(/\.mp3$/i, '')
  const parts = name.split('_')

  if (parts.length >= 3) {
    // YYYY-MM-DD_show-name_episode-title
    return { artist: humanize(parts[1]), title: humanize(parts.slice(2).join(' ')) }
  }
  if (parts.length === 2) {
    // show-name_episode-title
    return { artist: humanize(parts[0]), title: humanize(parts[1]) }
  }
  // Fallback: whole filename as title
  return { artist: '', title: humanize(name) }
}

export async function GET() {
  const { client, error: configError } = getR2Client()

  if (configError || !client) {
    return NextResponse.json(
      { error: configError ?? 'Missing R2 environment variables' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  try {
    const bucketName = process.env.CF_R2_BUCKET_NAME
    const publicUrl = process.env.CF_R2_PUBLIC_URL

    if (!bucketName || !publicUrl) {
      return NextResponse.json(
        { error: 'Missing R2 bucket or public URL configuration' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const res = await client.send(new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: 'audio/',
    }))

    const tracks: Track[] = (res.Contents ?? [])
      .filter(o => {
        if (!o.Key?.toLowerCase().endsWith('.mp3')) return false
        const filename = o.Key.split('/').pop() ?? ''
        return !filename.startsWith('.') // exclude macOS resource forks (._filename)
      })
      .sort((a, b) => (b.LastModified?.getTime() ?? 0) - (a.LastModified?.getTime() ?? 0))
      .map(o => ({
        ...parseKey(o.Key!),
        src: `${publicUrl}/${o.Key}`,
      }))

    return NextResponse.json(tracks, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    console.error('R2 list error:', err)
    return NextResponse.json(
      { error: 'Failed to load tracks' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
