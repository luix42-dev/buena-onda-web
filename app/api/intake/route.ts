import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export async function POST() {
  return NextResponse.json(
    { error: 'Intake requires Node.js, Sharp, local Ollama, and filesystem writes; it is disabled on Cloudflare Pages preview.' },
    { status: 501 },
  )
}
