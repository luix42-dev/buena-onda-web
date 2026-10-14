import * as T from 'three'

/** One 2048² canvas holding every neon sign in Neon Run: 32 vertical blades (128×512) on the
 * top half, 32 horizontal shop signs (512×128) on the bottom half. Original designs, real words
 * (English, Spanish, Japanese) plus Buena Onda campaign names. Drawn once at load, no assets. */
export type SignDesign = { rect: [number, number, number, number]; tint: T.Color; vertical: boolean }

const PALETTE = ['#ff3fa4', '#3fe6ff', '#ffd23f', '#ff5a3c', '#b56bff', '#5aff9c', '#ff7ad9', '#ffffff']
const VERTICAL = ['ラーメン', 'カラオケ', 'ホテル', 'バー', '寿司', '喫茶', '占い', '電脳', '未来', '夜', 'ONDA', 'VESPER', 'NATSU', 'BAR', 'HOTEL', 'SYNTH', 'NOODLE', 'ARCADE', 'CLINIC', 'TATTOO', 'MOTEL', 'RADIO', '24H', 'VICE', '酒', '薬局', 'DINER', 'CYBER', 'NEON', 'TIDEWAY', 'LIQUOR', 'OPEN']
const HORIZONTAL = ['BUENA ONDA', 'VICE NIGHTS', 'ONDA TROPICAL', 'NATSU SERVICE', 'KARAOKE 24H', 'NOODLE BAR', 'HOTEL VESPER', 'CYBERWARE', 'ラーメン 屋', 'カラオケ館', 'PAWN & REPAIR', 'ARCADE', 'SYNTH SHOP', 'TIDEWAY MOTEL', 'BRANCHES', 'DINER', 'LIQUOR', 'TATTOO', 'CLINIC 24', 'LOVE HOTEL', 'BAR NOCHE', 'RADIO LIBRE', 'MERCADO', 'FARMACIA', 'CAFÉ', 'NEON', 'DATA', 'OPEN LATE', '電脳 MARKET', 'PACHINKO', 'SAKE', 'GARAGE']
const FONT = '"Yu Gothic UI","Meiryo","Hiragino Sans","Noto Sans JP",Outfit,Arial,sans-serif'

