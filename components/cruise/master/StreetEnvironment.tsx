'use client'

import { useEffect, useMemo } from 'react'
import { useGLTF, useTexture } from '@react-three/drei'
import * as T from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export const streetX = (s: number) => 3 * Math.sin(s / 95)
type Time = 'day' | 'sunset' | 'night'
type Props = { timeOfDay: Time; onAdClick?: (id: string) => void }
const PALETTE = ['#63aaa4', '#da8f87', '#d9cfb1', '#a1b8c6', '#d5ad89', '#a8b9a5']

function artwork(title: string, subtitle: string, color: string, square = false) {
  const canvas = document.createElement('canvas'); canvas.width = 1536; canvas.height = square ? 640 : 448
  const c = canvas.getContext('2d')!; const h = canvas.height
  c.fillStyle = color; c.fillRect(0, 0, canvas.width, h)
  c.strokeStyle = '#f2e3bc'; c.lineWidth = 6; c.strokeRect(22, 22, 1492, h - 44)
  c.strokeStyle = '#f2e3bc80'; c.lineWidth = 2; c.strokeRect(34, 34, 1468, h - 68)
  c.textAlign = 'center'; c.fillStyle = '#fff3d5'
  const lines = title.split('|'); c.font = `bold ${lines.length > 1 ? 130 : 126}px Georgia`
  lines.forEach((line, i) => c.fillText(line, 768, (lines.length > 1 ? 216 : 220) + i * 144, 1400))
  c.font = '42px Arial'; c.fillText(subtitle, 768, h - 76, 1390)
  c.font = '22px Arial'; c.fillText('BUENA ONDA CRUISE · DEMO', 768, h - 37)
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; texture.anisotropy = 4
  return texture
}

