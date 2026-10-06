import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'

/** Original procedural artwork. No reference photographs are shipped as textures. */
export function jeepTextures() {
  let seed = 81288
  const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296 }
  function canvas(width: number, height: number) {
    const surface = document.createElement('canvas'); surface.width = width; surface.height = height
    return { surface, context: surface.getContext('2d')! }
  }
  function texture(surface: HTMLCanvasElement, color = true) {
    const map = new CanvasTexture(surface)
    if (color) map.colorSpace = SRGBColorSpace
    map.anisotropy = 4
    return map
  }
  const grain = canvas(256, 256)
  const pixels = grain.context.createImageData(256, 256)
  for (let p = 0; p < pixels.data.length; p += 4) {
    const value = 105 + Math.floor(random() * 60)
    pixels.data[p] = value; pixels.data[p + 1] = value; pixels.data[p + 2] = value; pixels.data[p + 3] = 255
  }
  grain.context.putImageData(pixels, 0, 0)
  // Low-frequency pores survive the seated-camera scale without glittering.
  for (let i = 0; i < 2000; i++) {
    const x = random()*256, y = random()*256, radius = .35+random()*.9
    grain.context.fillStyle = 'rgba(35,35,35,.24)'; grain.context.beginPath(); grain.context.ellipse(x,y,radius*1.5,radius,random()*Math.PI,0,Math.PI*2); grain.context.fill()
  }
  const rubber = texture(grain.surface, false); rubber.wrapS = rubber.wrapT = RepeatWrapping; rubber.repeat.set(3, 3)
  const cloth = canvas(256, 256)
  cloth.context.fillStyle = '#9daba3'; cloth.context.fillRect(0, 0, 256, 256)
  for (let x = 0; x < 256; x += 3) { cloth.context.fillStyle = x % 2 ? '#acb7b0' : '#8b9b94'; cloth.context.fillRect(x, 0, 1, 256) }
  for (let y = 0; y < 256; y += 3) { cloth.context.fillStyle = 'rgba(38,59,50,.17)'; cloth.context.fillRect(0, y, 256, 1) }
  const fabric = texture(cloth.surface); fabric.wrapS = fabric.wrapT = RepeatWrapping; fabric.repeat.set(3, 3)
  function dial(label: string, values: string[], main = false) {
    const { surface, context: c } = canvas(256, 256)
    c.fillStyle = '#141b1b'; c.fillRect(0, 0, 256, 256)
    const fade = c.createRadialGradient(115, 95, 6, 128, 128, 127)
    fade.addColorStop(0, '#293431'); fade.addColorStop(1, '#0c1111'); c.fillStyle = fade; c.fillRect(0, 0, 256, 256)
    c.strokeStyle = '#64736a'; c.lineWidth = 2; c.beginPath(); c.arc(128, 128, 118, 0, Math.PI * 2); c.stroke()
    for (let i = 0; i <= 40; i++) {
      const angle = Math.PI * .75 + i / 40 * Math.PI * 1.5
      const major = i % (40 / (values.length - 1)) === 0
      c.strokeStyle = i > 35 && !main ? '#d67b5b' : '#e7e2c8'; c.lineWidth = major ? 3 : 1.5
      c.beginPath(); c.moveTo(128 + Math.cos(angle) * (major ? 91 : 99), 128 + Math.sin(angle) * (major ? 91 : 99)); c.lineTo(128 + Math.cos(angle) * 111, 128 + Math.sin(angle) * 111); c.stroke()
    }
    c.font = `${main ? 20 : 23}px Arial`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#e7e2c8'
    values.forEach((value, i) => { const a = Math.PI * .75 + i / (values.length - 1) * Math.PI * 1.5; c.fillText(value, 128 + Math.cos(a) * 74, 128 + Math.sin(a) * 74) })
    c.font = `bold ${main ? 14 : 21}px Arial`; c.fillText(label, 128, main ? 172 : 163)
    if (main) { c.fillStyle = '#070d0b'; c.fillRect(91, 190, 74, 19); c.fillStyle = '#c4c9af'; c.font = '14px monospace'; c.fillText('086429', 128, 200); c.font = '10px Arial'; c.fillText('ISLAND INSTRUMENTS', 128, 48) }
    return texture(surface)
  }
  const speed = dial('MPH', ['0', '20', '40', '60', '80', '100'], true)
  const rpm = dial('RPM ×1000', ['0', '1', '2', '3', '4', '5'], true)
  const fuel = dial('FUEL', ['E', '½', 'F'])
  const temp = dial('TEMP', ['C', '180', 'H'])
  const oil = dial('OIL', ['0', '40', '80'])
  const volts = dial('VOLTS', ['8', '13', '18'])
  const markings = canvas(1024, 256); const c = markings.context
  c.fillStyle = '#dddccb'; c.textAlign = 'left'; c.font = '28px Arial'
  c.fillText('FAN', 24, 42); c.fillText('OFF    1    2    3', 220, 42)
  c.fillText('TEMP', 24, 125); c.fillStyle = '#64938f'; c.fillRect(230, 110, 260, 6); c.fillStyle = '#cf8364'; c.fillRect(490, 110, 240, 6)
  c.fillStyle = '#dddccb'; c.fillText('AIR', 24, 213); c.fillText('VENT     HEAT     DEF', 240, 213)
  const controls = texture(markings.surface)
  const badgeCanvas = canvas(1024, 256); const b = badgeCanvas.context
  b.fillStyle = '#234958'; b.font = 'italic bold 84px Arial'; b.textAlign = 'center'; b.fillText('ISLAND TRAIL', 512, 103)
  b.font = '23px Arial'; b.fillText('4 × 4   /   OPEN AIR MOTOR CO.', 512, 154)
  b.fillStyle = '#227c80'; b.fillRect(25, 178, 974, 15); b.fillStyle = '#d69a57'; b.fillRect(25, 205, 974, 8)
  const badge = texture(badgeCanvas.surface)
  const shiftCanvas = canvas(128, 128); const s = shiftCanvas.context
  s.fillStyle = '#d9dacc'; s.font = '25px Arial'; s.textAlign = 'center'
  s.fillText('1  3  5', 64, 36); s.fillText('2  4  R', 64, 107); s.strokeStyle = '#d9dacc'; s.lineWidth = 3
  for (const x of [27, 64, 100]) { s.beginPath(); s.moveTo(x, 45); s.lineTo(x, 78); s.stroke() }
  s.beginPath(); s.moveTo(27, 61); s.lineTo(100, 61); s.stroke()
  const shift = texture(shiftCanvas.surface)
  return { rubber, fabric, speed, rpm, fuel, temp, oil, volts, controls, badge, shift }
}
