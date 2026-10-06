'use client'
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as T from 'three'
import { CRUISE_PLACES, placeCampaign, type CruisePlace } from '@/lib/cruise/campaigns'
import { CRUISE_ROUTE } from '@/lib/cruise/routes'
import { routeRelativePose } from '@/lib/cruise/routePath'
import { moduleZ } from '@/lib/cruise/constants'
import { trackCruiseEvent } from '@/lib/cruise/analytics'
import type { CruiseRuntime, CruiseTimeOfDay } from '@/lib/cruise/types'

/** Authored shopfront art, shared by each shop's dimensional shell. No remote creative fetching. */
function facadeTexture(place: CruisePlace) {
  const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=512
  const c=canvas.getContext('2d')!;const campaign=placeCampaign(place);const art=campaign.creatives.billboard
  c.fillStyle=art.background;c.fillRect(0,0,1536,512)
  c.fillStyle=art.foreground;c.fillRect(0,0,1536,120)
  c.fillStyle=art.background;c.textAlign='center';c.font='bold 60px Georgia'
  c.fillText(place.id==='records'?'BUENA ONDA RECORDS':place.id==='branches'?'BRANCHES VINTAGE HOUSE':campaign.name.toUpperCase(),768,78,1440)
  // Windows have warm interiors, mullions and deliberately composed merchandise.
  for(let i=0;i<5;i++){
    const x=24+i*302;const grad=c.createLinearGradient(0,150,0,485);grad.addColorStop(0,'#a9845d');grad.addColorStop(.25,'#392f29');grad.addColorStop(1,'#121f22')
    c.fillStyle=grad;c.fillRect(x,152,280,325);c.strokeStyle='#b99e75';c.lineWidth=8;c.strokeRect(x,152,280,325)
    c.fillStyle='#dfbe86';c.fillRect(x+14,160,252,8)
    if(place.id==='records'){
      for(let row=0;row<2;row++)for(let k=0;k<3;k++){
        c.fillStyle=['#986752','#6a8681','#c2a275'][(k+i+row)%3];c.fillRect(x+16+k*82,225+row*110,68,76)
        c.fillStyle='#1b2424';c.beginPath();c.arc(x+50+k*82,260+row*110,25,0,Math.PI*2);c.fill();c.fillStyle='#c1a668';c.beginPath();c.arc(x+50+k*82,260+row*110,7,0,Math.PI*2);c.fill()
      }
    }else if(place.id==='branches'){
      c.fillStyle='#b7875f';c.fillRect(x+40,359,192,18);c.fillRect(x+51,377,12,72);c.fillRect(x+210,377,12,72)
      c.fillStyle='#d7b87a';c.beginPath();c.ellipse(x+90,325,27,35,0,0,7);c.fill();c.fillStyle='#71876d';c.beginPath();c.ellipse(x+180,332,35,26,0,0,7);c.fill()
      c.strokeStyle='#d0ab6f';c.lineWidth=6;c.strokeRect(x+75,197,127,100);c.fillStyle='#788879';c.fillRect(x+84,207,109,80)
    }else{
      c.fillStyle='#8caa9c';c.fillRect(x+45,205,185,190);c.fillStyle='#e5c7a1';c.fillRect(x+45,205,34,190);c.fillRect(x+196,205,34,190)
      c.fillStyle='#293e41';c.fillRect(x+118,205,5,190)
    }
    c.fillStyle='rgba(199,228,220,.10)';c.beginPath();c.moveTo(x+15,165);c.lineTo(x+180,165);c.lineTo(x+70,465);c.lineTo(x+15,465);c.fill()
  }
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;return texture
}
function signTexture(place:CruisePlace){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=384;const c=canvas.getContext('2d')!;const art=placeCampaign(place).creatives.billboard
  c.fillStyle=art.background;c.fillRect(0,0,768,384);c.strokeStyle=art.accent;c.lineWidth=10;c.strokeRect(15,15,738,354)
  c.textAlign='center';c.fillStyle=art.accent;c.font='22px monospace';c.fillText(place.status==='sponsored'?'SPONSORED':place.status==='demo'?'HOUSE CONCEPT':'BUENA ONDA · MIAMI',384,69)
  c.fillStyle=art.foreground;c.font='bold 66px Georgia';c.fillText(place.id==='records'?'BUENA ONDA':art.headline,384,167,690)
  c.font='30px monospace';c.fillText(place.id==='records'?'RECORD STORE':place.id==='branches'?'VINTAGE HOUSE':'MOTEL / VACANCY',384,230,690)
  c.fillStyle=art.accent;c.font='21px monospace';c.fillText('TAKE THE LONG WAY HOME',384,319)
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;return texture
}
function Landmark({place,runtime,night,signRef}:{place:CruisePlace;runtime:MutableRefObject<CruiseRuntime>;night:boolean;signRef:(mesh:T.Mesh|null)=>void}){
  const group=useRef<T.Group>(null);const index=CRUISE_ROUTE.findIndex(m=>m.id===place.anchor.moduleId)
  const art=useMemo(()=>({facade:facadeTexture(place),sign:signTexture(place)}),[place])
  const campaign=placeCampaign(place)
  useEffect(()=>{let alive=true;let texture:T.Texture|undefined;const url=campaign.billboardImage
    if(url?.startsWith('/cruise/campaigns/')&&!url.includes('..'))new T.TextureLoader().load(url,t=>{if(!alive){t.dispose();return}texture=t;t.colorSpace=T.SRGBColorSpace;art.sign.image=t.image;art.sign.needsUpdate=true})
    return()=>{alive=false;texture?.dispose();art.facade.dispose();art.sign.dispose()}
  },[art,campaign])
  useFrame(()=>{if(group.current){
    const localZ=moduleZ(index,runtime.current.distance)+place.anchor.localZ
    const pose=routeRelativePose(runtime.current.distance,localZ,place.anchor.x)
    group.current.position.set(pose.x,0,pose.z);group.current.rotation.y=pose.yaw
    group.current.visible=localZ<95&&localZ>-360
  }})
  const motel=place.id==='tideway';const width=motel?25:18;const height=motel?7.5:4.8
  return <group ref={group} position={[place.anchor.x,0,moduleZ(index,runtime.current.distance)+place.anchor.localZ]}>
    {/* A real turnout connects each parking apron to the road; commercial clusters stay on land. */}
    <mesh position={[0,.035,1]} rotation-x={-Math.PI/2}><planeGeometry args={[width+12,42]}/><meshStandardMaterial color="#5c635f" roughness={.96}/></mesh>
    <mesh position={[-Math.sign(place.anchor.x)*(Math.abs(place.anchor.x)-10)/2,.045,17]} rotation-x={-Math.PI/2}><planeGeometry args={[Math.abs(place.anchor.x)-10,7]}/><meshStandardMaterial color="#626966" roughness={.95}/></mesh>
    <mesh position={[0,.16,0]}><boxGeometry args={[width+1.2,.3,11]}/><meshStandardMaterial color="#d5c6ad" roughness={.9}/></mesh>
    <mesh userData={{cruiseOccluder:true}} position={[0,height/2,0]}><boxGeometry args={[width,height,8]}/><meshStandardMaterial color={place.id==='branches'?'#b6aa8e':'#ddd2b4'} roughness={.88}/></mesh>
    <mesh position={[0,height+.16,0]}><boxGeometry args={[width+1.4,.32,9.4]}/><meshStandardMaterial color="#ded0b3" roughness={.78}/></mesh>
    <mesh position={[0,2.45,4.035]}><planeGeometry args={[width-.3,4.5]}/><meshStandardMaterial map={art.facade} emissiveMap={art.facade} emissive="#ffe4b3" emissiveIntensity={night?.62:.08} roughness={.72}/></mesh>
    {motel&&<mesh position={[0,6.05,4.045]}><planeGeometry args={[width-.3,3]}/><meshStandardMaterial map={art.facade} emissiveMap={art.facade} emissive="#ffc986" emissiveIntensity={night?.45:.06} roughness={.85}/></mesh>}
    {/* Canopy, slim posts, fascia, parking paint and individual fixtures add human scale. */}
    <mesh position={[0,3.85,5.05]} rotation-x={.14}><boxGeometry args={[width+.7,.13,2.5]}/><meshStandardMaterial color={place.id==='branches'?'#526d57':'#408e89'} roughness={.8}/></mesh>
    <mesh position={[0,3.69,6.25]}><boxGeometry args={[width+.7,.42,.13]}/><meshStandardMaterial color={place.id==='branches'?'#3b5845':'#32746f'} roughness={.8}/></mesh>
    {[-1,1].map(side=><group key={side}>
      <mesh position={[side*(width/2-.3),1.8,5.7]}><cylinderGeometry args={[.08,.08,3.6,8]}/><meshStandardMaterial color="#ddd0b2" roughness={.7}/></mesh>
      <mesh position={[side*(width/2+1.3),.53,5.5]}><boxGeometry args={[1.5,1,1.7]}/><meshStandardMaterial color="#b99c75" roughness={.9}/></mesh>
      <mesh position={[side*(width/2+1.3),1.08,5.5]}><sphereGeometry args={[.83,7,5]}/><meshStandardMaterial color="#3d664e" roughness={1}/></mesh>
      <mesh position={[side*width*.33,3.43,4.4]}><boxGeometry args={[1.6,.07,.32]}/><meshStandardMaterial color="#f4d49e" emissive="#ffc880" emissiveIntensity={night?1.8:.1}/></mesh>
    </group>)}
    {[-6,-2,2,6].map(x=><mesh key={x} position={[x,.055,11]} rotation-x={-Math.PI/2}><planeGeometry args={[.1,5]}/><meshStandardMaterial color="#d4cdb8" roughness={1}/></mesh>)}
    <group position-x={place.anchor.signX??0}>
      <mesh position={[0,place.anchor.signX?(height+2)/2:height+2,2]}><cylinderGeometry args={[.11,.13,place.anchor.signX?height+2:4,8]}/><meshStandardMaterial color="#66716b" roughness={.7}/></mesh>
      <mesh position={[0,height+3,2]}><boxGeometry args={[9.6,4.8,.3]}/><meshStandardMaterial color="#263e3c" roughness={.65}/></mesh>
      <mesh ref={signRef} position={[0,height+3,2.17]}><planeGeometry args={[9.3,4.5]}/><meshStandardMaterial map={art.sign} emissiveMap={art.sign} emissive="#ffdbb0" emissiveIntensity={night?.65:.1} roughness={.7}/></mesh>
    </group>
    {motel&&<><mesh position={[0,4.25,5.1]}><boxGeometry args={[width+1,.18,2.2]}/><meshStandardMaterial color="#d2c2a3" roughness={.9}/></mesh>{[-10,-5,0,5,10].map(x=><mesh key={x} position={[x,5.05,6.15]}><boxGeometry args={[.07,1.6,.07]}/><meshStandardMaterial color="#73857a"/></mesh>)}<mesh position={[0,5.83,6.15]}><boxGeometry args={[width,.07,.07]}/><meshStandardMaterial color="#73857a"/></mesh></>}
  </group>
}

