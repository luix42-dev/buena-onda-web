import * as T from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { applyOceanDriveFacade } from './paintedPlaster'

type Point = [number, number]
export type LandmarkKind = 'colony' | 'breakwater' | 'clevelander' | 'carlyle' | 'leslie'
export type LandmarkConfig = {
  id?: string | number
  osmBuildingId?: number
  name: string
  kind: LandmarkKind
  height?: number
  bodyHeight?: number
  levels?: number
  palette?: { stucco?: string; trim?: string; accent?: string; neon?: string }
  facade?: [Point, Point]
  streetFacing?: { edge: [Point, Point]; normal?: Point }
}
export type LandmarkBuilding = { id: number | string; height: number; points: Point[] }
export type LandmarkAsset = { group: T.Group; setBlend: (blend: number) => void; dispose: () => void }

const palette = {
  colony: { wall: '#e9e4cc', trim: '#fcf5dc', accent: '#5b9dc7', neon: '#299cff' },
  breakwater: { wall: '#c6e0de', trim: '#faf2d0', accent: '#e6c05f', neon: '#51c4ff' },
  clevelander: { wall: '#e4e2d5', trim: '#f7f2de', accent: '#63aaa9', neon: '#ff6abf' },
  carlyle: { wall: '#d9e6da', trim: '#fcf3de', accent: '#75b4b1', neon: '#8ae3ca' },
  leslie: { wall: '#efe8d4', trim: '#f6f1e2', accent: '#f0c93a', neon: '#f4f1e6' },
}

/** Original procedural interpretations of documented architectural traits.
 * The foundation is the mapped OSM ring. Facade/crown dimensions are schematic,
 * not a measured facade survey; reference photography is never copied as texture.
 */
