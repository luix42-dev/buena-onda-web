import type { SupabaseClient } from '@supabase/supabase-js'

type UploadResult = {
  publicUrl: string
  storagePath: string
}

function sanitizeBaseName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'culture'
}

function bytesToBlobPart(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function extractImageUrlFromHtml(html: string) {
  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["'][^>]*>/i,
    /"display_url"\s*:\s*"([^"]+)"/i,
    /"thumbnail_src"\s*:\s*"([^"]+)"/i,
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return decodeHtml(match[1].replace(/\\u0026/g, '&'))
  }

  return null
}

async function extractImageUrlWithOllama(html: string, pageUrl: string) {
  const host = process.env.OLLAMA_HOST?.replace(/\/$/, '') || 'http://127.0.0.1:11434'
  const model = process.env.OLLAMA_MODEL || process.env.HERMES_MODEL || 'hermes3'
  const prompt = [
    'Extract the primary Instagram image URL from this HTML.',
    'Return only JSON shaped as {"imageUrl":"https://..."} or {"imageUrl":null}.',
    `Page URL: ${pageUrl}`,
    html.slice(0, 12000),
  ].join('\n\n')

  try {
    const res = await fetch(`${host}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false }),
      signal: AbortSignal.timeout(3500),
    })
    if (!res.ok) return null

    const payload = await res.json() as { response?: string }
    const match = payload.response?.match(/\{[\s\S]*\}/)
    if (!match) return null

    const parsed = JSON.parse(match[0]) as { imageUrl?: unknown }
    return typeof parsed.imageUrl === 'string' && parsed.imageUrl.startsWith('http')
      ? parsed.imageUrl
      : null
  } catch {
    return null
  }
}

async function resolveInstagramImageUrl(instagramUrl: string) {
  const direct = await fetch(instagramUrl, {
    headers: {
      accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'user-agent': 'Mozilla/5.0 BuenaOndaBot/1.0',
    },
    redirect: 'follow',
  })

  const directType = direct.headers.get('content-type') ?? ''
  if (direct.ok && directType.startsWith('image/')) {
    return { imageUrl: instagramUrl, directBuffer: new Uint8Array(await direct.arrayBuffer()), contentType: directType }
  }

  const html = await direct.text()
  const extracted = extractImageUrlFromHtml(html) ?? await extractImageUrlWithOllama(html, instagramUrl)
  if (!extracted) {
    throw new Error('Could not find an image on the Instagram URL')
  }

  return { imageUrl: extracted, directBuffer: null, contentType: null }
}

export async function attachInstagramImage(
  supabase: SupabaseClient,
  instagramUrl: string,
  title: string
): Promise<UploadResult> {
  const { imageUrl, directBuffer, contentType } = await resolveInstagramImageUrl(instagramUrl)
  let imageBuffer = directBuffer
  let imageContentType = contentType ?? 'image/jpeg'
  if (!imageBuffer) {
    const response = await fetch(imageUrl, {
      headers: {
        accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'user-agent': 'Mozilla/5.0 BuenaOndaBot/1.0',
      },
      redirect: 'follow',
    })
    imageContentType = response.headers.get('content-type') ?? imageContentType
    imageBuffer = new Uint8Array(await response.arrayBuffer())
  }

  const ext = imageContentType.includes('png') ? 'png' : imageContentType.includes('webp') ? 'webp' : 'jpg'
  const storagePath = `culture/${Date.now()}-${sanitizeBaseName(title)}.${ext}`
  const { error } = await supabase.storage
    .from('catalog')
    .upload(storagePath, new Blob([bytesToBlobPart(imageBuffer)], { type: imageContentType }), {
      contentType: imageContentType,
      upsert: false,
    })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from('catalog').getPublicUrl(storagePath)
  return { publicUrl: data.publicUrl, storagePath }
}

export async function notifyCulturePostLive(title: string, slug: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return

  const text = [
    'New Culture post live',
    title,
    `buenaondalifestyle.com/culture/${slug}`,
  ].join('\n')

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: false,
      }),
    })
  } catch (err) {
    console.warn('[culture] Telegram notification failed', err)
  }
}
