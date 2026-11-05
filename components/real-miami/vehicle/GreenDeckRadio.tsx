'use client'
import {RoundedBox} from '@react-three/drei'
import {useFrame,useThree,type ThreeEvent} from '@react-three/fiber'
import {useEffect,useMemo,useRef} from 'react'
import {CanvasTexture,Group,SRGBColorSpace,Vector3} from 'three'
import {RADIO_PRESETS,useCockpit} from './CockpitContext'
import {stationWebsite} from '@/lib/human-radio/station-site'

const KEYS=Array.from({length:6},(_,i)=>({x:.044+(i%3)*.035,y:-.016-Math.floor(i/3)*.026}))
const texture=(width:number,height:number)=>{const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const map=new CanvasTexture(canvas);map.colorSpace=SRGBColorSpace;map.anisotropy=8;return {canvas,map}}

/** Countach design preview: cassette-era green display and preset bank, using the existing radio owner. */
export default function GreenDeckRadio({position=[0,0,0],rotation=[0,0,0],scale=1,night=false}:{position?:[number,number,number];rotation?:[number,number,number];scale?:number;night?:boolean}){
 const controls=useCockpit(),audio=controls?.audio,presets=(controls?.presets||RADIO_PRESETS).slice(0,6)
 const website=stationWebsite(audio?.station)
 const root=useRef<Group>(null),volume=useRef<Group>(null),seek=useRef<Group>(null),drag=useRef<{y:number;value:number;moved:boolean}|null>(null),lastProjection=useRef(0)
 const {camera,size}=useThree(),projected=useMemo(()=>new Vector3(),[])
 const art=useMemo(()=>({labels:texture(2048,738),display:texture(1024,340),keys:KEYS.map(()=>texture(128,80))}),[])
 useEffect(()=>{
  const c=art.labels.canvas.getContext('2d')!,w=2048,h=738
  c.clearRect(0,0,w,h)
  const at=(x:number,y:number)=>[(x/.35+.5)*w,(.5-y/.126)*h]
  const text=(label:string,x:number,y:number,font:string,color='#cbd4c5')=>{c.font=font;c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';const [px,py]=at(x,y);c.fillText(label,px,py)}
  text('BUENA ONDA',-.008,.053,'italic 700 57px Georgia','#e7eddc')
  text('BO-84',.139,.052,'600 24px monospace','#a6b49d')
  text('PWR / VOL',-.14,-.031,'600 23px monospace','#cbd4c5')
  text('SEEK',.143,-.003,'600 23px monospace','#cbd4c5')
  text('STEREO CASSETTE',-.071,.014,'500 19px monospace','#9ba895')
  text('AUTO REVERSE',-.065,-.058,'500 19px monospace','#9ba895')
  art.labels.map.needsUpdate=true
 },[art])
 useEffect(()=>{
  const c=art.display.canvas.getContext('2d')!,w=1024,h=340,on=!!audio?.requested
  const gradient=c.createLinearGradient(0,0,0,h);gradient.addColorStop(0,on?'#123b2a':'#15261b');gradient.addColorStop(1,on?'#1d5130':'#17291d');c.fillStyle=gradient;c.fillRect(0,0,w,h)
  // Faint LCD cells give the display its period texture without inventing a frequency or track.
  c.fillStyle='#a3e27d0c';for(let x=18;x<w;x+=13)for(let y=18;y<h;y+=17)c.fillRect(x,y,8,11)
  c.fillStyle=on?'#b5ff8b':'#607d54';c.textAlign='left';c.textBaseline='middle'
  c.font='600 31px monospace'
  const status=audio?.error?'SIGNAL LOST':audio?.loading?'TUNING':!on?'POWER OFF':audio?.muted?'MUTE':'STEREO'
  c.fillText('NET',34,39);c.textAlign='right';c.fillText(status,w-34,39);c.textAlign='left'
  const name=(audio?.station.name||'BUENA ONDA').toUpperCase();let font=110
  do{c.font=`700 ${font}px monospace`;font-=2}while(c.measureText(name).width>w-68&&font>45)
  c.fillText(name,34,143,w-68)
  c.font='600 37px monospace';c.fillText(on?(audio?.trackTitle||'LIVE RADIO').toUpperCase():'TAKE THE LONG WAY',34,244,w-68)
  c.fillStyle=on?'#91d36c':'#48633e';c.fillRect(34,294,w-68,2)
  art.display.map.needsUpdate=true
 },[art,audio?.station.name,audio?.trackTitle,audio?.requested,audio?.loading,audio?.error,audio?.muted])
 useEffect(()=>{
  for(let i=0;i<6;i++){
   const key=art.keys[i],c=key.canvas.getContext('2d')!
   c.clearRect(0,0,128,80);c.fillStyle='#11251b';c.font='700 46px monospace';c.textAlign='center';c.textBaseline='middle';c.fillText(String(i+1),64,42);key.map.needsUpdate=true
  }
 },[art])
 useEffect(()=>()=>{art.labels.map.dispose();art.display.map.dispose();art.keys.forEach(key=>key.map.dispose());document.body.style.cursor=''},[art])
 useFrame(()=>{
  if(volume.current)volume.current.rotation.z=2.35-(audio?.volume||0)*4.7
  if(seek.current)seek.current.rotation.z=controls?.command?.action==='tuning'?-.35:0
  const projectionTime=performance.now()
  if(!root.current||projectionTime-lastProjection.current<100)return
  lastProjection.current=projectionTime
  const point=(x:number,y:number,z:number)=>{projected.set(x,y,z);root.current!.localToWorld(projected);projected.project(camera);return {x:(projected.x+1)*size.width/2,y:(1-projected.y)*size.height/2}}
  document.documentElement.dataset.physicalRadioHit=JSON.stringify(point(-.047,-.022,.045))
  document.documentElement.dataset.physicalRadioStationHit=JSON.stringify(point(-.048,-.019,.059))
  const corners=[point(-.18,.065,.073),point(.18,.065,.073),point(-.18,-.065,.073),point(.18,-.065,.073)]
  document.documentElement.dataset.physicalRadioBounds=JSON.stringify({at:performance.now(),left:Math.min(...corners.map(p=>p.x)),right:Math.max(...corners.map(p=>p.x)),top:Math.min(...corners.map(p=>p.y)),bottom:Math.max(...corners.map(p=>p.y))})
  document.documentElement.dataset.physicalRadioControls=JSON.stringify({volume:point(-.14,.012,.073),seek:point(.143,.029,.073),presets:presets.map((_,i)=>point(KEYS[i].x,KEYS[i].y,.06))})
  document.documentElement.dataset.radioDesign='green-deck-preview'
 })
 const hover=(on:boolean)=>{document.body.style.cursor=on?'pointer':''}
 const activate=(event:ThreeEvent<MouseEvent>,action:()=>void)=>{event.stopPropagation();if(!controls?.radioFocused)controls?.focusRadio?.();else action()}
 return <group ref={root} name="BuenaOndaGreenDeck" position={position} rotation={rotation} scale={scale}>
  <RoundedBox args={[.357,.132,.078]} radius={.006} smoothness={2}><meshStandardMaterial name="RadioCase" color="#101714" metalness={.32} roughness={.65}/></RoundedBox>
  <RoundedBox args={[.343,.120,.009]} position-z={.041} radius={.003} smoothness={2}><meshStandardMaterial name="RadioBezel" color="#151d19" metalness={.2} roughness={.72}/></RoundedBox>
  <mesh position-z={.047}><planeGeometry args={[.35,.126]}/><meshBasicMaterial map={art.labels.map} transparent depthWrite={false} toneMapped={false}/></mesh>
  {/* Recessed cassette mouth; its lip, slot and eject key are physical geometry. */}
  <RoundedBox args={[.182,.019,.006]} position={[-.019,.032,.047]} radius={.002} smoothness={1}><meshStandardMaterial color="#050907" roughness={.9}/></RoundedBox>
  <mesh position={[-.021,.032,.051]}><planeGeometry args={[.158,.006]}/><meshBasicMaterial color="#010402"/></mesh>
  <mesh position={[-.021,.040,.052]}><boxGeometry args={[.169,.001,.002]}/><meshStandardMaterial color="#5b6860" metalness={.75} roughness={.4}/></mesh>
  <RoundedBox args={[.025,.016,.009]} position={[.089,.032,.050]} radius={.002} smoothness={1}><meshStandardMaterial color="#26382a" roughness={.6}/></RoundedBox>
  <mesh position={[.089,.033,.056]}><coneGeometry args={[.003,.005,3]}/><meshBasicMaterial color="#a6d784"/></mesh>
  {/* Green LCD in a deep black surround, independent of scene exposure. */}
  <RoundedBox args={[.137,.050,.005]} position={[-.048,-.023,.048]} radius={.002} smoothness={1}><meshStandardMaterial color="#020704" roughness={.5}/></RoundedBox>
  <mesh position={[-.048,-.023,.052]} onClick={e=>activate(e,()=>{})} onPointerOver={()=>hover(true)} onPointerOut={()=>hover(false)}><planeGeometry args={[.129,.043]}/><meshBasicMaterial map={art.display.map} color={night?'#ffffff':'#d6e4c8'} toneMapped={false}/></mesh>
  {website&&<mesh name="PhysicalStationWebsite" position={[-.048,-.019,.059]} onClick={e=>activate(e,()=>window.open(website,'_blank','noopener,noreferrer'))} onPointerOver={()=>hover(true)} onPointerOut={()=>hover(false)}><planeGeometry args={[.125,.019]}/><meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false}/></mesh>}
  {presets.map((station,i)=>{const key=KEYS[i],active=audio?.stationId===station.id;return <group key={station.id} position={[key.x,key.y,.049]}>
   <RoundedBox args={[.032,.022,.012]} radius={.002} smoothness={1} onClick={e=>activate(e,()=>controls?.operateRadio('preset',station.id))} onPointerOver={()=>hover(true)} onPointerOut={()=>hover(false)}><meshStandardMaterial name="IlluminatedPreset" color={active?'#a6df70':'#76aa55'} emissive={active?'#85bd50':'#385f28'} emissiveIntensity={active?.7:.35} roughness={.5}/></RoundedBox>
   <mesh position-z={.0065} onClick={e=>activate(e,()=>controls?.operateRadio('preset',station.id))}><planeGeometry args={[.028,.019]}/><meshBasicMaterial map={art.keys[i].map} transparent depthWrite={false} toneMapped={false}/></mesh>
  </group>})}
  {[-.14,.143].map((x,i)=><group key={x} position={[x,i?.029:.012,.052]}>
   <mesh rotation-x={Math.PI/2}><cylinderGeometry args={[i?.020:.024,i?.021:.025,.016,40]}/><meshStandardMaterial name="RadioKnobRim" color="#59685b" metalness={.85} roughness={.33}/></mesh>
   <group ref={i?seek:volume}>
    <mesh rotation-x={Math.PI/2} position-z={.007}><cylinderGeometry args={[i?.017:.021,i?.018:.022,.021,40]}/><meshStandardMaterial name="RadioKnobRubber" color="#17201a" roughness={.78}/></mesh>
    <mesh position={[0,i?.012:.015,.019]}><boxGeometry args={[.0016,.006,.001]}/><meshBasicMaterial color="#b5e896" toneMapped={false}/></mesh>
   </group>
   <mesh name={i?'PhysicalSeekKnob':'PhysicalVolumeKnob'} position-z={.016} onPointerOver={()=>hover(true)} onPointerOut={()=>{if(!drag.current)hover(false)}}
    onPointerDown={e=>{e.stopPropagation();if(i||!controls?.radioFocused)return;drag.current={y:e.clientY,value:audio?.volume||0,moved:false};(e.target as unknown as Element).setPointerCapture?.(e.pointerId)}}
    onPointerMove={e=>{if(!drag.current)return;e.stopPropagation();const change=(drag.current.y-e.clientY)/150;if(Math.abs(change)>.015)drag.current.moved=true;controls?.operateRadio('volume',Math.max(0,Math.min(1,drag.current.value+change)))}}
    onPointerUp={e=>{e.stopPropagation();(e.target as unknown as Element).releasePointerCapture?.(e.pointerId);const moved=drag.current?.moved;drag.current=null;if(moved)return;if(!controls?.radioFocused)controls?.focusRadio?.();else controls?.operateRadio(i?'seek':'power',1)}} onPointerCancel={()=>{drag.current=null}}>
    <boxGeometry args={[i?.046:.055,i?.046:.055,.045]}/><meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false}/>
   </mesh>
  </group>)}
  {[-1,1].flatMap(x=>[-1,1].map(y=><mesh key={`${x}${y}`} position={[x*.169,y*.057,.047]}><circleGeometry args={[.0018,10]}/><meshStandardMaterial color="#708075" metalness={.7} roughness={.45}/></mesh>))}
 </group>
}