export function createMiamiLandmark(building: LandmarkBuilding, config: LandmarkConfig, surfaceSources?: { plasterColor: T.Texture; plasterNormal: T.Texture; plasterRoughness: T.Texture }, architecturalDepth = false): LandmarkAsset {
  const edge = config.streetFacing?.edge || config.facade
  if (!edge) throw new Error(`Missing street-facing edge for ${config.name}`)
  const [a, b] = edge, width = Math.hypot(b[0] - a[0], b[1] - a[1])
  const normal = config.streetFacing?.normal || [(b[1] - a[1]) / width, -(b[0] - a[0]) / width]
  const yaw = Math.atan2(normal[0], normal[1]), cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2
  const group = new T.Group(); group.name = `landmark-${config.kind}-${building.id}`
  group.position.set(cx, 0, cz); group.rotation.y = yaw
  const defaults = palette[config.kind]
  const p = { wall: config.palette?.stucco || defaults.wall, trim: config.palette?.trim || defaults.trim, accent: config.palette?.accent || defaults.accent, neon: config.palette?.neon || defaults.neon }
  const ownedGeometry = new Set<T.BufferGeometry>(), textures: T.Texture[] = []
  const paint = new T.MeshStandardMaterial({ color: p.wall, roughness: .88, emissive: p.wall, emissiveIntensity: .035 })
  if (surfaceSources) {
    const plasterMap = (source: T.Texture) => {
      const texture = source.clone(); texture.wrapS = texture.wrapT = T.RepeatWrapping
      texture.repeat.set(.4, .4); texture.anisotropy = 4; texture.needsUpdate = true; textures.push(texture); return texture
    }
    paint.map = plasterMap(surfaceSources.plasterColor)
    paint.normalMap = plasterMap(surfaceSources.plasterNormal)
    paint.roughnessMap = plasterMap(surfaceSources.plasterRoughness)
    paint.map.colorSpace = T.SRGBColorSpace
    paint.normalMap.colorSpace = T.NoColorSpace
    paint.roughnessMap.colorSpace = T.NoColorSpace
    paint.normalScale.set(.25, .25)
    applyOceanDriveFacade(paint)
  }
  const trim = new T.MeshStandardMaterial({ color: p.trim, roughness: .8 })
  const accent = new T.MeshStandardMaterial({ color: p.accent, roughness: .72 })
  const shadow = new T.MeshStandardMaterial({ color: '#18252a', roughness: .6 })
  // Original room drawings: shaded interior walls, curtains, louvers and lamps.
  // Emission follows the drawing instead of filling each pane with orange.
  const roomMaterials: T.MeshStandardMaterial[] = []
  for (let variant = 0; variant < 4; variant++) {
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 384
    const ctx = canvas.getContext('2d')!
    const wall = ctx.createLinearGradient(0, 0, 256, 384)
    wall.addColorStop(0, ['#4d4840', '#555348', '#384650', '#56483f'][variant]); wall.addColorStop(.7, '#292a2c'); wall.addColorStop(1, '#10171c')
    ctx.fillStyle = wall; ctx.fillRect(0, 0, 256, 384)
    ctx.fillStyle = '#182128'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(46, 54); ctx.lineTo(46, 300); ctx.lineTo(0, 384); ctx.fill()
    ctx.fillStyle = '#3b3b39'; ctx.beginPath(); ctx.moveTo(256, 0); ctx.lineTo(212, 54); ctx.lineTo(212, 300); ctx.lineTo(256, 384); ctx.fill()
    ctx.fillStyle = '#38322d'; ctx.beginPath(); ctx.moveTo(0, 384); ctx.lineTo(46, 300); ctx.lineTo(212, 300); ctx.lineTo(256, 384); ctx.fill()
    // Interior furniture stays a low silhouette, leaving depth visible above it.
    ctx.fillStyle = '#171d22'; ctx.fillRect(58, 270, 140, 32); ctx.fillRect(68, 297, 8, 30); ctx.fillRect(179, 297, 8, 30)
    ctx.strokeStyle = '#776354'; ctx.lineWidth = 5; ctx.strokeRect(91, 94, 61, 58)
    ctx.fillStyle = '#333b3b'; ctx.fillRect(96, 99, 51, 48)
    if (variant !== 2) {
      const lx = variant === 1 ? 182 : 75, ly = 200
      const lamp = ctx.createRadialGradient(lx, ly, 2, lx, ly, 100)
      lamp.addColorStop(0, 'rgba(255,207,133,.64)'); lamp.addColorStop(.25, 'rgba(242,181,105,.24)'); lamp.addColorStop(1, 'rgba(242,181,105,0)')
      ctx.fillStyle = lamp; ctx.fillRect(0, 100, 256, 210)
      ctx.fillStyle = '#d6bc8e'; ctx.beginPath(); ctx.moveTo(lx - 14, ly - 12); ctx.lineTo(lx + 14, ly - 12); ctx.lineTo(lx + 22, ly + 15); ctx.lineTo(lx - 22, ly + 15); ctx.fill()
      ctx.fillStyle = '#776958'; ctx.fillRect(lx - 2, ly + 15, 4, 47)
    }
    if (variant === 3) {
      for (let y = 16; y < 345; y += 17) { ctx.fillStyle = 'rgba(178,174,151,.42)'; ctx.fillRect(9, y, 238, 6); ctx.fillStyle = 'rgba(3,15,22,.4)'; ctx.fillRect(9, y + 6, 238, 4) }
    } else {
      for (const side of [0, 1]) for (let i = 0; i < 6; i++) {
        const curtainX = side === 0 ? i * 7 : 256 - (i + 1) * 7
        ctx.fillStyle = i % 2 ? 'rgba(205,190,160,.52)' : 'rgba(112,110,101,.6)'; ctx.fillRect(curtainX, 5, 7, 350)
      }
    }
    const reflection = ctx.createLinearGradient(0, 0, 256, 384)
    reflection.addColorStop(0, 'rgba(121,166,182,.24)'); reflection.addColorStop(.45, 'rgba(123,178,192,.02)'); reflection.addColorStop(1, 'rgba(54,101,118,.1)')
    ctx.fillStyle = reflection; ctx.fillRect(0, 0, 256, 384)
    const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 4; textures.push(map)
    roomMaterials.push(new T.MeshStandardMaterial({ map, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: .42, roughness: .19, metalness: .18 }))
  }
  const glass = new T.MeshStandardMaterial({ color: '#314b59', roughness: .12, metalness: .38, emissive: '#192b38', emissiveIntensity: .08 })
  const metal = new T.MeshStandardMaterial({ color: '#c4bba4', roughness: .43, metalness: .4 })
  const neon = new T.MeshStandardMaterial({ color: p.neon, emissive: p.neon, emissiveIntensity: 2.0, toneMapped: false })
  const materials: T.Material[] = [paint, trim, accent, shadow, glass, metal, neon, ...roomMaterials]
  const floorCanvas = document.createElement('canvas'); floorCanvas.width = floorCanvas.height = 256
  const floorCtx = floorCanvas.getContext('2d')!
  floorCtx.fillStyle = '#b7b1a2'; floorCtx.fillRect(0, 0, 256, 256)
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
    floorCtx.fillStyle = (col + row) % 2 ? '#a4a89f' : '#d2c8b6'; floorCtx.fillRect(col * 32 + 1, row * 32 + 1, 30, 30)
    floorCtx.fillStyle = 'rgba(255,255,255,.12)'; floorCtx.fillRect(col * 32 + 3, row * 32 + 3, 26, 1)
  }
  const floorMap = new T.CanvasTexture(floorCanvas); floorMap.colorSpace = T.SRGBColorSpace; floorMap.wrapS = floorMap.wrapT = T.RepeatWrapping; floorMap.repeat.set(3, 1); floorMap.anisotropy = 4; textures.push(floorMap)
  const stone = new T.MeshStandardMaterial({ color: '#b8b8ac', roughness: .66, map: floorMap })
  materials.push(stone)
  const batches = new Map<T.Material, T.BufferGeometry[]>()
  const add = (geo: T.BufferGeometry, material: T.Material) => { if (!batches.has(material)) batches.set(material, []); batches.get(material)!.push(geo) }
  const box = (x: number, y: number, z: number, w: number, h: number, depth: number, material: T.Material) => {
    if (architecturalDepth && material === trim && w > 3 && h < .3 && depth > .45) {
      // Rounded horizontal Art Deco eyebrows, still batched with existing trim.
      const outline = new T.Shape(), r = Math.min(.22, depth / 3), l = -w / 2, right = w / 2, bottom = -depth / 2, top = depth / 2
      outline.moveTo(l+r,bottom);outline.lineTo(right-r,bottom);outline.quadraticCurveTo(right,bottom,right,bottom+r)
      outline.lineTo(right,top-r);outline.quadraticCurveTo(right,top,right-r,top)
      outline.lineTo(l+r,top);outline.quadraticCurveTo(l,top,l,top-r)
      outline.lineTo(l,bottom+r);outline.quadraticCurveTo(l,bottom,l+r,bottom)
      const geo = new T.ExtrudeGeometry(outline,{depth:h,bevelEnabled:false,curveSegments:4})
      geo.rotateX(Math.PI/2);geo.translate(x,y+h/2,z);add(geo,material);return
    }
    const geo = new T.BoxGeometry(Math.max(.01, w), Math.max(.01, h), Math.max(.01, depth)); geo.translate(x, y, z); add(geo, material)
  }
  const cylinder = (x: number, y: number, z: number, radius: number, h: number, material: T.Material) => {
    const geo = new T.CylinderGeometry(radius, radius, h, 12); geo.translate(x, y, z); add(geo, material)
  }
  const local = ([x, z]: Point) => new T.Vector2(Math.cos(yaw) * (x - cx) - Math.sin(yaw) * (z - cz), -(Math.sin(yaw) * (x - cx) + Math.cos(yaw) * (z - cz)))
  const shape = new T.Shape(building.points.map(local))
  // Three-story main volumes and separate documented sign/crown silhouettes.
  // Colony's tagged overall height bounds its tall fin rather than stretching
  // the three-story facade to the top of that fin.
  const bodyHeight = config.bodyHeight || (config.kind === 'colony' ? Math.min(building.height, 10.7) : Math.max(8.8, Math.min(building.height, 11.4)))
  const levels = config.levels || 3, floor = bodyHeight / levels
  const body = new T.ExtrudeGeometry(shape, { depth: bodyHeight, bevelEnabled: false }); body.rotateX(-Math.PI / 2)
  // Replace only the mapped street-facing wall. The roof and all other footprint
  // faces stay untouched; real openings reveal rooms behind the original plane.
  if (architecturalDepth) {
    const source = body.index ? body.toNonIndexed() : body
    const position = source.getAttribute('position'), kept: number[] = []
    for (let i = 0; i < position.count; i += 3) {
      const streetFace = [i, i + 1, i + 2].every(j => Math.abs(position.getZ(j)) < .025)
      if (!streetFace) kept.push(i, i + 1, i + 2)
    }
    source.setIndex(kept); add(source, paint)
    if (source !== body) body.dispose()
  } else add(body, paint)
  const margin = Math.max(.7, width * .065), columns = Math.max(3, Math.floor((width - margin * 2) / 3.0)), pitch = (width - margin * 2) / columns
  const windowWidth = Math.min(1.45, pitch * .58)
  const facade = new T.Shape()
  facade.moveTo(-width / 2, 0); facade.lineTo(width / 2, 0)
  facade.lineTo(width / 2, bodyHeight); facade.lineTo(-width / 2, bodyHeight); facade.closePath()
  const roomWall = new T.MeshStandardMaterial({color:'#72675a',roughness:.94,emissive:'#b99260',emissiveIntensity:.1})
  const roomCeiling = new T.MeshStandardMaterial({color:'#393c3d',roughness:1})
  const roomLamp = new T.MeshStandardMaterial({color:'#ffe3b4',emissive:'#ffcb86',emissiveIntensity:1.3,roughness:.7})
  const roomGlazing = new T.MeshStandardMaterial({color:'#98b4c0',transparent:true,opacity:.16,depthWrite:false,roughness:.16,metalness:.1})
  if (architecturalDepth) materials.push(roomWall, roomCeiling, roomLamp, roomGlazing)
  else { roomWall.dispose(); roomCeiling.dispose(); roomLamp.dispose(); roomGlazing.dispose() }
  // Glass sits behind raised surrounding frames/reveals while staying outside
  // the solid footprint wall. Every repeated component is material-batched.
  const windowUnit = (x: number, y: number, w: number, h: number, warm = true, z = 0, rotation = 0) => {
    const surfaceBox = (along: number, yy: number, outward: number, ww: number, hh: number, depth: number, material: T.Material) => {
      const geo = new T.BoxGeometry(ww, hh, depth); geo.rotateY(rotation)
      geo.translate(x + Math.cos(rotation) * along + Math.sin(rotation) * outward, yy, z - Math.sin(rotation) * along + Math.cos(rotation) * outward); add(geo, material)
    }
    const room = roomMaterials[Math.abs(Math.round(x * 13 + y * 19 + z * 7)) % roomMaterials.length]
    if (architecturalDepth && rotation === 0 && z === 0) {
      const opening = new T.Path()
      opening.moveTo(x-w/2,y-h/2); opening.lineTo(x-w/2,y+h/2)
      opening.lineTo(x+w/2,y+h/2); opening.lineTo(x+w/2,y-h/2); opening.closePath()
      facade.holes.push(opening)
      const depth = 1.75
      const lampSide = Math.abs(Math.round(x*13+y*19))%2 ? -1 : 1
      const lx = lampSide*w*.23
      // Solid room shells, furniture and curtains give actual motion parallax.
      surfaceBox(0,y,-depth,w,h,.06,room)
      for (const side of [-1,1]) {
        surfaceBox(side*(w/2+.035),y,-depth/2,.07,h,depth,roomWall)
        for (let fold=0;fold<4;fold++) surfaceBox(side*(w*.31+fold*w*.045),y,-.38-(fold%2)*.055,w*.045,h*.94,.065,roomWall)
      }
      surfaceBox(0,y+h/2,-depth/2,w,.07,depth,roomCeiling)
      surfaceBox(0,y-h/2,-depth/2,w,.07,depth,stone)
      surfaceBox(0,y-h*.34,-1.12,w*.7,h*.18,.44,roomWall)
      surfaceBox(lx,y-h*.23,-.91,w*.22,.045,.3,metal)
      surfaceBox(lx,y-h*.14,-.91,.025,h*.18,.025,metal)
      if(warm) {
        const shade = new T.CylinderGeometry(w*.065,w*.12,h*.15,10)
        shade.translate(x+lx,y-h*.04,-.91);add(shade,roomLamp)
      }
      const pane = new T.PlaneGeometry(w,h);pane.translate(x,y,.13);add(pane,roomGlazing)
    } else {
      surfaceBox(0, y, .04, w + .36, h + .38, .1, shadow)
      surfaceBox(0, y, .11, w, h, .03, warm ? room : glass)
    }
    // Protruding reveals cast shaded borders around the recessed image plane.
    surfaceBox(-w / 2 - .08, y, .2, .16, h + .38, .3, trim)
    surfaceBox(w / 2 + .08, y, .2, .16, h + .38, .3, trim)
    surfaceBox(0, y - h / 2 - .09, .26, w + .36, .18, .46, stone)
    surfaceBox(0, y + h / 2 + .08, .23, w + .36, .16, .36, trim)
    surfaceBox(0, y, .245, .055, h, .07, metal)
    surfaceBox(0, y - h * .12, .25, w, .045, .06, metal)
  }
  for (let row = 1; row < levels; row++) {
    for (let column = 0; column < columns; column++) {
      const x = -width / 2 + margin + pitch * (column + .5)
      // Leave the central Breakwater sign tower unperforated.
      if ((config.kind === 'breakwater' && Math.abs(x) < width * .09) || (config.kind === 'leslie' && Math.abs(x) < .9)) continue
      windowUnit(x, floor * row + floor * .48, windowWidth, Math.min(1.65, floor * .48), (column + row) % 5 !== 0)
      box(x, floor * row + floor * .48 + 1.1, .34, pitch * .9, .13, .8, trim)
    }
    box(0, floor * row + .12, .105, width * .99, .16, .25, accent)
  }
  const entryWidth = Math.min(3.1, width * .22)
  windowUnit(0, 1.45, entryWidth, 2.55)
  // Two framed entrance leaves, narrow chrome pulls and shallow terrazzo steps.
  box(0, 1.45, .35, .075, 2.55, .09, metal)
  for (const side of [-1, 1]) {
    box(side * .15, 1.24, .43, .035, .43, .055, metal)
    box(side * .15, 1.03, .39, .09, .045, .09, metal)
    box(side * entryWidth * .34, .47, .3, entryWidth * .29, .31, .06, accent)
  }
  box(0, .055, 1.04, entryWidth + 1.0, .11, 1.55, stone)
  box(0, .13, .75, entryWidth + .7, .15, .96, stone)
  box(0, 2.64, .29, entryWidth, .055, .16, metal)
  for (const side of [-1, 1]) {
    const count = Math.max(1, Math.floor((width / 2 - entryWidth / 2 - .7) / 2.4))
    for (let i = 0; i < count; i++) windowUnit(side * (entryWidth / 2 + 1.4 + i * 2.4), 1.45, 1.85, 2.4, i % 3 !== 2)
  }
  // Ground-floor porch canopy, light rails and plinth: shaded depth rather than
  // another glowing rectangular wall. Projection remains shallow over sidewalk.
  box(0, 3.08, .63, width * .98, .23, 1.5, trim)
  box(0, 2.88, 1.18, width * .96, .11, .08, accent)
  box(0, .11, .57, width * .98, .2, 1.1, stone)
  box(0, .3, .12, width * .98, .22, .27, accent)
  // Warm fixtures beneath the porch read as small lamps, not a glowing wall.
  const porchLight = new T.MeshStandardMaterial({ color: '#ead7aa', emissive: '#ffe0ab', emissiveIntensity: .4, roughness: .32 })
  materials.push(porchLight)
  for (let x = -width * .4; x < width * .45; x += 3.2) {
    box(x, 2.86, .66, .48, .045, .3, metal)
    box(x, 2.82, .66, .36, .035, .22, porchLight)
  }
  for (let i = 0; i <= Math.floor(width / 2.5); i++) {
    const x = -width * .46 + width * .92 * i / Math.max(1, Math.floor(width / 2.5))
    cylinder(x, 1.51, 1.14, config.kind === 'breakwater' ? .13 : .085, 2.82, trim)
    if (config.kind === 'breakwater') for (const offset of [-.08, .08]) box(x + offset, 1.5, 1.22, .025, 2.7, .035, accent)
  }
  // Batch roof cornices and subtle wrapped eyebrow returns along every mapped
  // footprint edge rather than laying an invented rectangular block over it.
  const signedArea = building.points.reduce((area, point, i) => {
    const next = building.points[(i + 1) % building.points.length]
    return area + point[0] * next[1] - next[0] * point[1]
  }, 0)
  for (let i = 1; i < building.points.length; i++) {
    const u = local(building.points[i - 1]), v = local(building.points[i]), dx = v.x - u.x, dz = -v.y + u.y, len = Math.hypot(dx, dz)
    if (len < .3) continue
    for (const [y, h, depth, mat] of [[bodyHeight - .15, .22, .4, trim], [bodyHeight - .55, .1, .26, accent]] as const) {
      const geo = new T.BoxGeometry(len, h, depth); geo.rotateY(Math.atan2(-dz, dx)); geo.translate((u.x + v.x) / 2, y, -(u.y + v.y) / 2); add(geo, mat)
    }
    if (len > 3.8 && !(Math.abs(u.y) < .3 && Math.abs(v.y) < .3)) {
      const rotation = Math.atan2(-dz, dx) + (signedArea > 0 ? Math.PI : 0)
      for (let row = 1; row < levels; row++) for (let station = 2.1; station < len - 1.5; station += 4.4) {
        const x = u.x + dx * station / len, z = -u.y + dz * station / len, y = floor * row + floor * .48
        windowUnit(x, y, 1.15, Math.min(1.5, floor * .46), (row + Math.floor(station)) % 4 !== 0, z, rotation)
        if (station < 7 || row === levels - 1) {
          const eyebrow = new T.BoxGeometry(2.0, .12, .65); eyebrow.rotateY(rotation)
          eyebrow.translate(x + Math.sin(rotation) * .24, y + 1.0, z + Math.cos(rotation) * .24); add(eyebrow, trim)
        }
      }
    }
  }
  const signMaterials: T.MeshStandardMaterial[] = []
  const sign = (text: string, x: number, y: number, z: number, w: number, h: number, vertical = false, blade = false, color = p.neon) => {
    const canvas = document.createElement('canvas'); canvas.width = vertical ? 512 : 2048; canvas.height = vertical ? 2048 : 512
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'
    const letters = vertical ? Array.from(text.replace(/ /g, '')) : [text]
    const fontSize = vertical ? Math.min(330, canvas.height / (letters.length + .5)) : Math.min(320, canvas.width / Math.max(1, text.length) * 1.36)
    ctx.font = `500 ${fontSize}px ${config.kind === 'carlyle' ? 'Georgia' : 'Arial'}, sans-serif`
    letters.forEach((letter, i) => {
      const yy = vertical ? (i + .6) * canvas.height / (letters.length + .2) : canvas.height / 2
      ctx.shadowColor = color; ctx.shadowBlur = 15; ctx.strokeStyle = color; ctx.lineWidth = vertical ? 8 : 6; ctx.strokeText(letter, canvas.width / 2, yy)
      ctx.shadowBlur = 0; ctx.fillStyle = '#f5ffef'; ctx.fillText(letter, canvas.width / 2, yy)
    })
    const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 4; textures.push(map)
    const mat = new T.MeshStandardMaterial({ map, emissiveMap: map, emissive: color, emissiveIntensity: 2.2, transparent: true, depthWrite: false, roughness: .4, toneMapped: false }); materials.push(mat); signMaterials.push(mat)
    const addPlane = (rotation: number, offset: number) => {
      const geo = new T.PlaneGeometry(w, h); ownedGeometry.add(geo)
      const mesh = new T.Mesh(geo, mat); mesh.position.set(x + offset, y, z); mesh.rotation.y = rotation; group.add(mesh)
    }
    if (blade) { addPlane(Math.PI / 2, .025); addPlane(-Math.PI / 2, -.025) } else addPlane(0, 0)
  }
  if (config.kind === 'colony') {
    // Symmetric stepped ziggurat, inverted-T name gesture, blue neon tracing.
    for (let i = 0; i < 3; i++) box(0, bodyHeight + .2 + i * .35, -1.2, width * (.62 - i * .13), .48, 2.6, trim)
    const top = config.height || Math.max(bodyHeight + 3.5, building.height), finH = top - 3.1
    box(0, 3.1 + finH / 2, -.24, 1.15, finH, .65, accent)
    box(0, 3.1 + finH / 2, .17, .8, finH - .35, .19, trim)
    box(0, 4.02, .28, Math.min(6.2, width * .53), 1.22, .34, accent)
    sign('COLONY', 0, 9.95, .41, 1.05, Math.min(8.6, top - 6.8), true)
    sign('HOTEL', 0, 4.05, .49, Math.min(5.8, width * .49), .85)
    // Projecting duplicate lettering makes the real name legible while passing.
    box(.77, 9.7, .96, .11, 7.7, 1.2, accent); sign('COLONY', .85, 9.7, 1.08, 1.3, 7.3, true, true)
    for (const side of [-1, 1]) box(side * width * .48, bodyHeight / 2 + 1.5, .22, .065, bodyHeight - 3, .065, neon)
    for (const y of [3.23, floor + .32, floor * 2 + .32, bodyHeight + .04]) box(0, y, .31, width * .98, .045, .045, neon)
  } else if (config.kind === 'breakwater') {
    const towerWidth = Math.min(4.0, width * .17), towerTop = config.height || bodyHeight + 5.2
    box(0, towerTop / 2, -.2, towerWidth, towerTop, 1.6, accent)
    box(0, towerTop / 2, .65, towerWidth * .67, towerTop - .9, .18, trim)
    for (const side of [-1, 1]) {
      box(side * towerWidth * .41, towerTop / 2, .82, .12, towerTop - .5, .08, neon)
      box(side * towerWidth * .58, bodyHeight + .6, -.85, .28, 2.6, 1.1, trim)
    }
    box(0, towerTop + .15, -.35, towerWidth * .83, .33, 1.8, trim)
    sign('BREAKWATER', 0, 8.4, .85, towerWidth * .58, 10.4, true, false, '#52afff')
    sign('HOTEL', 0, 3.95, .87, towerWidth * .9, .8, false, false, '#ffdb66')
    sign('BREAKWATER', towerWidth / 2 + .25, 8.6, 1.0, 1.25, 9.5, true, true, '#52afff')
    for (const y of [floor + .05, floor * 2 + .05, bodyHeight - .42]) box(0, y, .2, width * .99, .065, .065, neon)
  } else if (config.kind === 'clevelander') {
    // Official gallery shows a five-story hotel and low southern patio canopy
    // with a giant open magenta C followed by widely spaced lettering.
    box(0, bodyHeight + .25, -1.0, width * .87, .65, 2.0, trim)
    box(0, bodyHeight + .12, .1, width * .97, .09, .18, accent)
    sign('HOTEL', 0, 3.52, 1.48, width * .35, .8, false, false, '#6de0d1')
    for (const y of [3.25, floor * 2 + .35]) box(0, y, .3, width * .99, .065, .055, neon)
    for (let i = 0; i < 9; i++) box(-width * .45 + width * .9 * i / 8, .93, 1.35, .045, 1.25, .05, metal)
    box(0, 1.56, 1.35, width * .9, .06, .06, metal)
    const patioWidth = 27.0, patioX = -width / 2 - patioWidth / 2
    box(patioX, 3.23, -.25, patioWidth, .25, 2.6, trim)
    box(patioX, 3.03, .88, patioWidth, .12, .18, accent)
    for (let i = 0; i <= 7; i++) cylinder(patioX - patioWidth / 2 + 1 + (patioWidth - 2) * i / 7, 1.56, .85, .085, 3.03, trim)
    const c = new T.TorusGeometry(1.4, .067, 8, 36, Math.PI * 1.7)
    c.rotateZ(Math.PI * .15); c.translate(patioX - patioWidth / 2 + 2, 4.84, .96); add(c, neon)
    sign('L E V E L A N D E R', patioX + 2.2, 4.36, .98, patioWidth - 5.8, 1.22, false, false, '#ff648e')
  } else if (config.kind === 'leslie') {
    // Leslie (per Commons photo refs, docs/cruise/refs/ocean-drive): cream walls,
    // bright yellow eyebrows and fluted fins, a stepped central pylon with a pale
    // yellow panel and flagpole, small horizontal grey "LESLIE" over the entrance
    // lit white at night, low yellow terrace railing. No vertical name sign today.
    for (const y of [floor + .02, floor * 2 + .02]) box(0, y + 1.0, .5, width * .99, .13, 1.15, accent)
    for (let i = 0; i < 3; i++) box(0, bodyHeight + .25 + i * .4, -.6, width * (.34 - i * .09), .5, 1.4, trim)
    box(0, bodyHeight / 2 + 1.6, .22, width * .2, bodyHeight - 3.0, .3, trim)
    box(0, bodyHeight / 2 + 1.6, .4, width * .14, bodyHeight - 3.6, .06, accent)
    for (const side of [-1, 1]) for (const x of [.32, .44]) box(side * width * x, bodyHeight / 2 + 1.5, .24, .16, bodyHeight - 3.2, .3, accent)
    cylinder(0, bodyHeight + 3.2, -.6, .03, 3.2, metal)
    sign('LESLIE', 0, 3.42, .9, Math.min(3.4, width * .24), .55, false, false, '#f4f1e6')
    box(0, .55, 1.6, width * .9, .5, .08, accent)
    box(0, .28, 1.6, width * .9, .32, .1, shadow)
  } else {
    // Carlyle's central vertical gesture, stepped parapet and rounded return.
    for (let i = 0; i < 3; i++) box(0, bodyHeight + .18 + i * .28, -1.15, width * (.52 - i * .1), .42, 2.4, trim)
    for (const x of [-.92, -.46, 0, .46, .92]) box(x, bodyHeight * .62, .19, .14, bodyHeight * .71, .27, accent)
    // Per Commons refs: script 'The CARLYLE' in pink-red neon over the entrance.
    sign('The CARLYLE', 0, 3.55, .74, Math.min(7.5, width * .42), .95, false, false, '#ff5a7a')
    for (const y of [floor + .38, floor * 2 + .38]) {
      box(0, y, .23, width * .99, .14, .62, trim)
      const arc = new T.TorusGeometry(.65, .09, 6, 14, Math.PI); arc.rotateX(Math.PI / 2); arc.rotateY(Math.PI / 2); arc.translate(-width / 2 + .65, y, -.05); add(arc, trim)
    }
    for (const side of [-1, 1]) {
      cylinder(side * width * .3, bodyHeight + 1.85, -1.0, .027, 2.8, metal)
      box(side * width * .3, bodyHeight + .78, .17, .045, 1.3, .045, neon)
    }
  }
  if (architecturalDepth) add(new T.ShapeGeometry(facade), paint)
  batches.forEach((geometries, material) => {
    // Normals/UVs remain compatible; use nonindexed geometry for mixed shapes.
    const flat = geometries.map(g => g.index ? g.toNonIndexed() : g)
    const merged = mergeGeometries(flat, false)
    if (merged && architecturalDepth && [paint, trim, accent, stone].includes(material as T.MeshStandardMaterial)) {
      // Baked face shading keeps soffits/reveals readable without shadow maps.
      const normals = merged.getAttribute('normal'), colors = new Float32Array(normals.count*3)
      for (let i=0;i<normals.count;i++) {
        const shade = normals.getY(i)<-.5 ? .45 : Math.abs(normals.getX(i))>.5 ? .78 : 1
        colors.set([shade,shade,shade],i*3)
      }
      merged.setAttribute('color',new T.BufferAttribute(colors,3));(material as T.MeshStandardMaterial).vertexColors=true
    }
    geometries.forEach(g => g.dispose()); flat.forEach(g => g.dispose())
    if (merged) { ownedGeometry.add(merged); group.add(new T.Mesh(merged, material)) }
  })
  return {
    group,
    setBlend(blend) {
      const darkness = T.MathUtils.clamp(blend, 0, 1)
      neon.emissiveIntensity = .2 + darkness * 1.8
      glass.emissiveIntensity = .045 + darkness * .35
      roomMaterials.forEach((m, i) => { m.emissiveIntensity = .06 + darkness * (i === 2 ? .16 : .5) })
      porchLight.emissiveIntensity = .05 + darkness * 1.2
      if (architecturalDepth) {
        roomLamp.emissiveIntensity = .15 + darkness * 1.15
        roomWall.emissiveIntensity = .025 + darkness * .075
      }
      paint.emissiveIntensity = .01 + darkness * .035
      signMaterials.forEach(m => { m.emissiveIntensity = .1 + darkness * 1.7 })
    },
    dispose() { ownedGeometry.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()) },
  }
}
