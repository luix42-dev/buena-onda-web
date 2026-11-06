import { readLimitedBytes, RequestBodyError } from '@/lib/api/request-security'

const MAX_FILE_BYTES = 32 * 1024 * 1024
const MIME_BY_EXTENSION: Record<string, string[]> = {
  jpg: ['image/jpeg'], jpeg: ['image/jpeg'], png: ['image/png'], gif: ['image/gif'],
  webp: ['image/webp'], avif: ['image/avif'],
  mp3: ['audio/mpeg', 'audio/mp3'], wav: ['audio/wav', 'audio/x-wav'],
  ogg: ['audio/ogg'], flac: ['audio/flac', 'audio/x-flac'],
  m4a: ['audio/mp4', 'audio/x-m4a'], mp4: ['video/mp4'], pdf: ['application/pdf'],
}

export function mediaContentType(filename: string, suppliedType: string, kind: 'image' | 'audio' | 'video' | 'archive') {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const allowed = MIME_BY_EXTENSION[ext]
  if (!allowed || !allowed.includes(suppliedType.toLowerCase())) return null
  const canonical = allowed[0]
  if (kind === 'archive') return canonical.startsWith('image/') || canonical === 'application/pdf' ? canonical : null
  return canonical.startsWith(`${kind}/`) ? canonical : null
}

export function safeStoragePath(path: string) {
  return path.length <= 512 && /^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(path)
    && path.split('/').every(segment => segment !== '.' && segment !== '..' && segment.length > 0)
}

export async function readUploadForm(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data;')) throw new RequestBodyError('Expected multipart upload', 400)
  const bytes = await readLimitedBytes(request, MAX_FILE_BYTES + 64 * 1024)
  try {
    return await new Response(bytes.buffer as ArrayBuffer, { headers: { 'content-type': request.headers.get('content-type')! } }).formData()
  } catch { throw new RequestBodyError('Invalid upload', 400) }
}

export async function validateFile(file: FormDataEntryValue | null, kind: 'image' | 'audio' | 'archive') {
  if (!file || typeof file === 'string' || file.size === 0) throw new RequestBodyError('No file provided', 400)
  if (file.size > MAX_FILE_BYTES) throw new RequestBodyError('File too large', 413)
  const contentType = mediaContentType(file.name, file.type, kind)
  if (!contentType) throw new RequestBodyError('Unsupported file type', 400)
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  const ascii = String.fromCharCode(...bytes)
  // Reject HTML/SVG disguised as media before serving it from a public bucket.
  const signatureMatches = contentType === 'image/jpeg' ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    : contentType === 'image/png' ? bytes[0] === 0x89 && ascii.slice(1, 8) === 'PNG\r\n\x1a\n'
    : contentType === 'image/gif' ? /^GIF8[79]a/.test(ascii)
    : contentType === 'image/webp' ? ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP'
    : contentType === 'image/avif' ? ascii.slice(4, 8) === 'ftyp' && /avif|avis/.test(ascii.slice(8))
    : contentType === 'application/pdf' ? ascii.startsWith('%PDF-')
    : contentType === 'audio/mpeg' ? ascii.startsWith('ID3') || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)
    : contentType === 'audio/wav' ? ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WAVE'
    : contentType === 'audio/ogg' ? ascii.startsWith('OggS')
    : contentType === 'audio/flac' ? ascii.startsWith('fLaC')
    : contentType === 'audio/mp4' ? ascii.slice(4, 8) === 'ftyp' : false
  if (!signatureMatches) throw new RequestBodyError('File content does not match its type', 400)
  return { file, contentType }
}
