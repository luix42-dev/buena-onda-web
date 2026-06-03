import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET() {
  return NextResponse.json(
    { error: 'Instagram image proxy is unavailable on the Cloudflare Pages preview runtime.' },
    { status: 501 },
  )
}
