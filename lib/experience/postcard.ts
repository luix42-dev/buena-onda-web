export type PostcardDetails = { carLabel: string; location: string; station: string; verifiedTrack: string | null; url: string; attribution?: string }
const text = (value: unknown, max: number): string => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : ''
export function postcardUrl(value: string): string {
  try {
    const url = new URL(value)
    if (url.username || url.password || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) return ''
    return url.href.length <= 2048 ? url.href : ''
  } catch { return '' }
}
export function postcardAttribution(carLabel: string): string {
  const name = carLabel.toLowerCase()
  const car = name.includes('wrangler') ? 'Wrangler: funassets, CC BY 4.0' : name.includes('countach') ? 'Countach: Randomness, CC BY 4.0' : name.includes('fiero') ? 'Fiero: loadversus, CC BY 4.0' : name.includes('eldorado') || name.includes('cadillac') ? 'Cadillac: DisneyCars, CC BY 4.0' : name.includes('delorean') ? 'DeLorean: fuunv.se, CC BY 4.0' : 'Vehicle credits in Cruise'
  return `${car}; adapted cabin/materials. Map: © OpenStreetMap contributors, ODbL. Textures: Poly Haven, CC0. Full credits in Cruise.`
}
export function normalizePostcardDetails(value: PostcardDetails): PostcardDetails {
  const carLabel = text(value.carLabel, 100)
  return { carLabel, location: text(value.location, 120), station: text(value.station, 100), verifiedTrack: text(value.verifiedTrack, 240) || null,
    url: postcardUrl(value.url), attribution: text(value.attribution, 700) || postcardAttribution(carLabel) }
}
export function postcardDimensions(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) throw new Error('The scene has no capturable image yet.')
  const scale = Math.min(1, 1920 / width, 1920 / height)
  const sceneWidth = Math.max(1, Math.round(width * scale)), sceneHeight = Math.max(1, Math.round(height * scale))
  // A wide export remains legible when shared; a narrow capture gains room for credits.
  const exportWidth = Math.max(720, sceneWidth)
  const exportSceneHeight = Math.round(sceneHeight * exportWidth / sceneWidth)
  return { width: exportWidth, sceneHeight: exportSceneHeight, footerHeight: 320, height: exportSceneHeight + 320 }
}
/** Browser-only composition of an actual captured frame. No audio, external fetch or upload. */
export async function createPostcardBlob(scene: Blob, input: PostcardDetails): Promise<Blob> {
  if (!scene.size || !scene.type.startsWith('image/')) throw new Error('The scene capture did not contain an image.')
  const details = normalizePostcardDetails(input), image = await createImageBitmap(scene)
  try {
    const size = postcardDimensions(image.width, image.height), canvas = document.createElement('canvas')
    canvas.width = size.width; canvas.height = size.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Image export is unavailable in this browser.')
    ctx.drawImage(image, 0, 0, size.width, size.sceneHeight)
    const pad = 36, top = size.sceneHeight
    ctx.fillStyle = '#15362d'; ctx.fillRect(0, top, size.width, size.footerHeight)
    ctx.fillStyle = '#f1bd8b'; ctx.fillRect(0, top, size.width, 3)
    ctx.fillStyle = '#fff5e4'; ctx.font = 'italic 31px Georgia,serif'; ctx.fillText('Buena Onda Cruise', pad, top + 49)
    ctx.font = 'bold 14px Arial,sans-serif'; ctx.fillStyle = '#f1bd8b'; ctx.fillText('NO ALGORITHMS. JUST FREQUENCIES.', pad, top + 77)
    const lines = (value: string, y: number, lineHeight: number, maxLines: number) => {
      const words = value.split(' '); let line = '', row = 0
      for (const word of words) {
        const next = line ? `${line} ${word}` : word
        if (ctx.measureText(next).width > size.width - pad * 2 && line) {
          ctx.fillText(line, pad, y + row * lineHeight); row++; line = word
          if (row >= maxLines - 1) break
        } else line = next
      }
      if (row < maxLines && line) ctx.fillText(line, pad, y + row * lineHeight, size.width - pad * 2)
    }
    ctx.font = '18px Arial,sans-serif'; ctx.fillStyle = '#fff5e4'
    lines(`${details.location || 'Miami'} · ${details.carLabel} · ${details.station}`, top + 111, 24, 2)
    ctx.font = '16px Arial,sans-serif'; ctx.fillStyle = '#f1d5b2'
    lines(details.verifiedTrack || 'Real radio. Human selectors.', top + 165, 22, 2)
    ctx.font = '12px Arial,sans-serif'; ctx.fillStyle = '#d3decb'
    lines(details.attribution || '', top + 218, 17, 3)
    ctx.font = '12px Arial,sans-serif'; ctx.fillStyle = '#f1bd8b'
    lines(details.url, top + 286, 16, 1)
    return await new Promise<Blob>((resolve, reject) => {
      try { canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('The browser could not encode this postcard.')), 'image/png') }
      catch { reject(new Error('The scene contains an image that cannot be exported. You can still copy the Cruise link.')) }
    })
  } finally { image.close() }
}
