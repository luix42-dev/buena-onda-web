import { NextResponse } from 'next/server'
import { clientIp, createRateLimiter } from '../cruise/rate-limit'

export class RequestBodyError extends Error {
  constructor(message: string, public readonly status: number) { super(message) }
}

/** Binary variant for bounded multipart uploads; never trusts Content-Length alone. */
export async function readLimitedBytes(request: Request, maxBytes: number): Promise<Uint8Array> {
  if (Number(request.headers.get('content-length') || 0) > maxBytes) throw new RequestBodyError('Request too large', 413)
  const reader = request.body?.getReader()
  if (!reader) return new Uint8Array()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxBytes) {
        await reader.cancel().catch(() => undefined)
        throw new RequestBodyError('Request too large', 413)
      }
      chunks.push(value)
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
    return bytes
  } finally { reader.releaseLock() }
}

/** Enforce the actual streamed byte count, including chunked bodies with no Content-Length. */
export async function readLimitedText(request: Request, maxBytes = 16_384): Promise<string> {
  const declared = Number(request.headers.get('content-length') || 0)
  if (declared > maxBytes) throw new RequestBodyError('Request too large', 413)
  const reader = request.body?.getReader()
  if (!reader) return ''
  const decoder = new TextDecoder('utf-8', { fatal: true })
  let text = '', size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxBytes) {
        await reader.cancel().catch(() => undefined)
        throw new RequestBodyError('Request too large', 413)
      }
      text += decoder.decode(value, { stream: true })
    }
    return text + decoder.decode()
  } catch (error) {
    if (error instanceof RequestBodyError) throw error
    throw new RequestBodyError('Invalid request body', 400)
  } finally { reader.releaseLock() }
}

export async function readLimitedJson(request: Request, maxBytes = 16_384): Promise<unknown> {
  const text = await readLimitedText(request, maxBytes)
  try { return JSON.parse(text) } catch { throw new RequestBodyError('Invalid JSON body', 400) }
}

export function requestErrorResponse(error: unknown) {
  return NextResponse.json({ error: error instanceof RequestBodyError ? error.message : 'Invalid request body' }, {
    status: error instanceof RequestBodyError ? error.status : 400,
  })
}

/** Per-instance abuse brake; production WAF limits must cover distributed traffic. */
export function publicWriteGuard(capacity = 5, refillPerMinute = 5) {
  const limiter = createRateLimiter({ capacity, refillPerMinute })
  return (request: Request) => {
    if (request.headers.get('sec-fetch-site') === 'cross-site') {
      return NextResponse.json({ error: 'Cross-origin request refused' }, { status: 403 })
    }
    if (!limiter.take(clientIp(request.headers))) {
      return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429, headers: { 'Retry-After': '60' } })
    }
    return null
  }
}
