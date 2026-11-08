import { NextResponse } from 'next/server'
import { publicWriteGuard, readLimitedJson, requestErrorResponse } from '@/lib/api/request-security'
import { parseCastDiagnostic } from '@/lib/cruise/cast-diagnostics'

export const dynamic = 'force-dynamic'
const guard = publicWriteGuard(20, 10)
export async function POST(request: Request) {
  const refused = guard(request)
  if (refused) return refused
  try {
    const value = parseCastDiagnostic(await readLimitedJson(request, 4096))
    if (!value) return NextResponse.json({ error: 'Invalid diagnostic' }, { status: 400 })
    console.info('[cruise-cast-connection]', JSON.stringify(value))
    return new NextResponse(null, { status: 204, headers: { 'cache-control': 'no-store' } })
  } catch (error) { return requestErrorResponse(error) }
}
