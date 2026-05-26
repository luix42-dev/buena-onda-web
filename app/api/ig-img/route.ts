import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const MEDIA_DIR = 'D:\\BuenaOnda_Audit\\01_instagram_raw\\MEDIA'

export async function GET(req: NextRequest) {
  const f = req.nextUrl.searchParams.get('f')
  if (!f) {
    return new NextResponse('Missing f param', { status: 400 })
  }

  // Sanitize: strip any path separators so callers can't escape the MEDIA dir
  const filename = path.basename(f)
  const filePath = path.join(MEDIA_DIR, filename)

  // Ensure resolved path is still inside MEDIA_DIR
  if (!filePath.startsWith(MEDIA_DIR)) {
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
    : ext === '.png'  ? 'image/png'
    : ext === '.webp' ? 'image/webp'
    : 'application/octet-stream'

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
