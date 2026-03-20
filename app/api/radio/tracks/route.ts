import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { NextResponse } from 'next/server'
import type { Track } from '@/lib/radio'

const s3 = new S3Client({
  region:   'auto',
  endpoint: `https://${process.env.CF_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.CF_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CF_R2_SECRET_ACCESS_KEY!,
  },
})

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
  try {
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: process.env.CF_R2_BUCKET_NAME!,
      Prefix: 'audio/',
    }))

    const base = process.env.CF_R2_PUBLIC_URL!

    const tracks: Track[] = (res.Contents ?? [])
      .filter(o => {
        if (!o.Key?.toLowerCase().endsWith('.mp3')) return false
        const filename = o.Key.split('/').pop() ?? ''
        return !filename.startsWith('.') // exclude macOS resource forks (._filename)
      })
      .sort((a, b) => (b.LastModified?.getTime() ?? 0) - (a.LastModified?.getTime() ?? 0))
      .map(o => ({
        ...parseKey(o.Key!),
        src: `${base}/${o.Key}`,
      }))

    return NextResponse.json(tracks, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    })
  } catch (err) {
    console.error('R2 list error:', err)
    return NextResponse.json({ error: 'Failed to load tracks' }, { status: 500 })
  }
}
