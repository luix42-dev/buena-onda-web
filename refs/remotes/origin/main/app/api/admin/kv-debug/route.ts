import { NextResponse, type NextRequest } from 'next/server'
import { isStudioAuthorized, unauthorizedStudioResponse } from '@/lib/studio-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  if (!isStudioAuthorized(request)) {
    return unauthorizedStudioResponse()
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || ''
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim() || ''
  const namespaceId = process.env.BUENA_ONDA_RADIO_META_NAMESPACE_ID?.trim() || ''

  const envCheck = {
    CLOUDFLARE_ACCOUNT_ID: !!accountId,
    CLOUDFLARE_API_TOKEN: !!token,
    BUENA_ONDA_RADIO_META_NAMESPACE_ID: !!namespaceId,
    accountIdLength: accountId.length,
    tokenLength: token.length,
    namespaceIdLength: namespaceId.length,
  }

  if (!accountId || !token || !namespaceId) {
    return NextResponse.json({ envCheck, kvTest: 'skipped - missing vars' })
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/keys?limit=1`

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    })
    const body = await response.text()

    return NextResponse.json({
      envCheck,
      kvTest: {
        status: response.status,
        ok: response.ok,
        body: body.slice(0, 500),
      },
    })
  } catch (error) {
    return NextResponse.json({
      envCheck,
      kvTest: {
        status: null,
        ok: false,
        body: error instanceof Error ? error.message : 'Unknown fetch error',
      },
    })
  }
}