export default function PlaceLandmarks({runtime,timeOfDay,onNearbyPlace,enabled=true}:{runtime:MutableRefObject<CruiseRuntime>;timeOfDay:CruiseTimeOfDay;onNearbyPlace?:(id:string|null)=>void;enabled?:boolean}){
  const signs=useRef<Array<T.Mesh|null>>([]);const nearby=useRef<string|null>(null)
  const states=useRef(CRUISE_PLACES.map(()=>({seconds:0,qualified:false,batch:0,lastEmit:0,clear:false,lastOcclusion:0})))
  const scratch=useMemo(()=>({frustum:new T.Frustum(),matrix:new T.Matrix4(),position:new T.Vector3(),normal:new T.Vector3(),toward:new T.Vector3(),quaternion:new T.Quaternion(),ray:new T.Raycaster(),sample:new T.Vector3(),direction:new T.Vector3(),hits:[] as T.Intersection[],blockers:[] as T.Object3D[],scanAt:0}),[])
  const flush=(i:number)=>{const s=states.current[i],p=CRUISE_PLACES[i];if(s.batch>0){trackCruiseEvent('cruise_place_exposure',{place_id:p.id,placement_id:p.placementId,campaign_id:placeCampaign(p).id,status:p.status,visible_seconds:Math.round(s.batch*100)/100,measurement:'estimated_visible_duration_occlusion_sampled',occlusion_tested:true,occlusion_samples:3});s.batch=0}}
  useEffect(()=>{const reset=()=>{if(document.hidden){states.current.forEach((s,i)=>{flush(i);s.seconds=0;s.qualified=false});onNearbyPlace?.(null);nearby.current=null}};document.addEventListener('visibilitychange',reset);return()=>{document.removeEventListener('visibilitychange',reset);states.current.forEach((_,i)=>flush(i))}},[]) // one physical approach owns its durations
  useFrame(({camera,scene,clock},delta)=>{
    if(document.hidden)return;const step=Math.min(delta,.1);const s=scratch
    s.frustum.setFromProjectionMatrix(s.matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse))
    // Cache only marked opaque building batches, not the cabin, ground or foliage.
    if(clock.elapsedTime>=s.scanAt){
      s.blockers.length=0;scene.traverse(object=>{if(object.userData.cruiseOccluder)s.blockers.push(object)})
      s.scanAt=clock.elapsedTime+.5
    }
    let candidate:string|null=null;let nearest=Infinity
    CRUISE_PLACES.forEach((place,i)=>{
      const sign=signs.current[i];if(!sign)return;sign.updateWorldMatrix(true,false);sign.getWorldPosition(s.position);sign.getWorldQuaternion(s.quaternion)
      const distance=camera.position.distanceTo(s.position);const facing=s.normal.set(0,0,1).applyQuaternion(s.quaternion).dot(s.toward.copy(camera.position).sub(s.position).normalize())
      const area=9.3*4.5*camera.projectionMatrix.elements[0]*camera.projectionMatrix.elements[5]/(4*Math.max(1,distance*distance))*Math.max(0,facing)
      const state=states.current[i]
      const projected=enabled&&distance<180&&facing>.16&&area>.0015&&s.frustum.containsPoint(s.position)
      if(projected&&clock.elapsedTime>=state.lastOcclusion){
        state.lastOcclusion=clock.elapsedTime+.25;state.clear=false
        // Three points span the sign: a completely blocked sign never qualifies.
        const blockers=s.blockers.filter(object=>{
          if(object instanceof T.InstancedMesh&&object.count===0)return false
          let ancestor:T.Object3D|null=object
          while(ancestor){if(!ancestor.visible)return false;ancestor=ancestor.parent}
          object.updateWorldMatrix(true,false)
          return true
        })
        for(const x of [0,-3.5,3.5]){
          s.sample.set(x,0,.04).applyMatrix4(sign.matrixWorld)
          s.direction.copy(s.sample).sub(camera.position)
          s.ray.set(camera.position,s.direction.normalize());s.ray.far=camera.position.distanceTo(s.sample)-.08
          let blocked=false
          for(const blocker of blockers){
            s.hits.length=0;s.ray.intersectObject(blocker,false,s.hits)
            if(s.hits.length){blocked=true;break}
          }
          if(!blocked){state.clear=true;break}
        }
      }
      if(!projected)state.clear=false
      const visible=projected&&state.clear
      if(visible){state.seconds+=step;if(state.seconds>=2){state.batch+=state.qualified?step:state.seconds;state.qualified=true}}
      else{flush(i);state.seconds=0;state.qualified=false}
      state.lastEmit+=step;if(state.lastEmit>=30){flush(i);state.lastEmit=0}
      // DOM discovery uses a broader approach window, independent of sign clickability.
      if(s.position.z<15&&s.position.z>-155&&distance<nearest){nearest=distance;candidate=place.id}
    })
    if(candidate!==nearby.current){nearby.current=candidate;onNearbyPlace?.(candidate)}
  })
  return <group>{CRUISE_PLACES.map((place,i)=><Landmark key={place.id} place={place} runtime={runtime} night={timeOfDay==='night'} signRef={mesh=>{signs.current[i]=mesh}}/>)}</group>
}