/** Original modular architecture. All tiny trim, rail and display meshes are batched by material. */
function Architecture({ timeOfDay }: { timeOfDay: Time }) {
  const plaster = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128
    const ctx = canvas.getContext('2d')!; const data = ctx.createImageData(128, 128)
    for (let i = 0; i < data.data.length; i += 4) { const v = 118 + ((i * 16807 % 101) / 101) * 30; data.data[i] = data.data[i + 1] = data.data[i + 2] = v; data.data[i + 3] = 255 }
    ctx.putImageData(data, 0, 0); const t = new T.CanvasTexture(canvas); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(8, 8); return t
  }, [])
  useEffect(() => () => plaster.dispose(), [plaster])
  const batches = useMemo(() => {
    const groups = new Map<string, T.BufferGeometry[]>()
    const add = (color: string, pos: [number, number, number], size: [number, number, number], yaw = 0) => {
      const g = new T.BoxGeometry(...size); g.rotateY(yaw); g.translate(...pos)
      const list = groups.get(color) ?? []; list.push(g); groups.set(color, list)
    }
    // Shopfronts face the road (+x); side elevations and freestanding signs face the approach (+z).
    const sites = [22, 46, 70, 95, 124, 155, 181, 207]
    sites.forEach((s, i) => {
      const x = streetX(s) - 17 - (i === 2 ? 3 : 0); const z = -s; const h = i === 3 || i === 5 ? 9 : 9 + (i % 3) * 2
      const color = i === 3 ? PALETTE[0] : i === 5 ? PALETTE[1] : PALETTE[(i + 2) % PALETTE.length]
      add(color, [x - 1, h / 2, z], [10, h, 20]); if (i === 2) add('#c6baa3', [x + 7.3, .06, z], [3.1, .12, 20])
      // Recessed arcade leaves actual interior depth between the glazing and back wall.
      add('#eee0c5', [x + 4.25, .38, z], [2.8, .55, 21])
      add('#344b49', [x + 4.1, 1.9, z], [.15, 3, 18.8])
      add('#ad7953', [x + 5.1, .67, z], [2, .15, 19])
      // Dark soffit and recessed skirting provide contact shading even at mobile shadow quality.
      add('#343f37', [x + 4.9, 3.33, z], [1.95, .09, 19])
      add('#5b6758', [x + 4.9, .72, z], [1.85, .025, 18.7])
      add('#746b5b', [x + 5.72, .46, z], [.08, .15, 20.6])
      for (let k = -8; k <= 8; k += 4) {
        add('#e8d9b8', [x + 5.7, 2, z + k], [.36, 3.6, .24])
        add('#b4c6c0', [x + 5.76, 3.5, z + k + 1.85], [.12, .12, 3.65])
        add('#897660', [x + 5.6, .75, z + k + 1.8], [.17, .12, 3.6])
        add('glass', [x + 5.72, 2.07, z + k + 1.83], [.025, 2.46, 3.46])
        add('#738982', [x + 5.75, 2.08, z + k + 2.5], [.03, 2.46, .035])
        // Warm shop ceiling luminaires, with no expensive individual shadow lights.
        add('light', [x + 5, 3.2, z + k + 1.8], [.4, .06, 2])
        if (i === 3) {
          // Record bins: each sleeve is real shallow geometry in a recessed shop bay.
          add('#895b3d', [x + 4.95, 1.13, z + k + 1.8], [1, .85, 2.7])
          for (let r = 0; r < 8; r++) add(PALETTE[r % PALETTE.length], [x + 5.05, 1.7, z + k + .62 + r * .32], [.55, .62, .07], -.12)
        } else if (i === 5) {
          // Clothing rails and recognizable jacket silhouettes behind open display glass.
          add('#b8a27f', [x + 4.85, 2.65, z + k + 1.8], [.08, .08, 2.7])
          for (let r = 0; r < 4; r++) {
            const zz = z + k + .8 + r * .65; const cloth = ['#d5ad89', '#a1b8c6', '#da8f87', '#d9cfb1'][r]
            add(cloth, [x + 4.9, 2.02, zz], [.24, 1.06, .43]); add(cloth, [x + 4.9, 2.34, zz], [.25, .3, .75])
            add('#b8a27f', [x + 4.9, 2.6, zz], [.04, .14, .08])
          }
        } else add('#9f8a67', [x + 4.9, 1.5, z + k + 1.7], [.4, 1.6, 1.25])
      }
      // Door mullions/handle, a projecting eyebrow and stepped Deco roof profile.
      add('#272f2b', [x + 5.75, 1.95, z], [.12, 2.6, 1.3]); add('#d8bc7b', [x + 5.86, 1.8, z + .4], [.12, .5, .04])
      add('#e8d9b8', [x + 4.9, 3.85, z], [3.3, .3, 21.3])
      add(color, [x + 6.3, 3.57, z], [.2, .3, 21.3])
      for (let tier = 0; tier < 3; tier++) add('#ede0c5', [x, h - .4 + tier * .24, z], [12 + tier * .15, .12, 21 + tier * .2])
      add(color, [x + 3.1, h + .7, z], [4, 1.2, 8]); add('#f1e0bf', [x + 3.1, h + 1.36, z], [4.3, .14, 8.3])
      // Repeated recessed upper windows with real ledges, vertical mullions and lintels.
      for (let y = 5.3; y < h - .6; y += 2.6) for (let k = -7; k <= 7; k += 3.5) {
        add('#406166', [x + 4.02, y, z + k], [.12, 1.45, 2.3])
        add('#dfd7bf', [x + 4.2, y + .86, z + k], [.48, .12, 2.65])
        add('#e1d3b5', [x + 4.1, y, z + k], [.2, 1.45, .06])
        add('#e1d3b5', [x + 4.2, y - .79, z + k], [.42, .14, 2.6])
      }
      // Vertical fluting and side wall bands break up silhouette and long blank walls.
      for (let k = 0; k < 4; k++) add('#ede0c5', [x + 4.18, h / 2 + 1.4, z - 9.4 + k * .22], [.12, h - 3.3, .07])
      for (let y = 4.4; y < h; y += 1.3) add('#e4d6b6', [x, y, z + 10.03], [10.4, .08, .13])
    })
    // Curved street furniture is deliberately kept outside the driveable 12 m strip.
    for (let s = 5; s < 224; s += 2) {
      const x = streetX(s); const yaw = -Math.atan(3 / 95 * Math.cos(s / 95))
      for (const side of [-1, 1]) {
        add('#c6baa3', [x + side * 6.2, .15, -s], [.35, .3, 2.03], yaw)
        add('#d1c5ae', [x + side * 8.2, .05, -s], [3.65, .1, 2.03], yaw)
      }
      if (s % 10 === 5) add('#efe0b0', [x, .025, -s], [.1, .02, 3.3], yaw)
      for (const side of [-1, 1]) add('#ded0ad', [x + side * 5.75, .023, -s], [.1, .018, 2.03], yaw)
    }
    for (let s = 16; s < 220; s += 27) {
      const x = streetX(s) + 8.9
      add('#364b48', [x, 3.5, -s], [.14, 7, .14]); add('#364b48', [x - .65, 6.9, -s], [1.4, .14, .14])
      add('light', [x - 1.25, 6.8, -s], [.65, .12, .42])
      add('#c6baa3', [x, .25, -s], [.6, .5, .6])
      add('#b9936a', [x + 3, .52, -s - 4], [.6, .15, 2.3]); add('#364b48', [x + 3, .26, -s - 4.8], [.5, .45, .08]); add('#364b48', [x + 3, .26, -s - 3.2], [.5, .45, .08])
    }
    for (let s = 9; s < 225; s += 11.3) {
      // Low sea-grape planting grounds the palms and separates promenade from beach.
      for (let i = 0; i < 5; i++) {
        const color = i % 2 ? '#66764d' : '#4c6748'; const g = new T.SphereGeometry(.65 + (i % 3) * .18, 7, 5)
        g.scale(1.15, .65, 1); g.translate(streetX(s) + 12.4 + i * .57, .32, -s + Math.sin(i * 3.2) * 1.2)
        const list = groups.get(color) ?? []; list.push(g); groups.set(color, list)
      }
    }
    return Array.from(groups, ([color, gs]) => { const geometry = mergeGeometries(gs)!; gs.forEach(g => g.dispose()); geometry.computeBoundingSphere(); return { color, geometry } })
  }, [])
  useEffect(() => () => batches.forEach(b => b.geometry.dispose()), [batches])
  return <group>{batches.map(({ color, geometry }) => <mesh key={color} geometry={geometry} castShadow={color !== 'glass'} receiveShadow userData={{ cruiseOccluder: color !== 'glass' }}>
    <meshStandardMaterial color={color === 'light' ? '#ffddb0' : color === 'glass' ? '#8daea9' : color} transparent={color === 'glass'} opacity={color === 'glass' ? .16 : 1} depthWrite={color !== 'glass'} bumpMap={color === 'light' || color === '#406166' || color === 'glass' ? undefined : plaster} bumpScale={.012} roughness={color === '#406166' || color === 'glass' ? .3 : .85} metalness={color === '#406166' || color === 'glass' ? .15 : 0} emissive={color === 'light' ? '#ffbc76' : '#000000'} emissiveIntensity={timeOfDay === 'night' ? 1.6 : .15} />
  </mesh>)}</group>
}

