'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { BoxGeometry, BufferGeometry, CircleGeometry, CylinderGeometry, DoubleSide, ExtrudeGeometry, Group, MathUtils, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Object3D, Quaternion, Shape, SphereGeometry, TorusGeometry, Vector3 } from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { HERO_X } from '@/lib/cruise/constants'
import { routeCurvature } from '@/lib/cruise/routePath'
import type { HeroCarProps } from './HeroCar'
import { useCockpit } from './CockpitContext'
import PhysicalRadio from './PhysicalRadio'
import { jeepTextures } from './jeepTextures'

type V3 = [number, number, number]
const WHEEL_RADIUS = .394
const WHEELS: { name: string; position: V3; side: number }[] = [
  { name: 'FL_WHEEL', position: [-.855, .438, -1.19], side: -1 },
  { name: 'FR_WHEEL', position: [.855, .438, -1.19], side: 1 },
  { name: 'RL_WHEEL', position: [-.855, .438, 1.15], side: -1 },
  { name: 'RR_WHEEL', position: [.855, .438, 1.15], side: 1 },
]

function resources() {
  const maps = jeepTextures()
  const geometries = new Map<string, BufferGeometry>()
  const standard = (color: string, roughness = .7, metalness = 0) => new MeshStandardMaterial({ color, roughness, metalness })
  const mats = {
    paint: new MeshPhysicalMaterial({ color: '#e3e1d4', roughness: .3, metalness: .42, clearcoat: .8, clearcoatRoughness: .16, envMapIntensity: .9 }),
    vinyl: new MeshStandardMaterial({ color: '#46504a', roughness: .87, bumpMap: maps.rubber, bumpScale: .0035, envMapIntensity: .55 }),
    rubber: new MeshStandardMaterial({ color: '#181e1c', roughness: .97, bumpMap: maps.rubber, bumpScale: .005 }),
    black: standard('#151e1c', .65, .16),
    metal: standard('#929a91', .31, .83),
    steel: standard('#454d49', .67, .7),
    silver: standard('#c1c7bd', .28, .75),
    cloth: new MeshStandardMaterial({ map: maps.fabric, color: '#bfc4b4', roughness: .94, bumpMap: maps.fabric, bumpScale: .0015 }),
    seatSide: new MeshStandardMaterial({ color: '#778980', roughness: .77, bumpMap: maps.rubber, bumpScale: .0012 }),
    stitch: standard('#bdc3b3', .93),
    glass: new MeshPhysicalMaterial({ color: '#c1dbd4', roughness: .09, metalness: .04, transparent: true, opacity: .14, depthWrite: false, side: DoubleSide }),
    lens: new MeshStandardMaterial({ color: '#e9e7ce', roughness: .23, metalness: .12, emissive: '#ffe2b1', emissiveIntensity: .12 }),
    amber: new MeshStandardMaterial({ color: '#d58832', roughness: .28, emissive: '#ffa52b', emissiveIntensity: .2 }),
    red: new MeshStandardMaterial({ color: '#922621', roughness: .29, emissive: '#ff3b23', emissiveIntensity: .18 }),
    navy: standard('#174657', .43, .1),
    teal: standard('#3b8d91', .48, .1),
    ochre: standard('#d6a36c', .54, .08),
    needle: new MeshStandardMaterial({ color: '#e09a69', emissive: '#f69e57', emissiveIntensity: .15, roughness: .54 }),
    mirror: standard('#aabdb9', .08, .97),
    controls: new MeshStandardMaterial({ map: maps.controls, transparent: true, roughness: .9, emissiveMap: maps.controls, emissive: '#abc9b0', emissiveIntensity: .05 }),
    badge: new MeshStandardMaterial({ map: maps.badge, transparent: true, roughness: .62, depthWrite: false }),
    shift: new MeshStandardMaterial({ map: maps.shift, transparent: true, roughness: .9 }),
    speed: new MeshStandardMaterial({ map: maps.speed, emissiveMap: maps.speed, emissive: '#d4eac4', emissiveIntensity: .08, roughness: .76 }),
    rpm: new MeshStandardMaterial({ map: maps.rpm, emissiveMap: maps.rpm, emissive: '#d4eac4', emissiveIntensity: .08, roughness: .76 }),
    fuel: new MeshStandardMaterial({ map: maps.fuel, emissiveMap: maps.fuel, emissive: '#d4eac4', emissiveIntensity: .08, roughness: .76 }),
    temp: new MeshStandardMaterial({ map: maps.temp, emissiveMap: maps.temp, emissive: '#d4eac4', emissiveIntensity: .08, roughness: .76 }),
    oil: new MeshStandardMaterial({ map: maps.oil, emissiveMap: maps.oil, emissive: '#d4eac4', emissiveIntensity: .08, roughness: .76 }),
    volts: new MeshStandardMaterial({ map: maps.volts, emissiveMap: maps.volts, emissive: '#d4eac4', emissiveIntensity: .08, roughness: .76 }),
  }
  function geometry(key: string, create: () => BufferGeometry) { if (!geometries.has(key)) geometries.set(key, create()); return geometries.get(key)! }
  const box = (size: V3, radius = .006) => geometry(`box:${size}:${radius}`, () => new RoundedBoxGeometry(...size, 2, Math.min(radius, ...size.map(x => x / 2.1))))
  const cylinder = geometry('cylinder', () => new CylinderGeometry(1, 1, 1, 20))
  const sphere = geometry('sphere', () => new SphereGeometry(1, 20, 12))
  const circle = geometry('circle', () => new CircleGeometry(1, 48))
  const ring = (radius: number, tube: number) => geometry(`ring:${radius}:${tube}`, () => new TorusGeometry(radius, tube, 8, 48))
  const sideShape = (key: string, points: [number, number][], width: number) => geometry(key, () => {
    const shape = new Shape(); points.forEach(([z, y], i) => { if (i === 0) shape.moveTo(z, y); else shape.lineTo(z, y) }); shape.closePath()
    const geo = new ExtrudeGeometry(shape, { depth: width, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: .008, bevelThickness: .005 })
    geo.rotateY(-Math.PI / 2); geo.translate(width / 2, 0, 0); return geo
  })
  const rearQuarter = sideShape('rear-quarter', [[.57,.68],[.69,.68],[.84,.96],[1.46,.96],[1.62,.68],[1.80,.68],[1.80,1.24],[.57,1.24]], .055)
  const flare = sideShape('flare', [[-.58,.60],[-.48,.86],[-.32,1.01],[.32,1.01],[.49,.85],[.59,.60],[.50,.60],[.42,.81],[.28,.94],[-.28,.94],[-.41,.81],[-.50,.60]], .19)
  const tread = geometry('tread', () => {
    const parts: BufferGeometry[] = []
    for (let i = 0; i < 40; i++) for (let row = 0; row < 3; row++) {
      const angle = (i + (row === 1 ? .45 : 0)) / 40 * Math.PI * 2
      const g = new BoxGeometry(.076, .019, .047)
      g.rotateY(row === 1 ? -.18 : .18); g.translate((row - 1) * .082, .387, 0); g.rotateX(angle); parts.push(g)
    }
    const merged = mergeGeometries(parts); parts.forEach(g => g.dispose()); return merged
  })
  return { maps, mats, geometries, box, cylinder, sphere, circle, ring, rearQuarter, flare, tread }
}
type Assets = ReturnType<typeof resources>
type Mat = keyof Assets['mats']

