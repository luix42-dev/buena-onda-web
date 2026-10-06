'use client'
import { RoundedBox } from '@react-three/drei'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { CanvasTexture, Group, SRGBColorSpace, Vector3 } from 'three'
import { RADIO_PRESETS, useCockpit } from './CockpitContext'

/** One period head unit; all operations go to the existing audio owner. Front is +Z. */
export default function PhysicalRadio({ position = [0,0,0], rotation = [0,0,0], scale = 1, night = false }: { position?: [number,number,number]; rotation?: [number,number,number]; scale?: number; night?: boolean }) {
  const controls = useCockpit(), volume = useRef<Group>(null), seek = useRef<Group>(null), buttons = useRef<Group>(null), root = useRef<Group>(null)
  const drag = useRef<{y:number; value:number; moved:boolean}|null>(null)
  const { size, camera } = useThree()
  const projected = useMemo(() => new Vector3(), [])
  const lastProjection = useRef(0)
  const art = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width=1536; canvas.height=512
    const texture = new CanvasTexture(canvas); texture.colorSpace=SRGBColorSpace; texture.anisotropy=8
    return {canvas,texture}
  }, [])
  const audio = controls?.audio
  useEffect(() => {
    const c = art.canvas.getContext('2d')!
    c.fillStyle='#212522'; c.fillRect(0,0,1536,512)
    c.fillStyle='#bebeb0'; c.font='600 46px monospace'; c.textAlign='center'; c.fillText('BUENA ONDA RADIO',768,62)
    c.fillStyle='#090f0d'; c.fillRect(287,88,962,212); c.strokeStyle='#717366';c.lineWidth=4;c.strokeRect(287,88,962,212)
    c.fillStyle=audio?.error?'#f39871':'#dfc57e'; c.font='bold 73px monospace'
    c.fillText((audio?.station.name || 'BUENA ONDA').toUpperCase(),768,179,885)
    c.font='32px monospace'; c.fillStyle='#b7ba89'
    c.fillText(audio?.error?'UNAVAILABLE - RETRY':audio?.loading?'CONNECTING':audio?.playing?(audio.muted?'PLAYING / MUTED':'PLAYING / INTERNET RADIO'):'SELECTED / POWER OFF',768,254)
    c.fillStyle='#ccc9b7';c.font='31px monospace'; c.fillText('POWER / VOL',146,411);c.fillText('SEEK',1390,411)
    c.font='29px monospace'; ['1 ONDA','2 JOLT','3 NTS 1','4 NTS 2'].forEach((label,i)=>c.fillText(label,408+i*236,442))
    c.fillStyle='#6d7368';c.font='23px monospace';c.fillText('AUTO REVERSE  /  STEREO',768,494)
    art.texture.needsUpdate=true
  },[art,audio?.station.name,audio?.error,audio?.loading,audio?.playing,audio?.muted])
  useEffect(()=>()=>art.texture.dispose(),[art])
  useFrame(({clock})=>{
    if(volume.current)volume.current.rotation.z=2.35-(audio?.volume||0)*4.7
    if(seek.current)seek.current.rotation.z=controls?.command?.action==='tuning' ? -.4 : 0
    if(buttons.current)buttons.current.position.z=controls?.command?.action==='preset' ? -.004 : 0
    if(root.current && controls?.focusRadio && clock.elapsedTime-lastProjection.current>.1){
      lastProjection.current=clock.elapsedTime
      const point=(x:number,y:number,z:number)=>{projected.set(x,y,z);root.current!.localToWorld(projected);projected.project(camera);return {x:(projected.x+1)*size.width/2,y:(1-projected.y)*size.height/2}}
      document.documentElement.dataset.physicalRadioHit=JSON.stringify(point(0,0,.04))
      document.documentElement.dataset.physicalRadioControls=JSON.stringify({volume:point(-.139,.006,.063),seek:point(.139,.006,.063),presets:RADIO_PRESETS.map((_,i)=>point(-.081+i*.0525,-.026,.052))})
    }
  })
  const hover=(on:boolean)=>{document.body.style.cursor=on?'pointer':''}
  useEffect(()=>()=>hover(false),[])
  function activate(e:ThreeEvent<MouseEvent>, operation:()=>void){e.stopPropagation();if(!controls?.radioFocused)controls?.focusRadio?.();else operation()}
  return <group ref={root} name="BuenaOndaPhysicalRadio" position={position} rotation={rotation} scale={scale}>
    <RoundedBox args={[.35,.126,.075]} radius={.007} smoothness={2}><meshStandardMaterial color="#242924" metalness={.22} roughness={.68}/></RoundedBox>
    <mesh position={[0,0,.038]} onClick={e=>activate(e,()=>{})} onPointerOver={()=>hover(true)} onPointerOut={()=>hover(false)}><planeGeometry args={[.342,.12]}/><meshStandardMaterial map={art.texture} emissiveMap={art.texture} emissive="#ffffff" emissiveIntensity={night?.85:.35} roughness={.73}/></mesh>
    {[-.139,.139].map((x,i)=><group key={x} position={[x,.006,.047]}>
      <mesh rotation-x={Math.PI/2}><cylinderGeometry args={[.022,.024,.015,32]}/><meshStandardMaterial color="#0c100f" roughness={.83}/></mesh>
      <group ref={i===0?volume:seek}>
        <mesh rotation-x={Math.PI/2}><cylinderGeometry args={[.019,.019,.022,32]}/><meshStandardMaterial color="#4c5049" metalness={.35} roughness={.52}/></mesh>
        <mesh position={[0,.013,.012]}><boxGeometry args={[.002,.009,.002]}/><meshBasicMaterial color="#e4d2a1"/></mesh>
      </group>
      <mesh name={i===0?'PhysicalVolumeKnob':'PhysicalSeekKnob'} position-z={.016}
        onPointerOver={()=>hover(true)} onPointerOut={()=>{if(!drag.current)hover(false)}}
        onPointerDown={e=>{e.stopPropagation(); if(i!==0||!controls?.radioFocused)return;drag.current={y:e.clientY,value:audio?.volume||0,moved:false};(e.target as unknown as Element).setPointerCapture?.(e.pointerId)}}
        onPointerMove={e=>{if(!drag.current)return;e.stopPropagation();const change=(drag.current.y-e.clientY)/150; if(Math.abs(change)>.015)drag.current.moved=true;controls?.operateRadio('volume',Math.max(0,Math.min(1,drag.current.value+change)))}}
        onPointerUp={e=>{e.stopPropagation();(e.target as unknown as Element).releasePointerCapture?.(e.pointerId);const moved=drag.current?.moved;drag.current=null;if(!moved){if(!controls?.radioFocused)controls?.focusRadio?.();else controls?.operateRadio(i===0?'power':'seek',1)}}}
        onPointerCancel={()=>{drag.current=null}}>
        <boxGeometry args={[.052,.052,.04]}/><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false}/>
      </mesh>
    </group>)}
    <group ref={buttons}>{RADIO_PRESETS.map((station,i)=><mesh key={station.id} name={`PhysicalPreset${i+1}`} position={[-.081+i*.0525,-.026,.045]} onPointerOver={()=>hover(true)} onPointerOut={()=>hover(false)} onClick={e=>activate(e,()=>controls?.operateRadio('preset',station.id))}><boxGeometry args={[.047,.013,.011]}/><meshStandardMaterial color={audio?.stationId===station.id?'#968c65':'#4d534c'} metalness={.25} roughness={.62}/></mesh>)}</group>
    {[-1,1].flatMap(x=>[-1,1].map(y=><mesh key={`${x}${y}`} position={[x*.166,y*.053,.039]}><circleGeometry args={[.0023,12]}/><meshStandardMaterial color="#94958b" metalness={.7} roughness={.48}/></mesh>))}
  </group>
}