function panel(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, style: number) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip()
  if (style === 0) { g.fillStyle = color; g.fillRect(x, y, w, h); g.fillStyle = '#ffffff55'; g.fillRect(x, y, w, h * .06) } // backlit box
  else { g.fillStyle = '#07060c'; g.fillRect(x, y, w, h); g.strokeStyle = color; g.lineWidth = 6; g.shadowColor = color; g.shadowBlur = 18; g.strokeRect(x + 8, y + 8, w - 16, h - 16) } // neon tube frame
  g.restore()
}
function glowText(g: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string, ink: boolean, maxWidth: number) {
  g.font = `800 ${size}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'
  if (ink) { g.fillStyle = '#120a14'; g.fillText(text, x, y, maxWidth); return }
  g.shadowColor = color; g.shadowBlur = 22; g.fillStyle = color; g.fillText(text, x, y, maxWidth); g.shadowBlur = 6; g.fillStyle = '#ffffff'; g.globalAlpha = .55; g.fillText(text, x, y, maxWidth); g.globalAlpha = 1; g.shadowBlur = 0
}

export function createSignAtlas() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 2048
  const g = canvas.getContext('2d')!, designs: SignDesign[] = []
  g.clearRect(0, 0, 2048, 2048)
  VERTICAL.forEach((word, i) => {
    const x = (i % 16) * 128, y = Math.floor(i / 16) * 512, color = PALETTE[(i * 3) % PALETTE.length], style = i % 3 === 0 ? 0 : 1
    panel(g, x + 4, y + 4, 120, 504, color, style)
    const chars = [...word], step = Math.min(96, 460 / chars.length), size = Math.min(84, step * .86)
    chars.forEach((ch, k) => glowText(g, ch, x + 64, y + 30 + step * (k + .5), size, color, style === 0, 110))
    designs.push({ rect: [x / 2048, 1 - (y + 512) / 2048, 128 / 2048, 512 / 2048], tint: new T.Color(color), vertical: true })
  })
  HORIZONTAL.forEach((word, i) => {
    const x = (i % 4) * 512, y = 1024 + Math.floor(i / 4) * 128, color = PALETTE[(i * 5 + 1) % PALETTE.length], style = i % 4 === 1 ? 0 : 1
    panel(g, x + 4, y + 4, 504, 120, color, style)
    glowText(g, word, x + 256, y + 66, 64, color, style === 0, 470)
    designs.push({ rect: [x / 2048, 1 - (y + 128) / 2048, 512 / 2048, 128 / 2048], tint: new T.Color(color), vertical: false })
  })
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; texture.anisotropy = 8; texture.generateMipmaps = true
  return { texture, designs, vertical: designs.filter(d => d.vertical), horizontal: designs.filter(d => !d.vertical) }
}

/** Unlit instanced sign material: per-instance atlas rect, tint gain and flicker seed; fogged so
 * signs sink into the rain haze with distance; back faces mirror the U so text never reads backwards. */
export function signMaterial(map: T.Texture, time: { value: number }) {
  return new T.ShaderMaterial({
    uniforms: T.UniformsUtils.merge([T.UniformsLib.fog, { map: { value: map }, uTime: time }]),
    vertexShader: /* glsl */`
      attribute vec4 aRect; attribute vec3 aGain; attribute float aSeed;
      varying vec2 vUv; varying vec4 vRect; varying vec3 vGain; varying float vSeed;
      #include <fog_pars_vertex>
      void main(){ vUv = uv; vRect = aRect; vGain = aGain; vSeed = aSeed;
        vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D map; uniform float uTime;
      varying vec2 vUv; varying vec4 vRect; varying vec3 vGain; varying float vSeed;
      #include <fog_pars_fragment>
      float h(float n){ return fract(sin(n) * 43758.5453); }
      void main(){
        vec2 u = vec2(gl_FrontFacing ? vUv.x : 1. - vUv.x, vUv.y);
        vec4 t = texture2D(map, vRect.xy + u * vRect.zw);
        if (t.a < .35) discard;
        // A few signs are failing: they stutter off for a beat now and then.
        float broken = step(.9, h(vSeed * 91.7));
        float flick = mix(1., step(.3, h(floor(uTime * 9. + vSeed * 13.) + vSeed)), broken);
        gl_FragColor = vec4(t.rgb * vGain * (.25 + .75 * flick), 1.);
        #include <fog_fragment>
      }`,
    fog: true, side: T.DoubleSide, toneMapped: false,
  })
}

/** Soft radial glow and a ragged vertical streak, both generated (no image assets). */
export function glowTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128
  const g = canvas.getContext('2d')!, r = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  r.addColorStop(0, '#ffffff'); r.addColorStop(.25, '#ffffff88'); r.addColorStop(1, '#00000000'); g.fillStyle = r; g.fillRect(0, 0, 128, 128)
  return new T.CanvasTexture(canvas)
}
export function streakTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 256
  const g = canvas.getContext('2d')!
  for (let x = 0; x < 64; x++) {
    const across = Math.pow(Math.sin(Math.PI * x / 63), 2.2), jitter = .55 + .45 * Math.sin(x * 1.7) * Math.sin(x * .37)
    const v = g.createLinearGradient(0, 0, 0, 256); v.addColorStop(0, '#00000000'); v.addColorStop(.18, `rgba(255,255,255,${.9 * across * jitter})`); v.addColorStop(1, '#00000000')
    g.fillStyle = v; g.fillRect(x, 0, 1, 256)
  }
  return new T.CanvasTexture(canvas)
}

/** A generic lit shopfront: dark frame, mullioned glass with interior glow and shelf silhouettes. */
export function shopfrontTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 192
  const g = canvas.getContext('2d')!
  g.fillStyle = '#0b0a10'; g.fillRect(0, 0, 512, 192)
  const panes = [[14, 30, 150], [176, 30, 150], [340, 30, 70], [420, 30, 78]]
  panes.forEach(([x, y, w], i) => {
    const glow = g.createLinearGradient(0, y, 0, 186); glow.addColorStop(0, '#2a2a33'); glow.addColorStop(.35, '#a8a39a'); glow.addColorStop(1, '#ffffff')
    g.fillStyle = glow; g.fillRect(x, y, w, 156)
    if (i === 2) { g.fillStyle = '#1a1820'; g.fillRect(x + 8, y + 10, w - 16, 146); return } // door
    g.fillStyle = '#0b0a1099'; for (let k = 0; k < 3; k++) g.fillRect(x + 6, y + 40 + k * 38, w - 12, 5) // shelves
    for (let k = 0; k < 14; k++) { g.fillStyle = `rgba(10,10,16,${.25 + (k % 3) * .15})`; g.fillRect(x + 8 + ((k * 37) % (w - 20)), y + 20 + (k % 3) * 38, 8 + (k % 4) * 3, 18) } // goods
  })
  g.fillStyle = '#05050a'; for (const x of [12, 170, 334, 414, 500]) g.fillRect(x, 24, 6, 168)
  g.fillRect(0, 22, 512, 8)
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; return texture
}
