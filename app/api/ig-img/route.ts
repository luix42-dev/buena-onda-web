import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getHeroMediaDir, isHeroImageFile } from '@/lib/hero-media'

export async function GET(req: NextRequest) {
  const f = req.nextUrl.searchParams.get('f')
  if (!f) {
    return new NextResponse('Missing f param', { status: 400 })
  }

  const filename = path.basename(f)
  if (!isHeroImageFile(filename)) {
    return new NextResponse('Unsupported file type', { status: 400 })
  }

  const mediaDir = path.resolve(getHeroMediaDir())
  const filePath = path.resolve(mediaDir, filename)

  if (!filePath.startsWith(`${mediaDir}${path.sep}`)) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  let buffer: Buffer
  try {
    buffer = fs.readFileSync(filePath)
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }

  const ext = path.extname(filename).toLowerCase()
  const contentType =
    ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
      : ext === '.png' ? 'image/png'
        : ext === '.webp' ? 'image/webp'
          : 'application/octet-stream'

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
