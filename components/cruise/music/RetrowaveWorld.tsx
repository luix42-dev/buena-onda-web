'use client'
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Color, Fog, type PointsMaterial } from 'three'
import type { CruiseRuntime } from '@/lib/cruise/types'
import type { MusicAudio } from '@/lib/cruise/music-audio'

const vertex = `varying vec2 v; void main(){v=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`
const grid = `
  varying vec2 v; uniform float travel; uniform float kick; uniform float energy; uniform float snare;
  void main(){
    vec2 p=vec2((v.x-.5)*400., v.y*600.-travel);
    vec2 cell=abs(fract(p/5.-.5)-.5)/max(fwidth(p/5.),vec2(.001));
    float line=1.-min(min(cell.x,cell.y),1.);
    float forward=v.y*600.;
    float wave=exp(-pow((forward-(1.-kick)*170.)/9.,2.))*kick;
    float road=1.-smoothstep(7.6,8.,abs(p.x));
    float edge=exp(-pow((abs(p.x)-8.)/.13,2.));
    vec3 ink=mix(vec3(.008,.001,.018),vec3(.012,.002,.033),road);
    vec3 neon=mix(vec3(.37,.012,.65),vec3(.02,.64,.9),road);
    vec3 c=ink+neon*line*(.17+energy*.95+wave*2.)+vec3(.8,.025,.3)*edge*(.6+snare);
    c*=1.-smoothstep(220.,530.,forward);
    gl_FragColor=vec4(c,1.);
    #include <colorspace_fragment>
  }`
const sun = `varying vec2 v; uniform float energy; uniform float phrase;
  void main(){vec2 p=v-.5; if(length(p)>.5) discard; if(v.y<.48 && fract(v.y*17.)<.20) discard;
    vec3 c=mix(vec3(.95,.018,.32),vec3(1.,.63,.13),v.y); gl_FragColor=vec4(c*(.55+energy*.4+phrase*.12),1.);
    #include <colorspace_fragment>
  }`
export default function RetrowaveWorld({ runtime, music, reducedMotion }: { runtime: MutableRefObject<CruiseRuntime>; music: MusicAudio; reducedMotion: boolean }) {
  const { scene } = useThree()
  useEffect(() => {
    scene.background = new Color('#06020f'); scene.fog = new Fog('#06020f',160,480)
    // The Miami environment owner has unmounted; never retain its disposed PMREM.
    scene.environment = null
    return () => { scene.background = null; scene.fog = null; scene.environment = null }
  }, [scene])
  const stars = useMemo(() => {
    const positions = new Float32Array(240*3)
    for(let i=0;i<240;i++) { positions[i*3] = ((i*137.508)%460)-230; positions[i*3+1] = 24+(i*37.31)%160; positions[i*3+2] = -300-(i*17.17)%90 }
    return positions
  }, [])
  const starMaterial = useRef<PointsMaterial>(null)
  const uniforms = useMemo(() => ({ travel: { value: 0 }, kick: { value: 0 }, snare: { value: 0 }, energy: { value: 0 }, phrase: { value: 0 } }), [])
  const mountains = useMemo(() => Array.from({ length: 18 }, (_, i) => ({ x: (i % 2 ? -1 : 1)*(22+(i%5)*19), z: -50-Math.floor(i/2)*30, h: 8+(i*13%27) })), [])
  useFrame(() => {
    const s=music.director.signal
    uniforms.travel.value=runtime.current.distance
    uniforms.kick.value=reducedMotion ? 0 : s.kick
    uniforms.snare.value=reducedMotion ? 0 : s.snare
    uniforms.energy.value=reducedMotion ? .2 : s.energy
    uniforms.phrase.value=reducedMotion ? 0 : s.phrase
    if(starMaterial.current) starMaterial.current.opacity=.25+(reducedMotion ? 0 : s.shimmer*.7)
  })
  return <group>
    <points><bufferGeometry><bufferAttribute attach="attributes-position" args={[stars,3]} /></bufferGeometry><pointsMaterial ref={starMaterial} color="#b5dfff" size={.6} transparent opacity={.25} depthWrite={false} /></points>
    <hemisphereLight args={['#9d79ff', '#160822', 1.5]} />
    <directionalLight position={[-12, 18, -40]} color="#ff618a" intensity={2.2} />
    <directionalLight position={[15, 6, 5]} color="#38d9ff" intensity={1.6} />
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.035,-280]}>
      <planeGeometry args={[400,600]} /><shaderMaterial vertexShader={vertex} fragmentShader={grid} uniforms={uniforms} toneMapped={false} />
    </mesh>
    <mesh position={[0,58,-360]}><planeGeometry args={[120,120]} /><shaderMaterial vertexShader={vertex} fragmentShader={sun} uniforms={uniforms} toneMapped={false} transparent /></mesh>
    {mountains.map((m,i)=><mesh key={i} position={[m.x,m.h/2,m.z]} rotation={[0,i*.7,0]}>
      <coneGeometry args={[18,m.h,4,1]} /><meshBasicMaterial color={i%2 ? '#672790' : '#124766'} wireframe />
    </mesh>)}
  </group>
}
