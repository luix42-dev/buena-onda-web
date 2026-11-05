import * as T from 'three'

function texture(canvas: HTMLCanvasElement) { const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 4; return map }

/** Original room illustration used behind recessed glass; no photographic facade tracing. */
export function roomWindowTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512
  const ctx = canvas.getContext('2d')!
  const wall = ctx.createLinearGradient(0, 0, 0, 512); wall.addColorStop(0, '#49534e'); wall.addColorStop(.5, '#adab94'); wall.addColorStop(1, '#524b3e')
  ctx.fillStyle = wall; ctx.fillRect(0, 0, 512, 512)
  ctx.fillStyle = '#353d3b'; ctx.beginPath(); ctx.moveTo(0, 512); ctx.lineTo(125, 332); ctx.lineTo(388, 332); ctx.lineTo(512, 512); ctx.fill()
  ctx.strokeStyle = '#555c52'; ctx.lineWidth = 3
  for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(256, 332); ctx.lineTo(i * 64, 512); ctx.stroke() }
  ctx.fillStyle = '#746647'; ctx.fillRect(145, 288, 233, 100); ctx.fillStyle = '#d0c4a3'; ctx.fillRect(137, 280, 249, 17)
  ctx.fillStyle = '#3d5651'; ctx.fillRect(183, 122, 114, 98); ctx.strokeStyle = '#d1b685'; ctx.lineWidth = 6; ctx.strokeRect(183, 122, 114, 98)
  // A shaded lamp, not a uniformly glowing pane.
  ctx.fillStyle = '#4c4a3d'; ctx.fillRect(341, 177, 8, 105); ctx.fillStyle = '#e2c998'; ctx.beginPath(); ctx.moveTo(310, 177); ctx.lineTo(376, 177); ctx.lineTo(366, 132); ctx.lineTo(321, 132); ctx.closePath(); ctx.fill()
  const light = ctx.createRadialGradient(344, 190, 5, 344, 190, 125); light.addColorStop(0, '#e8d5a760'); light.addColorStop(1, '#e8d5a700'); ctx.fillStyle = light; ctx.fillRect(220, 80, 260, 240)
  for (const side of [0, 1]) for (let i = 0; i < 6; i++) {
    const x = side ? 426 + i * 14 : i * 14
    const fold = ctx.createLinearGradient(x, 0, x + 14, 0); fold.addColorStop(0, '#464e45'); fold.addColorStop(.5, '#bbb79a'); fold.addColorStop(1, '#686f5c'); ctx.fillStyle = fold; ctx.fillRect(x, 0, 14, 512)
  }
  const shade = ctx.createRadialGradient(256, 260, 130, 256, 260, 360); shade.addColorStop(0, '#00000000'); shade.addColorStop(1, '#061115b5'); ctx.fillStyle = shade; ctx.fillRect(0, 0, 512, 512)
  ctx.fillStyle = '#aac8ca20'; ctx.beginPath(); ctx.moveTo(115, 0); ctx.lineTo(165, 0); ctx.lineTo(385, 512); ctx.lineTo(335, 512); ctx.fill()
  return texture(canvas)
}

/** Feathered palm leaflets replace the solid five-fin silhouettes at close range. */
export function palmLeafTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128
  const ctx = canvas.getContext('2d')!; ctx.clearRect(0, 0, 512, 128)
  ctx.strokeStyle = '#68965f'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 64); ctx.lineTo(512, 64); ctx.stroke()
  for (let i = 2; i < 45; i++) {
    const x = i / 45 * 512, width = Math.sin(i / 45 * Math.PI) * 60
    for (const side of [-1, 1]) {
      ctx.fillStyle = i % 3 ? '#5a895c' : '#87a867'
      ctx.beginPath(); ctx.moveTo(x - 5, 64); ctx.lineTo(x + 27, 64 + side * width); ctx.lineTo(x + 5, 64 + side * 5); ctx.closePath(); ctx.fill()
      ctx.strokeStyle = '#a4b67a'; ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(x, 64); ctx.lineTo(x + 25, 64 + side * width); ctx.stroke()
    }
  }
  return texture(canvas)
}