function Palms() {
  const gltf = useGLTF('/cruise/environment/palms/yughues-palm.glb', false, true)
  const batches = useMemo(() => {
    gltf.scene.updateMatrixWorld(true)
    const parts: { geometry: T.BufferGeometry; material: T.Material | T.Material[]; matrix: T.Matrix4 }[] = []
    gltf.scene.traverse(o => { if (o instanceof T.Mesh) parts.push({ geometry: o.geometry, material: o.material, matrix: o.matrixWorld.clone() }) })
    return parts.map(part => {
      const copies = Array.from({ length: 19 }, (_, i) => {
        const s = 10 + i * 11.3; const transform = new T.Object3D()
        transform.position.set(streetX(s) + 12.5 + (i % 2) * 3, 0, -s); transform.scale.setScalar(.69 + (i % 4) * .055); transform.rotation.y = i * 2.4; transform.updateMatrix()
        const geometry = part.geometry.clone()
        // Decode normalized quantized positions before baking world transforms; writing
        // world meters back into integer attributes would overflow their [-1,1] range.
        for (const key of ['position', 'normal', 'tangent']) {
          const source = geometry.getAttribute(key); if (!source) continue
          const values = new Float32Array(source.count * source.itemSize)
          for (let v = 0; v < source.count; v++) { values[v * source.itemSize] = source.getX(v); values[v * source.itemSize + 1] = source.getY(v); values[v * source.itemSize + 2] = source.getZ(v); if (source.itemSize === 4) values[v * 4 + 3] = source.getW(v) }
          geometry.setAttribute(key, new T.BufferAttribute(values, source.itemSize))
        }
        return geometry.applyMatrix4(transform.matrix.multiply(part.matrix))
      })
      const geometry = mergeGeometries(copies)!; copies.forEach(g => g.dispose()); return { geometry, material: part.material }
    })
  }, [gltf.scene])
  useEffect(() => () => batches.forEach(p => p.geometry.dispose()), [batches])
  return <group dispose={null}>{batches.map((p, i) => <mesh key={i} geometry={p.geometry} material={p.material} castShadow receiveShadow />)}</group>
}

