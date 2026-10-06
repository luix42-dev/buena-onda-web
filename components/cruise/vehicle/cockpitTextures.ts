import { CanvasTexture, DataTexture, LinearFilter, RGBAFormat, SRGBColorSpace } from 'three'

export function cockpitTextures() {
  const panel = document.createElement('canvas')
  panel.width = 256
  panel.height = 128
  const context = panel.getContext('2d')!
  context.fillStyle = '#101718'
  context.fillRect(0, 0, 256, 128)
  for (const center of [66, 190]) {
    context.strokeStyle = '#80918d'
    context.lineWidth = 2
    context.beginPath(); context.arc(center, 64, 50, 0, Math.PI * 2); context.stroke()
    for (let tick = 0; tick <= 10; tick++) {
      const angle = Math.PI * 0.75 + tick * Math.PI * 0.15
      context.strokeStyle = tick > 8 ? '#df806c' : '#e2e0c9'
      context.beginPath()
      context.moveTo(center + Math.cos(angle) * 40, 64 + Math.sin(angle) * 40)
      context.lineTo(center + Math.cos(angle) * 46, 64 + Math.sin(angle) * 46)
      context.stroke()
    }
    context.fillStyle = '#d1d5c3'
    context.font = '10px monospace'
    context.textAlign = 'center'
    context.fillText(center === 66 ? 'KM/H' : 'RPM', center, 87)
    context.strokeStyle = '#eb805b'
    context.lineWidth = 3
    context.beginPath(); context.moveTo(center, 64); context.lineTo(center - 29, 41); context.stroke()
  }
  const gauges = new CanvasTexture(panel)
  gauges.colorSpace = SRGBColorSpace
  const display = document.createElement('canvas')
  display.width = 128
  display.height = 48
  const screen = display.getContext('2d')!
  screen.fillStyle = '#142425'; screen.fillRect(0, 0, 128, 48)
  screen.fillStyle = '#b6caba'; screen.textAlign = 'center'; screen.font = '13px monospace'
  screen.fillText('BUENA ONDA', 64, 28)
  const radio = new CanvasTexture(display)
  radio.colorSpace = SRGBColorSpace
  const pixels = new Uint8Array(64 * 64 * 4)
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const radius = ((x - 31.5) / 31.5) ** 2 + ((y - 31.5) / 31.5) ** 2
    pixels[(y * 64 + x) * 4 + 3] = Math.round(Math.max(0, 1 - radius) ** 1.8 * 150)
  }
  const shadow = new DataTexture(pixels, 64, 64, RGBAFormat)
  shadow.magFilter = LinearFilter
  shadow.needsUpdate = true
  return { gauges, radio, shadow }
}
