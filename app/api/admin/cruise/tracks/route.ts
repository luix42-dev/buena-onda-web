export const dynamic = 'force-dynamic'

import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { NextResponse, type NextRequest } from 'next/server'
import { getR2Config } from '@/lib/radio'
import { isStudioAuthorized, unauthorizedStudioResponse } from '@/lib/studio-auth'

export async function DELETE(request: NextRequest) {
  if (!(await isStudioAuthorized(request))) {
    return unauthorizedStudioResponse()
  }

  const { key } = await request.json()
  if (typeof key !== 'string') {
    return NextResponse.json({ error: 'key required' }, { status: 400 })
  }

  const trackKey = key.trim()

  if (
    !trackKey.startsWith('cruise/audio/') ||
    trackKey === 'cruise/audio/' ||
    trackKey.includes('..') ||
    trackKey.includes('\\') ||
    trackKey.startsWith('/')
  ) {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 })
  }

  const { client, bucketName } = getR2Config()

  try {
    await client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: trackKey }))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete track from R2.'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