function Ground() {
  const originals = useTexture(['/cruise/materials/clean-asphalt/color.webp', '/cruise/materials/clean-asphalt/normal.webp', '/cruise/materials/clean-asphalt/roughness.webp'])
  const maps = useMemo(() => originals.map((original, i) => { const t = original.clone(); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(4, 70); t.anisotropy = 4; if (i === 0) t.colorSpace = T.SRGBColorSpace; t.needsUpdate = true; return t }), [originals])
  const road = useMemo(() => {
    const p: number[] = [], uv: number[] = [], indices: number[] = []
    for (let i = 0; i <= 120; i++) { const s = -12 + i * 2; const x = streetX(s); p.push(x - 6, 0, -s, x + 6, 0, -s); uv.push(0, i / 120, 1, i / 120); if (i < 120) { const a = i * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) } }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(indices); g.computeVertexNormals(); return g
  }, [])
  useEffect(() => () => { road.dispose(); maps.forEach(m => m.dispose()) }, [road, maps])
  return <>
    <mesh geometry={road} receiveShadow><meshStandardMaterial map={maps[0]} normalMap={maps[1]} roughnessMap={maps[2]} normalScale={new T.Vector2(.3, .3)} color="#b9b3aa" /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[0, -.035, -100]} receiveShadow><planeGeometry args={[150, 520]} /><meshStandardMaterial color="#c4b18b" roughness={1} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[14.6, -.018, -110]} receiveShadow><planeGeometry args={[6.1, 480]} /><meshStandardMaterial color="#999c6b" roughness={1} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[22.1, -.025, -110]}><planeGeometry args={[3.2, 480]} /><meshStandardMaterial color="#a89a78" roughness={.82} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[96, -.08, -125]}><planeGeometry args={[145, 620]} /><meshStandardMaterial color="#418c99" roughness={.36} metalness={.2} /></mesh>
    {Array.from({ length: 5 }, (_, i) => <mesh key={i} rotation-x={-Math.PI / 2} position={[24 + i * 1.9, -.04 + i * .003, -110]}><planeGeometry args={[.35 + i * .22, 480]} /><meshStandardMaterial color={i % 2 ? '#90bdb9' : '#bad2c3'} transparent opacity={.24} depthWrite={false} /></mesh>)}
  </>
}