function Part({ a, size, at = [0, 0, 0], rotation, material = 'paint', radius = .006 }: { a: Assets; size: V3; at?: V3; rotation?: V3; material?: Mat; radius?: number }) {
  return <mesh dispose={null} geometry={a.box(size, radius)} material={a.mats[material]} position={at} rotation={rotation} castShadow receiveShadow />
}
function Rod({ a, from, to, radius = .02, material = 'black' }: { a: Assets; from: V3; to: V3; radius?: number; material?: Mat }) {
  const start = new Vector3(...from), end = new Vector3(...to), vector = end.clone().sub(start)
  const rotation = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), vector.clone().normalize())
  return <mesh dispose={null} geometry={a.cylinder} material={a.mats[material]} position={start.add(end).multiplyScalar(.5)} quaternion={rotation} scale={[radius, vector.length(), radius]} castShadow />
}
function Bolt({ a, at, rotation = [Math.PI / 2, 0, 0] }: { a: Assets; at: V3; rotation?: V3 }) {
  return <mesh dispose={null} geometry={a.cylinder} material={a.mats.steel} position={at} rotation={rotation} scale={[.011, .006, .011]} />
}
function Wheel({ a, side = 1 }: { a: Assets; side?: number }) {
  return <group>
    <mesh dispose={null} geometry={a.ring(.297, .087)} material={a.mats.rubber} rotation={[0, Math.PI / 2, 0]} scale={[1, 1, 1.52]} castShadow />
    <mesh dispose={null} geometry={a.tread} material={a.mats.rubber} castShadow />
    <mesh dispose={null} geometry={a.cylinder} material={a.mats.steel} rotation={[0, 0, Math.PI / 2]} scale={[.224, .21, .224]} />
    <mesh dispose={null} geometry={a.cylinder} material={a.mats.silver} position={[side * .117, 0, 0]} rotation={[0, 0, Math.PI / 2]} scale={[.205, .025, .205]} />
    <mesh dispose={null} geometry={a.ring(.203, .014)} material={a.mats.metal} position={[side * .137, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
    <mesh dispose={null} geometry={a.ring(.258, .003)} material={a.mats.steel} position={[side * .124, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
    <mesh dispose={null} geometry={a.cylinder} material={a.mats.black} position={[side * .145, 0, 0]} rotation={[0, 0, Math.PI / 2]} scale={[.074, .043, .074]} />
    {Array.from({ length: 8 }, (_, i) => { const angle = i / 8 * Math.PI * 2; return <mesh key={i} dispose={null} geometry={a.cylinder} material={a.mats.black} position={[side * .133, Math.sin(angle) * .149, Math.cos(angle) * .149]} rotation={[0, 0, Math.PI / 2]} scale={[.024, .004, .035]} /> })}
    {Array.from({ length: 5 }, (_, i) => { const angle = i / 5 * Math.PI * 2; return <mesh key={i} dispose={null} geometry={a.cylinder} material={a.mats.metal} position={[side * .167, Math.sin(angle) * .085, Math.cos(angle) * .085]} rotation={[0, 0, Math.PI / 2]} scale={[.014, .012, .014]} /> })}
  </group>
}

function Seat({ a, x }: { a: Assets; x: number }) {
  return <group position={[x, 0, .32]} name={x < 0 ? 'IslandDriverSeat' : 'IslandPassengerSeat'}>
    <Part a={a} size={[.38, .23, .42]} at={[0, .75, .04]} material="black" radius={.012} />
    <Part a={a} size={[.52, .15, .59]} at={[0, .935, .02]} material="seatSide" radius={.06} />
    <Part a={a} size={[.335, .045, .45]} at={[0, 1.012, -.005]} material="cloth" radius={.017} />
    <group position={[0, 1.32, .29]} rotation={[-.13, 0, 0]}>
      <Part a={a} size={[.52, .63, .17]} material="seatSide" radius={.065} />
      <Part a={a} size={[.335, .48, .035]} at={[0, -.015, -.089]} material="cloth" radius={.025} />
      {[-.20,.20].map(side => <Part key={side} a={a} size={[.063,.52,.047]} at={[side,0,-.08]} material="seatSide" radius={.025} />)}
      {[-.142, .142].map(side => <Part key={side} a={a} size={[.003,.47,.003]} at={[side,0,-.11]} material="stitch" radius={.001} />)}
      {[-.095,.095].map(side => <Rod key={side} a={a} from={[side,.29,0]} to={[side,.43,0]} radius={.012} material="steel" />)}
      <Part a={a} size={[.34, .22, .16]} at={[0,.43,0]} material="seatSide" radius={.055} />
    </group>
    {[-.14,.14].map(side => <Part key={side} a={a} size={[.003,.003,.39]} at={[side,1.037,-.005]} material="stitch" radius={.001} />)}
    <Part a={a} size={[.045,.045,.085]} at={[x < 0 ? .29 : -.29,1.0,.19]} material="black" />
    <Part a={a} size={[.026,.007,.038]} at={[x < 0 ? .29 : -.29,1.026,.20]} material="red" />
  </group>
}

function Gauge({ a, at, radius, dial, pointer = .8, dynamic }: { a: Assets; at: V3; radius: number; dial: 'speed' | 'rpm' | 'fuel' | 'temp' | 'oil' | 'volts'; pointer?: number; dynamic?: React.RefObject<Group> }) {
  return <group position={at}>
    <mesh dispose={null} geometry={a.cylinder} material={a.mats.black} rotation={[Math.PI / 2, 0, 0]} scale={[radius + .011,.025,radius + .011]} />
    <mesh dispose={null} geometry={a.ring(radius + .003,.006)} material={a.mats.steel} position-z={.017} />
    <mesh dispose={null} geometry={a.circle} material={a.mats[dial]} position-z={.018} scale={radius} />
    <group ref={dynamic} position-z={.021} rotation-z={pointer}>
      <Part a={a} size={[.0035,radius*.8,.0025]} at={[0,radius*.31,0]} material="needle" radius={.001} />
    </group>
    <mesh dispose={null} geometry={a.cylinder} material={a.mats.black} position-z={.025} rotation={[Math.PI / 2,0,0]} scale={[radius*.095,.01,radius*.095]} />
  </group>
}

function Dashboard({ a, night, steering, speedNeedle, rpmNeedle }: { a: Assets; night: boolean; steering: React.RefObject<Group>; speedNeedle: React.RefObject<Group>; rpmNeedle: React.RefObject<Group> }) {
  const cockpit = useCockpit()
  return <group name="IslandTrailCockpit">
    {/* Narrow, upright painted cowl and padded dash, specific to the open vehicle. */}
    <Part a={a} size={[1.47,.46,.11]} at={[0,1.15,-.642]} radius={.013} />
    <Part a={a} size={[1.44,.096,.17]} at={[0,1.395,-.645]} material="vinyl" radius={.025} />
    <Part a={a} size={[1.36,.012,.02]} at={[0,1.341,-.561]} material="black" radius={.003} />
    <Part a={a} size={[1.39,.275,.11]} at={[0,1.195,-.55]} material="vinyl" radius={.012} />
    <Part a={a} size={[.535,.225,.052]} at={[-.416,1.23,-.475]} material="black" radius={.028} />
    <Gauge a={a} at={[-.555,1.245,-.44]} radius={.087} dial="speed" dynamic={speedNeedle} />
    <Gauge a={a} at={[-.324,1.245,-.44]} radius={.078} dial="rpm" dynamic={rpmNeedle} />
    <Part a={a} size={[.502,.012,.018]} at={[-.427,1.139,-.442]} material="steel" radius={.003} />
    {(['fuel','temp','oil','volts'] as const).map((dial,i) => <Gauge key={dial} a={a} at={[-.10+i*.112,1.284,-.479]} radius={.041} dial={dial} pointer={[-.45,.16,-.20,.17][i]} />)}
    <Part a={a} size={[.374,.143,.036]} at={[.055,1.125,-.535]} material="black" radius={.008} />
    <PhysicalRadio position={[.055,1.125,-.50]} night={night} />
    {/* Embossed climate lettering and three physical slider tracks. */}
    <Part a={a} size={[.275,.15,.036]} at={[-.383,1.017,-.516]} material="black" />
    <mesh dispose={null} geometry={a.box([.257,.127,.001],.0001)} material={a.mats.controls} position={[-.383,1.02,-.495]} />
    {[.057,.012,-.033].map((y,i) => <group key={y} position={[-.358,.996+y,-.486]}>
      <Part a={a} size={[.147,.004,.005]} material="steel" radius={.001} />
      <Part a={a} size={[.017,.011,.012]} at={[-.06+i*.04,0,.006]} material="silver" radius={.003} />
    </group>)}
    {/* Recessed passenger tray, grab handle and separate glove box. */}
    <Part a={a} size={[.30,.115,.015]} at={[.506,1.27,-.483]} material="black" radius={.008} />
    <Part a={a} size={[.31,.018,.05]} at={[.506,1.211,-.458]} material="vinyl" />
    <Part a={a} size={[.39,.20,.035]} at={[.468,1.049,-.537]} material="black" radius={.008} />
    <Part a={a} size={[.368,.178,.016]} at={[.468,1.049,-.514]} material="vinyl" radius={.005} />
    <Part a={a} size={[.052,.017,.018]} at={[.468,1.108,-.499]} material="steel" />
    <Rod a={a} from={[.34,1.16,-.473]} to={[.63,1.16,-.473]} radius={.018} material="rubber" />
    {[.34,.63].map(x => <Rod key={x} a={a} from={[x,1.16,-.54]} to={[x,1.16,-.473]} radius={.019} />)}
    {[-.689,.689].map(x => <group key={x} position={[x,1.215,-.477]}>
      <Part a={a} size={[.044,.156,.02]} material="black" />
      {Array.from({length:7},(_,i) => <Part key={i} a={a} size={[.037,.005,.012]} at={[0,-.061+i*.02,.009]} material="steel" radius={.001} />)}
    </group>)}
    {[-.65,.265,.683].flatMap(x => [1.07,1.335].map(y => <Bolt key={`${x}-${y}`} a={a} at={[x,y,-.484]} />))}
    <group position={[-.60,1.028,-.453]} onClick={event => { event.stopPropagation(); cockpit?.toggleLights() }}>
      <Part a={a} size={[.083,.075,.045]} material="black" />
      <mesh dispose={null} geometry={a.cylinder} material={a.mats.rubber} rotation={[Math.PI/2,0,0]} position-z={.032} scale={[.019,.028,.019]} />
      <Part a={a} size={[.004,.012,.003]} at={[0,.008,.048]} material="stitch" radius={.001} />
    </group>
    <Rod a={a} from={[-.43,1.06,-.49]} to={[-.43,1.29,-.157]} radius={.046} material="black" />
    <group position={[-.43,1.31,-.11]} rotation={[-.24,0,0]}>
      <group ref={steering} name="IslandSteeringWheel">
        <mesh dispose={null} geometry={a.ring(.196,.0145)} material={a.mats.rubber} castShadow />
        <mesh dispose={null} geometry={a.ring(.176,.004)} material={a.mats.steel} />
        {[Math.PI/2, -Math.PI/2, Math.PI].map(angle => <group key={angle} rotation-z={angle}>
          <Part a={a} size={[.041,.14,.012]} at={[0,.106,0]} material="silver" radius={.005} />
          <Part a={a} size={[.021,.06,.002]} at={[0,.118,.008]} material="steel" radius={.004} />
        </group>)}
        <mesh dispose={null} geometry={a.cylinder} material={a.mats.vinyl} rotation={[Math.PI/2,0,0]} scale={[.065,.035,.065]} />
        <mesh dispose={null} geometry={a.ring(.046,.002)} material={a.mats.steel} position-z={.02} />
        <Part a={a} size={[.025,.004,.002]} at={[0,0,.021]} material="silver" radius={.001} />
      </group>
      <Rod a={a} from={[-.035,-.012,-.078]} to={[-.235,.016,-.07]} radius={.007} material="steel" />
      <Part a={a} size={[.071,.016,.026]} at={[-.227,.016,-.07]} material="rubber" />
    </group>
    {/* Open footwells, rubber mats and the two mechanical shifters. */}
    {[-.43,.43].map(x => <group key={x}>
      <Part a={a} size={[.47,.016,.66]} at={[x,.704,-.25]} material="rubber" />
      {Array.from({length:10},(_,i) => <Part key={i} a={a} size={[.005,.006,.57]} at={[x-.205+i*.045,.716,-.25]} material="black" radius={.001} />)}
    </group>)}
    <Part a={a} size={[.265,.17,.83]} at={[0,.772,.045]} material="rubber" radius={.045} />
    {[0,1,2,3,4].map(i => <Part key={i} a={a} size={[.146-i*.02,.012,.144-i*.02]} at={[.015,.86+i*.015,-.09]} material="rubber" radius={.012} />)}
    <Rod a={a} from={[.015,.905,-.09]} to={[.055,1.175,-.025]} radius={.009} material="steel" />
    <mesh dispose={null} geometry={a.sphere} material={a.mats.black} position={[.055,1.181,-.025]} scale={[.035,.033,.035]} />
    <mesh dispose={null} geometry={a.circle} material={a.mats.shift} position={[.055,1.205,-.009]} rotation={[-1.05,0,0]} scale={.022} />
    <Part a={a} size={[.077,.045,.083]} at={[-.118,.854,.155]} material="rubber" radius={.012} />
    <Rod a={a} from={[-.118,.879,.155]} to={[-.13,1.01,.20]} radius={.009} material="steel" />
    <mesh dispose={null} geometry={a.sphere} material={a.mats.black} position={[-.13,1.019,.20]} scale={.026} />
    {[-.52,-.405,-.29].map((x,i) => <group key={x}>
      <Rod a={a} from={[x,.975,-.60]} to={[x,.777,-.41]} radius={.008} material="steel" />
      <Part a={a} size={[i===2?.043:.063,.025,.10]} at={[x,.787,-.38]} rotation={[.35,0,0]} material="rubber" radius={.008} />
    </group>)}
    {/* Stable light counts keep a mood switch from recompiling every lit material. */}
    <pointLight position={[0,1.37,-.12]} color="#b9d9bb" intensity={night?.075:0} distance={1.65} decay={2} />
  </group>
}

export default function RetroJeep({ runtime, quality, camera, timeOfDay, weather, onReady, paint = '#e3e1d4', parked = false }: HeroCarProps) {
  const a = useMemo(resources, [])
  const body = useRef<Group>(null), steering = useRef<Group>(null), speedNeedle = useRef<Group>(null), rpmNeedle = useRef<Group>(null)
  const wheels = useRef<(Group | null)[]>([]), angle = useRef(0)
  const cockpit = useCockpit(), night = timeOfDay === 'night'
  const lights = cockpit ? cockpit.lights : night || weather === 'rain'
  const lightTarget = useMemo(() => { const target = new Object3D(); target.position.set(0,.15,-22); return target }, [])
  useEffect(() => { onReady?.() }, [onReady])
  useEffect(() => { a.mats.paint.color.set(paint); a.mats.paint.roughness = weather === 'rain' ? .19 : .3 }, [a, paint, weather])
  useEffect(() => {
    a.mats.glass.opacity = camera === 'driver' ? .035 : .14
    a.mats.lens.emissiveIntensity = lights ? 2.6 : .08
    a.mats.amber.emissiveIntensity = lights ? .9 : .08
    for (const key of ['speed','rpm','fuel','temp','oil','volts','controls'] as const) a.mats[key].emissiveIntensity = night ? .64 : .05
    a.mats.needle.emissiveIntensity = night ? .55 : .08
    body.current?.traverse(object => { if (object instanceof Mesh) { object.castShadow = quality !== 'low'; object.receiveShadow = quality !== 'low' } })
  }, [a, camera, lights, night, quality])
  useEffect(() => () => { a.geometries.forEach(g => g.dispose()); Object.values(a.mats).forEach(m => m.dispose()); Object.values(a.maps).forEach(map => map.dispose()) }, [a])
  useFrame((_, dt) => {
    const speed = parked ? 0 : Math.max(0, runtime.current.speed), time = runtime.current.time
    angle.current = MathUtils.euclideanModulo(angle.current - speed * Math.min(dt,.05) / WHEEL_RADIUS, Math.PI*2)
    wheels.current.forEach(wheel => { if (wheel) wheel.rotation.x = angle.current })
    if (steering.current) steering.current.rotation.z = parked ? 0 : MathUtils.clamp(routeCurvature(runtime.current.distance)*18,-.28,.28)
    if (speedNeedle.current) speedNeedle.current.rotation.z = Math.PI*.75 - Math.min(speed*2.23694/100,1)*Math.PI*1.5
    if (rpmNeedle.current) rpmNeedle.current.rotation.z = Math.PI*.75 - (parked ? 0 : .16+speed/65)*Math.PI*1.5
    if (body.current) { body.current.position.y = parked ? 0 : Math.sin(time*5.2)*.003*Math.min(1,speed/12); body.current.rotation.z = parked ? 0 : Math.sin(time*2.5)*.0017 }
    a.mats.red.emissiveIntensity = parked ? .12 : time%19>16.8 ? 2.6 : lights ? 1 : .12
  })
  return <group name="HeroCar" position={[HERO_X,0,0]}>
    <group ref={body} name="IslandTrailOriginal">
      {/* Ladder frame, axles and open body tub. */}
      {[-.46,.46].map(x => <Part key={x} a={a} size={[.08,.12,3.42]} at={[x,.44,0]} material="steel" />)}
      {[-1.19,1.15].map(z => <group key={z}>
        <Rod a={a} from={[-.87,.405,z]} to={[.87,.405,z]} radius={.045} material="steel" />
        <mesh dispose={null} geometry={a.sphere} material={a.mats.black} position={[0,.405,z]} scale={[.16,.12,.11]} />
        {[-.47,.47].map(x => <Part key={x} a={a} size={[.065,.034,.66]} at={[x,.365,z]} material="steel" />)}
      </group>)}
      <Part a={a} size={[1.43,.09,2.47]} at={[0,.655,.54]} radius={.012} />
      <Part a={a} size={[1.40,.027,2.36]} at={[0,.713,.50]} material="rubber" />
      <Part a={a} size={[1.19,.43,1.14]} at={[0,1.045,-1.175]} radius={.045} />
      <Part a={a} size={[1.265,.075,1.15]} at={[0,1.287,-1.185]} radius={.035} />
      <Part a={a} size={[1.27,.012,.012]} at={[0,1.297,-.623]} material="black" radius={.002} />
      <Part a={a} size={[1.43,.075,.15]} at={[0,1.306,-.715]} radius={.017} />
      <Part a={a} size={[1.39,.52,.09]} at={[0,1.027,-1.773]} radius={.022} />
      <Part a={a} size={[.88,.42,.018]} at={[0,1.033,-1.827]} material="black" radius={.018} />
      {Array.from({length:8},(_,i) => <Part key={i} a={a} size={[.038,.427,.032]} at={[-.406+i*.116,1.033,-1.847]} radius={.017} />)}
      {[-1,1].map(side => <group key={side}>
        <Part a={a} size={[.283,.255,.034]} at={[side*.58,1.15,-1.83]} material="steel" radius={.031} />
        <Part a={a} size={[.235,.189,.029]} at={[side*.58,1.155,-1.855]} material="lens" radius={.03} />
        {Array.from({length:7},(_,i) => <Part key={i} a={a} size={[.004,.166,.002]} at={[side*.58-.089+i*.030,1.155,-1.872]} material="silver" radius={.001} />)}
        <Part a={a} size={[.16,.11,.022]} at={[side*.58,.924,-1.842]} material="amber" radius={.014} />
        <mesh dispose={null} geometry={a.flare} material={a.mats.rubber} position={[side*.786,0,-1.19]} castShadow />
        <mesh dispose={null} geometry={a.flare} material={a.mats.rubber} position={[side*.786,0,1.15]} castShadow />
        <Part a={a} size={[.32,.066,1.24]} at={[side*.724,1.018,-1.20]} radius={.023} />
        <Part a={a} size={[.33,.08,.10]} at={[side*.718,.970,-1.813]} radius={.014} />
        <Part a={a} size={[.028,.061,.14]} at={[side*.887,1.064,-1.50]} material="amber" radius={.012} />
        <Part a={a} size={[.054,.50,1.20]} at={[side*.724,.955,-.025]} radius={.018} />
        <mesh dispose={null} geometry={a.rearQuarter} material={a.mats.paint} position-x={side*.724} castShadow />
        <Part a={a} size={[.095,.029,2.32]} at={[side*.723,1.241,.63]} material="vinyl" radius={.01} />
        {/* Door seam, external hinges, rubber sill, and simple original coastal stripes. */}
        <Part a={a} size={[.004,.36,.006]} at={[side*.756,.99,.543]} material="steel" radius={.001} />
        <Part a={a} size={[.004,.39,.006]} at={[side*.756,.98,-.576]} material="steel" radius={.001} />
        {[-.52,.47].map(z => <Part key={z} a={a} size={[.018,.047,.10]} at={[side*.761,.81,z]} material="steel" radius={.004} />)}
        <Part a={a} size={[.019,.06,.124]} at={[side*.759,1.143,.385]} material="black" radius={.01} />
        <Part a={a} size={[.014,.015,.078]} at={[side*.774,1.151,.385]} material="steel" radius={.005} />
        <Part a={a} size={[.17,.07,1.09]} at={[side*.78,.640,.0]} material="rubber" radius={.019} />
        {(['navy','teal','ochre'] as const).map((material,i) => <Part key={material} a={a} size={[.004,.022,1.12]} at={[side*.756,.745+i*.036,-.02]} material={material} radius={.001} />)}
        <mesh dispose={null} geometry={a.box([.56,.143,.001],.0001)} material={a.mats.badge} position={[side*.756,.95,.035]} rotation={[0,side*Math.PI/2,0]} />
        <mesh dispose={null} geometry={a.box([.65,.116,.001],.0001)} material={a.mats.badge} position={[side*.641,1.211,-1.185]} rotation={[0,side*Math.PI/2,0]} />
        {/* Exposed side mirror arm and painted door inner face. */}
        <Rod a={a} from={[side*.72,1.30,-.54]} to={[side*.96,1.49,-.57]} radius={.013} material="steel" />
        <Part a={a} size={[.148,.205,.045]} at={[side*.981,1.545,-.565]} material="black" radius={.022} />
        <Part a={a} size={[.123,.177,.004]} at={[side*.981,1.545,-.54]} material="mirror" radius={.016} />
        <Part a={a} size={[.018,.283,1.03]} at={[side*.686,1.017,-.015]} material="vinyl" radius={.008} />
        <Rod a={a} from={[side*.652,1.08,-.16]} to={[side*.652,1.08,.07]} radius={.021} material="rubber" />
        <Part a={a} size={[.035,.09,.17]} at={[side*.658,.949,.34]} material="black" radius={.009} />
        <Rod a={a} from={[side*.66,.946,.37]} to={[side*.63,.984,.31]} radius={.009} material="metal" />
        {/* Hood latch and exterior windshield hinge. */}
        <Part a={a} size={[.022,.106,.025]} at={[side*.643,1.235,-1.49]} material="rubber" radius={.004} />
        <Part a={a} size={[.035,.018,.064]} at={[side*.642,1.30,-1.49]} material="steel" />
        <Part a={a} size={[.12,.10,.031]} at={[side*.670,1.338,-.661]} material="steel" radius={.007} />
        <Bolt a={a} at={[side*.670,1.338,-.681]} />
      </group>)}
      <Part a={a} size={[1.91,.13,.17]} at={[0,.66,-1.929]} material="black" radius={.016} />
      <Part a={a} size={[1.69,.125,.15]} at={[0,.636,1.844]} material="black" radius={.015} />
      {[-.48,.48].map(x => <Rod key={x} a={a} from={[x,.66,-1.985]} to={[x,.77,-1.985]} radius={.018} material="steel" />)}
      <Part a={a} size={[1.47,.52,.075]} at={[0,.994,1.801]} radius={.012} />
      {[-.631,.631].map(x => <group key={x}>
        <Part a={a} size={[.16,.205,.058]} at={[x,1.04,1.862]} material="black" radius={.018} />
        <Part a={a} size={[.129,.123,.017]} at={[x,1.066,1.90]} material="red" radius={.014} />
        <Part a={a} size={[.124,.034,.017]} at={[x,.981,1.90]} material="lens" radius={.005} />
      </group>)}
      <Part a={a} size={[.35,.17,.015]} at={[-.43,.738,1.905]} material="silver" radius={.005} />
      <mesh dispose={null} geometry={a.box([.32,.10,.002],.0001)} material={a.mats.badge} position={[-.43,.744,1.915]} />
      <group position={[.15,1.115,1.974]} rotation={[0,-Math.PI/2,0]}><Wheel a={a} side={1} /></group>
      {/* Slim upright windshield frame: cabin remains physically open to the sky. */}
      <group position={[0,1.711,-.542]} rotation={[.281,0,0]}>
        {[-.713,.713].map(x => <Part key={x} a={a} size={[.056,.746,.049]} at={[x,0,0]} material="paint" radius={.012} />)}
        {[-.351,.351].map(y => <Part key={y} a={a} size={[1.425,.049,.049]} at={[0,y,0]} material="paint" radius={.012} />)}
        {[-.674,.674].map(x => <Part key={x} a={a} size={[.022,.630,.037]} at={[x,.017,.01]} material="rubber" radius={.008} />)}
        {[-.299,.330].map(y => <Part key={y} a={a} size={[1.357,.023,.037]} at={[0,y,.01]} material="rubber" radius={.008} />)}
      </group>
      <group name="IslandWindshield" position={[0,1.711,-.542]} rotation={[.281,0,0]}>
        <mesh dispose={null} geometry={a.box([1.327,.599,.004],.025)} material={a.mats.glass} position={[0,.017,.034]} />
      </group>
      {/* Roll hoop and triangulated rear braces. */}
      {[-.65,.65].map(x => <group key={x}>
        <Rod a={a} from={[x,.88,.73]} to={[x,2.02,.64]} radius={.041} material="rubber" />
        <Rod a={a} from={[x,1.98,.70]} to={[x,1.23,1.69]} radius={.039} material="rubber" />
        <Rod a={a} from={[x,2.04,.61]} to={[x,2.071,-.41]} radius={.026} material="black" />
        <Part a={a} size={[.061,.59,.011]} at={[x,1.40,.647]} rotation={[-.08,0,0]} material="vinyl" />
        <Part a={a} size={[.081,.092,.025]} at={[x,1.69,.61]} material="steel" radius={.006} />
      </group>)}
      <Rod a={a} from={[-.65,2.025,.64]} to={[.65,2.025,.64]} radius={.044} material="rubber" />
      <Seat a={a} x={-.43} /><Seat a={a} x={.43} />
      <Part a={a} size={[1.12,.14,.47]} at={[0,.94,1.25]} material="seatSide" radius={.045} />
      <Part a={a} size={[1.10,.36,.13]} at={[0,1.16,1.57]} material="seatSide" radius={.038} />
      <Part a={a} size={[.99,.035,.33]} at={[0,1.017,1.24]} material="cloth" radius={.02} />
      <Part a={a} size={[.99,.26,.022]} at={[0,1.18,1.495]} material="cloth" radius={.017} />
      <Dashboard a={a} night={night} steering={steering} speedNeedle={speedNeedle} rpmNeedle={rpmNeedle} />
      <Rod a={a} from={[0,2.00,-.409]} to={[0,1.898,-.350]} radius={.008} material="steel" />
      <Part a={a} size={[.265,.080,.025]} at={[0,1.899,-.339]} material="black" radius={.013} />
      <Part a={a} size={[.246,.060,.003]} at={[0,1.899,-.324]} material="mirror" radius={.009} />
      {[-.40,.38].map(x => <group key={x}>
        <Rod a={a} from={[x+.15,1.399,-.675]} to={[x-.065,1.427,-.655]} radius={.005} material="steel" />
        <Rod a={a} from={[x-.245,1.433,-.65]} to={[x+.15,1.447,-.646]} radius={.006} material="rubber" />
      </group>)}
    </group>
    {WHEELS.map((wheel,index) => <group key={wheel.name} name={wheel.name} position={wheel.position} ref={node => { wheels.current[index] = node }}><Wheel a={a} side={wheel.side} /></group>)}
    <group><primitive object={lightTarget} /><spotLight position={[0,1.03,-1.92]} target={lightTarget} intensity={lights?(night?7:3):0} color="#ffe3b4" distance={38} decay={1.6} angle={.48} penumbra={.7} /></group>
  </group>
}
