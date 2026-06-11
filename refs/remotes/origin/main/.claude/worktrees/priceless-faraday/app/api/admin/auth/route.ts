import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { password } = await request.json()
  const expected     = process.env.ADMIN_PASSWORD

  if (!expected) {
    // No password configured → always allow (dev/local)
    const res = NextResponse.json({ ok: true })
    res.cookies.set('bo_admin', '', { httpOnly: true, path: '/', sameSite: 'lax' })
    return res
  }

  if (password !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('bo_admin', expected, {
    httpOnly: true,
    path:     '/',
    sameSite: 'lax',
    maxAge:   60 * 60 * 24 * 7, // 1 week
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('bo_admin')
  return res
}