function Sign({ id, s, title, subtitle, color, onClick, night }: { id: string; s: number; title: string; subtitle: string; color: string; onClick?: (id: string) => void; night: boolean }) {
  const texture = useMemo(() => artwork(title, subtitle, color, true), [title, subtitle, color]); useEffect(() => () => texture.dispose(), [texture])
  const x = streetX(s) - 10.1; const billboard = id === 'billboard'; const y = billboard ? 6.1 : 5.3
  return <group position={[x, 0, -s]}>
    {[-2.3, 2.3].map(a => <mesh key={a} position={[a, y / 2, -.25]} castShadow><boxGeometry args={[.2, y, .24]} /><meshStandardMaterial color="#435653" roughness={.65} metalness={.25} /></mesh>)}
    <mesh position={[0, y, -.12]} castShadow><boxGeometry args={[7.7, 3.65, .28]} /><meshStandardMaterial color="#e6d3ae" /></mesh>
    <mesh name={`ad-${id}`} userData={{ adId: id }} position={[0, y, .035]} onClick={event => { event.stopPropagation(); onClick?.(id) }}>
      <planeGeometry args={[7.45, 3.4]} /><meshStandardMaterial map={texture} emissiveMap={texture} emissive="#fff0ce" emissiveIntensity={night ? .8 : .12} roughness={.85} />
    </mesh>
    <mesh position={[0, y + 1.95, .14]}><boxGeometry args={[7.9, .12, .7]} /><meshStandardMaterial color="#e6d3ae" /></mesh>
  </group>
}

function FacadeSign({ s, title, subtitle, color, night }: { s: number; title: string; subtitle: string; color: string; night: boolean }) {
  const texture = useMemo(() => artwork(title, subtitle, color), [title, subtitle, color]); useEffect(() => () => texture.dispose(), [texture])
  return <mesh position={[streetX(s) - 11.1, 4.65, -s]} rotation-y={Math.PI / 2}><planeGeometry args={[16.5, 1.55]} /><meshStandardMaterial map={texture} emissiveMap={texture} emissive="#ffddb2" emissiveIntensity={night ? .6 : .05} /></mesh>
}

function EventBanner({ night }: { night: boolean }) {
  const map = useMemo(() => artwork('VICE NIGHTS', 'FRIDAY · MUSIC BY THE OCEAN', '#283b59'), []); useEffect(() => () => map.dispose(), [map])
  return <group position={[streetX(190), 0, -190]}>
    {[-7.8, 7.8].map(x => <mesh key={x} position={[x, 5.5, 0]}><cylinderGeometry args={[.11, .16, 11, 8]} /><meshStandardMaterial color="#586259" metalness={.3} roughness={.65} /></mesh>)}
    <mesh position={[0, 10.6, 0]}><boxGeometry args={[15.8, .055, .055]} /><meshStandardMaterial color="#727269" /></mesh>
    <mesh position={[0, 9.2, .03]}><planeGeometry args={[14, 2.2]} /><meshStandardMaterial map={map} side={T.DoubleSide} emissiveMap={map} emissive="#fff0ce" emissiveIntensity={night ? .4 : .05} /></mesh>
  </group>
}

export default function StreetEnvironment({ timeOfDay, onAdClick }: Props) {
  const night = timeOfDay === 'night'
  return <group>
    <Ground /><Architecture timeOfDay={timeOfDay} /><Palms />
    <Sign id="billboard" s={34} title="MIAMI|AFTER HOURS" subtitle="VICE NIGHTS · DEMO EVENT" color="#303f56" onClick={onAdClick} night={night} />
    <Sign id="buena" s={84} title="BUENA ONDA|RECORD STORE" subtitle="VINYL · MUSIC · GOOD COMPANY" color="#245d58" onClick={onAdClick} night={night} />
    <Sign id="branches" s={144} title="BRANCHES|VINTAGE" subtitle="CLOTHING WITH A PAST" color="#78464b" onClick={onAdClick} night={night} />
    <FacadeSign s={95} title="BUENA ONDA" subtitle="RECORDS & GOOD COMPANY" color="#245d58" night={night} />
    <FacadeSign s={155} title="BRANCHES VINTAGE" subtitle="ORIGINAL FINDS · EST. 1984" color="#78464b" night={night} />
    <FacadeSign s={46} title="OCEAN PALMS" subtitle="HOTEL · MIAMI BEACH" color="#56697b" night={night} />
    <FacadeSign s={124} title="CAFE SOL" subtitle="COFFEE · BREAKFAST · SUNSHINE" color="#815f43" night={night} />
    <EventBanner night={night} />
  </group>
}
