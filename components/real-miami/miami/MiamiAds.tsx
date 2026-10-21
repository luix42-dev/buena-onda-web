'use client'
import{useEffect,useMemo,useRef,type MutableRefObject}from'react'
import{useFrame,useThree,type ThreeEvent}from'@react-three/fiber'
import * as T from'three'
import{MeshBVH}from'three-mesh-bvh'
import type{CruiseCampaign}from'@/lib/cruise/types'
import{createMiamiAdPlacements,heroCreative,type MiamiAdPlacement,type MiamiAdSample,type MiamiAdRoute}from'@/lib/real-miami/advertising'
import{cruiseLookEnabled,LOOK}from'@/lib/cruise-os/look'
import{createWetStreaks,type WetLight}from'./wetStreaks'
import type{MiamiGeoData}from'@/lib/real-miami/miami-geo'
import type{NightState}from'../nightdrive/state'

type AdMeasurementPerformance={measurements:number;averageMs:number;maxMs:number;lastMs:number;lastRayCount:number;lastBlockerCount:number;bvhGeometries:number;bvhBuildMs:number}
declare global{interface Window{__miamiAds?:()=>{placements:MiamiAdPlacement[];samples:MiamiAdSample[];performance:AdMeasurementPerformance}}}
const actualVisible=(object:T.Object3D)=>{let node:T.Object3D|null=object;while(node){if(!node.visible)return false;node=node.parent}return true}
type OccluderDiagnostic={probe:[number,number];mesh:string;material:string;distance:number;uv:[number,number]|null;transparent:boolean;opacity:number;alphaTest:number;depthWrite:boolean;colorWrite:boolean;transmission:number;map:boolean;alphaMap:boolean}
const hitMaterial=(hit:T.Intersection)=>{const mesh=hit.object as T.Mesh;return Array.isArray(mesh.material)?mesh.material[hit.face?.materialIndex||0]:mesh.material}
const opaqueMaterial=(material:T.Material)=>{
 if(!material.visible||material.colorWrite===false||material.blending===T.AdditiveBlending||(material.transparent&&material.opacity<.2)||('transmission'in material&&Number(material.transmission)>.05))return false
 const surface=material as T.MeshStandardMaterial
 // Native Fiero Corpus_1/door_2 use this clear, untextured GLB glass.
 // Its 0.709 BLEND overlay does not geometrically hide the billboard in the
 // rendered windshield. Preserve opaque pillars, frames and textured foliage.
 const clearNativeGlass=/^(glass|steklo)$/i.test(material.name)&&material.transparent&&material.opacity<.85&&material.alphaTest===0&&material.depthWrite===false&&!surface.map&&!surface.alphaMap
 return !clearNativeGlass
}
const rigidVehicle=(mesh:T.Mesh)=>{if(mesh instanceof T.SkinnedMesh||mesh instanceof T.InstancedMesh||Object.keys(mesh.geometry.morphAttributes).length||Array.isArray(mesh.material))return false;let node:T.Object3D|null=mesh;while(node){if(/^(Countach|Fiero|Cadillac|Wrangler)/i.test(node.name))return true;node=node.parent}return false}
type PrivateTree={tree:MeshBVH;geometry:T.BufferGeometry}
type OcclusionObject={mesh:T.Mesh;inverse:T.Matrix4;box:T.Box3;tree?:MeshBVH;sourceGeometry?:T.BufferGeometry;instanceVersion?:number;instanceCount?:number}
function drawCreative(canvas:HTMLCanvasElement,placement:MiamiAdPlacement,image?:HTMLImageElement){
 const c=canvas.getContext('2d')!,w=canvas.width,h=canvas.height,creative=placement.campaign.creatives[placement.format==='poster'?'poster':'billboard']
 c.fillStyle=placement.kind==='house'?'#f2e6cc':creative.background;c.fillRect(0,0,w,h)
 if(image){const ratio=Math.max(w/image.naturalWidth,h/image.naturalHeight),iw=image.naturalWidth*ratio,ih=image.naturalHeight*ratio;c.drawImage(image,(w-iw)/2,(h-ih)/2,iw,ih);c.fillStyle='#101919bb';c.fillRect(0,h-54,w,54)}
 else{
  c.fillStyle=placement.kind==='house'?'#243933':creative.foreground;c.font='600 27px Outfit, Arial, sans-serif';c.fillText('BUENA ONDA',42,52)
  const words=placement.headline.toUpperCase().split(/\s+/),lines:string[]=[];let line=''
  c.font='600 96px Outfit, Arial, sans-serif'
  for(const word of words){const next=line?line+' '+word:word;if(c.measureText(next).width>w-84&&line){lines.push(line);line=word}else line=next}if(line)lines.push(line)
  const font=Math.min(96,200/Math.max(1,lines.length));c.font=`600 ${font}px Outfit, Arial, sans-serif`;lines.slice(0,3).forEach((text,i)=>c.fillText(text,40,132+i*(font+8),w-80))
  c.fillStyle=placement.kind==='house'?'#9b5c3f':creative.accent;c.fillRect(42,h-75,70,3);c.font='500 30px Outfit, Arial, sans-serif';c.fillText(placement.cta,130,h-64,w-180)
 }
 c.fillStyle=image?'#f2e6cc':'#59635c';c.font='18px Outfit, Arial, sans-serif';c.fillText(`${placement.kind.toUpperCase()} / ${placement.id}`,42,h-22,w-84)
}
function AdFace({placement,onActivate,enabled,night,active,video,look}:{placement:MiamiAdPlacement;onActivate:(placement:MiamiAdPlacement)=>void;enabled:boolean;night:MutableRefObject<number>;active:MutableRefObject<string|null>;video:boolean;look:boolean}){
 if(placement.surface==='hero')return <HeroFace placement={placement} onActivate={onActivate} enabled={enabled} night={night}/>
 if(placement.surface==='projection')return <ProjectionFace placement={placement} onActivate={onActivate} enabled={enabled} night={night} active={active} video={video}/>
 if(placement.surface==='blade')return <BladeFace placement={placement} onActivate={onActivate} enabled={enabled} night={night}/>
 return <BoardFace placement={placement} onActivate={onActivate} enabled={enabled} glow={look?.85:.36}/>
}
function BoardFace({placement,onActivate,enabled,glow=.36}:{placement:MiamiAdPlacement;onActivate:(placement:MiamiAdPlacement)=>void;enabled:boolean;glow?:number}){
 const texture=useMemo(()=>{const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=422;drawCreative(canvas,placement);const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;return map},[placement])
 useEffect(()=>{let alive=true,loadedImage:HTMLImageElement|undefined;void document.fonts.ready.then(()=>{if(alive){drawCreative(texture.image,placement,loadedImage);texture.needsUpdate=true}});const imageUrl=placement.campaign.billboardImage||placement.campaign.digitalFallbackImage;let image:HTMLImageElement|undefined;if(imageUrl){image=new Image();image.onload=()=>{if(alive){loadedImage=image;drawCreative(texture.image,placement,loadedImage);texture.needsUpdate=true}};image.src=imageUrl}return()=>{alive=false;if(image)image.onload=null;texture.dispose()}},[texture,placement])
 const activate=(event:ThreeEvent<MouseEvent>)=>{if(enabled){event.stopPropagation();onActivate(placement)}}
 return <group position={[placement.x,placement.y,placement.z]} rotation-y={placement.yaw} userData={{miamiAdId:placement.id}}>
  <mesh position-z={-.07}><boxGeometry args={[placement.width+.18,placement.height+.18,.12]}/><meshStandardMaterial color="#29342f" metalness={.35} roughness={.74}/></mesh>
  <mesh onClick={activate} userData={{miamiAdFace:placement.id}}><planeGeometry args={[placement.width,placement.height]}/><meshStandardMaterial map={texture} emissiveMap={texture} emissive="#ffffff" emissiveIntensity={glow} roughness={.85}/></mesh>
  {[-1,1].map(side=><mesh key={side} position={[side*placement.width*.31,-placement.y/2-placement.height/4,-.09]}><boxGeometry args={[.13,Math.max(.1,placement.y-placement.height/2),.13]}/><meshStandardMaterial color="#41453e" roughness={.8} metalness={.3}/></mesh>)}
 </group>
}

/** One <video> per creative URL, shared by every projection of that campaign; it plays only while a projection using it is the active one. */
const videos=new Map<string,{video:HTMLVideoElement;texture:T.VideoTexture;users:number}>()
function shareVideo(url:string){let entry=videos.get(url);if(!entry){const video=document.createElement('video');video.src=url;video.muted=true;video.loop=true;video.playsInline=true;video.crossOrigin='anonymous';video.preload='auto';const texture=new T.VideoTexture(video);texture.colorSpace=T.SRGBColorSpace;entry={video,texture,users:0};videos.set(url,entry)}entry.users++;return entry}
function releaseVideo(url:string){const entry=videos.get(url);if(!entry||--entry.users>0)return;entry.video.pause();entry.video.removeAttribute('src');entry.video.load();entry.texture.dispose();videos.delete(url)}
let softEdge:T.CanvasTexture|null=null
/** Projected light falls off at the edges instead of reading as a pasted screen. */
function projectorMask(){if(softEdge)return softEdge;const canvas=document.createElement('canvas');canvas.width=256;canvas.height=144;const c=canvas.getContext('2d')!,g=c.createRadialGradient(128,72,40,128,72,150);g.addColorStop(0,'#fff');g.addColorStop(.62,'#fff');g.addColorStop(1,'#000');c.fillStyle=g;c.fillRect(0,0,256,144);softEdge=new T.CanvasTexture(canvas);return softEdge}
const reducedMotion=()=>typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches
function ProjectionFace({placement,onActivate,enabled,night,active,video}:{placement:MiamiAdPlacement;onActivate:(placement:MiamiAdPlacement)=>void;enabled:boolean;night:MutableRefObject<number>;active:MutableRefObject<string|null>;video:boolean}){
 const material=useRef<T.MeshBasicMaterial>(null),mesh=useRef<T.Mesh>(null),lastDraw=useRef(0)
 const url=video&&!reducedMotion()?placement.campaign.digitalVideo:undefined
 const still=useMemo(()=>{const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=576;drawCreative(canvas,placement);return canvas},[placement])
 const motion=useMemo(()=>{const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=576;canvas.getContext('2d')!.drawImage(still,0,0);const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;return map},[still])
 const shared=useMemo(()=>url?shareVideo(url):null,[url])
 useEffect(()=>()=>{if(url)releaseVideo(url)},[url])
 useEffect(()=>{let alive=true;void document.fonts.ready.then(()=>{if(!alive)return;drawCreative(still,placement);(motion.image as HTMLCanvasElement).getContext('2d')!.drawImage(still,0,0);motion.needsUpdate=true});return()=>{alive=false;motion.dispose()}},[still,motion,placement])
 useFrame(({clock})=>{
  const m=material.current;if(!m||!mesh.current)return
  const playing=active.current===placement.id,target=Math.max(0,(night.current-.3)/.7)*(playing?.95:.42)
  m.opacity+=(target-m.opacity)*.06;mesh.current.visible=m.opacity>.02
  if(shared){const wanted=playing&&mesh.current.visible?shared.texture:motion;if(m.map!==wanted){m.map=wanted;m.needsUpdate=true}
   // The element is shared per campaign: the active projection starts it; it stops once no projection is active.
   if(playing&&shared.video.paused)void shared.video.play().catch(()=>{});else if(active.current===null&&!shared.video.paused)shared.video.pause();return}
  if(!playing||reducedMotion())return
  const now=clock.elapsedTime;if(now-lastDraw.current<.1)return;lastDraw.current=now
  // Motion poster for campaigns without a video: a slow light sweep and a breathing accent.
  const c=(motion.image as HTMLCanvasElement).getContext('2d')!,w=1024,h=576,x=((now*.22)%1.6-.3)*w
  c.globalCompositeOperation='source-over';c.drawImage(still,0,0)
  const g=c.createLinearGradient(x-180,0,x+180,0);g.addColorStop(0,'#fff0');g.addColorStop(.5,'#fff5');g.addColorStop(1,'#fff0');c.globalCompositeOperation='lighter';c.fillStyle=g;c.fillRect(0,0,w,h)
  c.globalCompositeOperation='source-over';c.globalAlpha=.5+.5*Math.sin(now*2.4);c.fillStyle=placement.campaign.creatives.wall.accent;c.fillRect(0,h-10,w,10);c.globalAlpha=1;motion.needsUpdate=true
 })
 const activate=(event:ThreeEvent<MouseEvent>)=>{if(enabled&&mesh.current?.visible){event.stopPropagation();onActivate(placement)}}
 return <group position={[placement.x,placement.y,placement.z]} rotation-y={placement.yaw} userData={{miamiAdId:placement.id}}>
  <mesh ref={mesh} onClick={activate} userData={{miamiAdFace:placement.id}} renderOrder={2}><planeGeometry args={[placement.width,placement.height]}/><meshBasicMaterial ref={material} map={motion} alphaMap={projectorMask()} transparent opacity={0} blending={T.AdditiveBlending} depthWrite={false} toneMapped={false} polygonOffset polygonOffsetFactor={-2}/></mesh>
 </group>
}
function drawBlade(canvas:HTMLCanvasElement,placement:MiamiAdPlacement){
 const c=canvas.getContext('2d')!,w=canvas.width,h=canvas.height,creative=placement.campaign.creatives.wall,text=placement.campaign.name.replace(/\s+(house|motel|service|vintage house)$/i,'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,9)
 c.fillStyle='#0d0f12';c.fillRect(0,0,w,h);c.strokeStyle=creative.accent;c.lineWidth=10;c.strokeRect(14,14,w-28,h-28)
 const letters=[...text],step=(h-80)/letters.length,size=Math.min(150,step*.9);c.font=`700 ${size}px Outfit, Arial, sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillStyle=creative.foreground;c.shadowColor=creative.accent;c.shadowBlur=26
 letters.forEach((letter,i)=>c.fillText(letter,w/2,40+step*(i+.5),w-40))
 c.shadowBlur=0
}
function BladeFace({placement,onActivate,enabled,night}:{placement:MiamiAdPlacement;onActivate:(placement:MiamiAdPlacement)=>void;enabled:boolean;night:MutableRefObject<number>}){
 const front=useRef<T.MeshStandardMaterial>(null),back=useRef<T.MeshStandardMaterial>(null)
 const texture=useMemo(()=>{const canvas=document.createElement('canvas');canvas.width=256;canvas.height=1280;drawBlade(canvas,placement);const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;return map},[placement])
 useEffect(()=>{let alive=true;void document.fonts.ready.then(()=>{if(alive){drawBlade(texture.image as HTMLCanvasElement,placement);texture.needsUpdate=true}});return()=>{alive=false;texture.dispose()}},[texture,placement])
 useFrame(()=>{const glow=.35+1.25*night.current;if(front.current)front.current.emissiveIntensity=glow;if(back.current)back.current.emissiveIntensity=glow})
 const activate=(event:ThreeEvent<MouseEvent>)=>{if(enabled){event.stopPropagation();onActivate(placement)}}
 const {width,height}=placement
 return <group position={[placement.x,placement.y,placement.z]} rotation-y={placement.yaw} userData={{miamiAdId:placement.id}}>
  <mesh><boxGeometry args={[width+.12,height+.12,.22]}/><meshStandardMaterial color="#1b1e22" metalness={.5} roughness={.5}/></mesh>
  <mesh position-z={.115} onClick={activate} userData={{miamiAdFace:placement.id}}><planeGeometry args={[width,height]}/><meshStandardMaterial ref={front} map={texture} emissiveMap={texture} emissive="#ffffff" roughness={.6}/></mesh>
  <mesh position-z={-.115} rotation-y={Math.PI}><planeGeometry args={[width,height]}/><meshStandardMaterial ref={back} map={texture} emissiveMap={texture} emissive="#ffffff" roughness={.6}/></mesh>
 </group>
}

/** Portrait house creative, bright enough to light the street like the reference screen. */
function drawHero(canvas:HTMLCanvasElement,placement:MiamiAdPlacement){
 const c=canvas.getContext('2d')!,w=canvas.width,h=canvas.height,creative=placement.campaign.creatives.billboard
 const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,creative.accent);g.addColorStop(.62,LOOK.cyan);g.addColorStop(1,creative.background);c.fillStyle=g;c.fillRect(0,0,w,h)
 c.globalAlpha=.16;c.fillStyle='#ffffff';for(let y=0;y<h;y+=6)c.fillRect(0,y,w,2);c.globalAlpha=1
 c.fillStyle=creative.background;c.font='600 30px Outfit, Arial, sans-serif';c.fillText(creative.eyebrow,36,64,w-72)
 const words=placement.headline.toUpperCase().split(/\s+/),lines:string[]=[];let line='';c.font='700 92px Outfit, Arial, sans-serif'
 for(const word of words){const next=line?line+' '+word:word;if(c.measureText(next).width>w-72&&line){lines.push(line);line=word}else line=next}if(line)lines.push(line)
 const size=Math.min(92,300/Math.max(1,lines.length));c.font=`700 ${size}px Outfit, Arial, sans-serif`;c.fillStyle='#ffffff';c.shadowColor=creative.background;c.shadowBlur=18
 lines.slice(0,4).forEach((text,i)=>c.fillText(text,36,170+i*(size+6),w-72));c.shadowBlur=0
 c.fillStyle=creative.foreground;c.font='500 26px Outfit, Arial, sans-serif';c.fillText(placement.cta,36,h-86,w-72)
 c.fillStyle='#ffffffaa';c.font='16px Outfit, Arial, sans-serif';c.fillText(`BUENA ONDA · ${placement.kind.toUpperCase()} / ${placement.id}`,36,h-30,w-72)
}
const heroTint=(placement:MiamiAdPlacement)=>new T.Color(placement.campaign.creatives.billboard.accent).lerp(new T.Color(LOOK.cyan),.6)
/** Vanishing-point screen. One canvas redrawn at each rotation; fog-exempt so it holds the frame through the haze. */
function HeroFace({placement,onActivate,enabled,night}:{placement:MiamiAdPlacement;onActivate:(placement:MiamiAdPlacement)=>void;enabled:boolean;night:MutableRefObject<number>}){
 const material=useRef<T.MeshBasicMaterial>(null),face=useRef<T.Mesh>(null),shown=useRef(''),fade=useRef(1),world=useMemo(()=>new T.Vector3(),[]),{camera}=useThree()
 const texture=useMemo(()=>{const canvas=document.createElement('canvas');canvas.width=512;canvas.height=683;const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;return map},[])
 const streaks=useMemo(()=>createWetStreaks([-.32,0,.32].map(t=>({x:t*placement.width,y:placement.y,z:0,width:t?3.2:5,color:LOOK.cyan,intensity:t?.7:1.5}))),[placement])
 useEffect(()=>()=>{texture.dispose();streaks?.geometry.dispose()},[texture,streaks])
 // Redraw once webfonts land so the first creative is not stuck in the fallback face.
 useEffect(()=>{let alive=true;void document.fonts.ready.then(()=>{if(alive)shown.current=''});return()=>{alive=false}},[])
 useFrame((_,dt)=>{
  const current=heroCreative(placement,Date.now())
  if(current.campaign.id!==shown.current){
   shown.current=current.campaign.id;drawHero(texture.image as HTMLCanvasElement,current);texture.needsUpdate=true;fade.current=reducedMotion()?1:.15
   const tint=streaks?.geometry.getAttribute('tint') as T.InstancedBufferAttribute|undefined,color=heroTint(current)
   if(tint){for(let i=0;i<tint.count;i++)tint.setXYZ(i,color.r,color.g,color.b);tint.needsUpdate=true}
  }
  fade.current=Math.min(1,fade.current+dt*2.5)
  if(material.current&&face.current){face.current.getWorldPosition(world);const haze=1-.45*T.MathUtils.smoothstep(world.distanceTo(camera.position),120,420)
   material.current.color.setScalar((.55+.75*night.current)*haze*fade.current)}
 })
 const activate=(event:ThreeEvent<MouseEvent>)=>{if(enabled){event.stopPropagation();onActivate(heroCreative(placement,Date.now()))}}
 const {width,height}=placement
 return <>
  <group position={[placement.x,placement.y,placement.z]} rotation-y={placement.yaw} userData={{miamiAdId:placement.id}}>
   <mesh position-z={-.25}><boxGeometry args={[width+.5,height+.5,.4]}/><meshStandardMaterial color="#07090d" metalness={.4} roughness={.6}/></mesh>
   <mesh ref={face} onClick={activate} userData={{miamiAdFace:placement.id}}><planeGeometry args={[width,height]}/><meshBasicMaterial ref={material} map={texture} toneMapped={false} fog={false}/></mesh>
   {[-1,1].map(side=><mesh key={side} position={[side*width*.3,-placement.y/2-height/4,-.3]}><boxGeometry args={[.45,Math.max(.1,placement.y-height/2),.45]}/><meshStandardMaterial color="#0d1015" roughness={.7} metalness={.4}/></mesh>)}
  </group>
  {streaks&&<group position={[placement.x,0,placement.z]}><primitive object={streaks}/></group>}
 </>
}

export default function MiamiAds({state,route,data,campaign,onSamples,onActivate,measurementsEnabled,vehicleId,vehicleReady,night,video=true}:{night:MutableRefObject<number>;video?:boolean;state:MutableRefObject<NightState>;route:MiamiAdRoute;data:MiamiGeoData;campaign:CruiseCampaign;onSamples:(samples:MiamiAdSample[])=>void;onActivate:(placement:MiamiAdPlacement)=>void;measurementsEnabled:boolean;vehicleId?:string;vehicleReady?:boolean}){
 const group=useRef<T.Group>(null),{camera,scene,size}=useThree(),look=useMemo(()=>cruiseLookEnabled(),[]),placements=useMemo(()=>createMiamiAdPlacements(data,route,campaign,{hero:look}),[data,route,campaign,look]),duration=useRef(new Map<string,number>()),last=useRef(0),activeProjection=useRef<string|null>(null),latest=useRef<MiamiAdSample[]>([])
 const trees=useMemo(()=>new Map<T.BufferGeometry,PrivateTree>(),[]),objects=useMemo(()=>new WeakMap<T.Mesh,OcclusionObject>(),[])
 const performanceStats=useRef<AdMeasurementPerformance>({measurements:0,averageMs:0,maxMs:0,lastMs:0,lastRayCount:0,lastBlockerCount:0,bvhGeometries:0,bvhBuildMs:0})
 const math=useMemo(()=>({center:new T.Vector3(),normal:new T.Vector3(),eye:new T.Vector3(),direction:new T.Vector3(),corner:new T.Vector3(),ray:new T.Raycaster(),localRay:new T.Ray(),boxHit:new T.Vector3(),worldScale:new T.Vector3(),scaledDirection:new T.Vector3(),sphere:new T.Sphere(),matrix:new T.Matrix4(),frustum:new T.Frustum()}),[])
 useEffect(()=>{if(!new URLSearchParams(location.search).has('diagnostics'))return;window.__miamiAds=()=>({placements,samples:latest.current,performance:{...performanceStats.current}});return()=>{delete window.__miamiAds}},[placements])
 useEffect(()=>{
  if(vehicleReady===false)return
  // Build private trees during idle time after the already-loaded native car
  // mounts. Indirect mode leaves all source indices/UVs/material groups intact.
  const queue:T.BufferGeometry[]=[],seen=new Set<T.BufferGeometry>();scene.traverse(object=>{if(object instanceof T.Mesh&&rigidVehicle(object)&&opaqueMaterial(object.material as T.Material)){const geometry=object.geometry,triangles=(geometry.index?.count||geometry.attributes.position.count)/3;if(triangles>=2000&&!trees.has(geometry)&&!seen.has(geometry)){seen.add(geometry);queue.push(geometry)}}})
  let alive=true,job=0;const idle=typeof window.requestIdleCallback==='function',schedule=(callback:()=>void)=>idle?window.requestIdleCallback(callback,{timeout:1000}):window.setTimeout(callback,50)
  const build=()=>{if(!alive)return;const source=queue.shift();if(!source)return;const started=performance.now(),geometry=new T.BufferGeometry();for(const [key,attribute]of Object.entries(source.attributes))geometry.setAttribute(key,attribute);geometry.setIndex(source.index);geometry.groups=source.groups.map(group=>({...group}));geometry.setDrawRange(source.drawRange.start,source.drawRange.count)
   const options={indirect:true,setBoundingBox:false,maxLeafTris:10};try{trees.set(source,{tree:new MeshBVH(geometry,options),geometry})}catch{geometry.dispose()}
   performanceStats.current.bvhGeometries=trees.size;performanceStats.current.bvhBuildMs+=performance.now()-started;if(queue.length)job=schedule(build)
  }
  if(queue.length)job=schedule(build)
  return()=>{alive=false;if(idle)window.cancelIdleCallback(job);else window.clearTimeout(job)}
 },[scene,trees,measurementsEnabled,vehicleId,vehicleReady])
 useEffect(()=>()=>{trees.forEach(({geometry})=>geometry.dispose());trees.clear()},[trees])
 useEffect(()=>{if(measurementsEnabled)return;duration.current.clear();const now=performance.now();latest.current=latest.current.map(sample=>({...sample,visible:false,viewable:false,readable:false,visibleDurationMs:0,sampledAt:now}));onSamples(latest.current)},[measurementsEnabled,onSamples])
 useFrame(()=>{
  if(!group.current)return;const p=route.sample(state.current.distance);group.current.position.set(-p.x,-p.y,-p.z);group.current.updateMatrixWorld(true)
  const now=performance.now();if(now-last.current<250)return;const measuredAt=now;const delta=Math.min(500,Math.max(0,now-last.current));last.current=now
  // The world and rigid traffic update local transforms earlier this frame.
  // Measure their current pose, matching the pose the renderer will draw.
  scene.updateMatrixWorld(true);camera.updateMatrixWorld();camera.getWorldPosition(math.eye);math.matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);math.frustum.setFromProjectionMatrix(math.matrix)
  const samples:(MiamiAdSample&{fullyFramed:boolean;occluders:OccluderDiagnostic[]})[]=placements.map(slot=>{
   // A rotating hero screen is measured as the creative it shows right now.
   const placement=heroCreative(slot,Date.now())
   math.center.set(placement.x-p.x,placement.y-p.y,placement.z-p.z);const distance=math.eye.distanceTo(math.center)
   math.normal.set(Math.sin(placement.yaw),0,Math.cos(placement.yaw));math.direction.copy(math.eye).sub(math.center).normalize();const facing=math.normal.dot(math.direction)
   const centerNdc=math.center.clone().project(camera);let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,front=true
   for(const x of[-.5,.5])for(const y of[-.5,.5]){math.corner.set(math.center.x+Math.cos(placement.yaw)*placement.width*x,math.center.y+placement.height*y,math.center.z-Math.sin(placement.yaw)*placement.width*x).project(camera);front&&=math.corner.z>=-1&&math.corner.z<=1;minX=Math.min(minX,math.corner.x);maxX=Math.max(maxX,math.corner.x);minY=Math.min(minY,math.corner.y);maxY=Math.max(maxY,math.corner.y)}
   const clippedWidth=Math.max(0,Math.min(1,maxX)-Math.max(-1,minX))*size.width/2,clippedHeight=Math.max(0,Math.min(1,maxY)-Math.max(-1,minY))*size.height/2,projectedArea=clippedWidth*clippedHeight/(size.width*size.height)
   const lit=placement.surface!=='projection'||night.current>=.3
   const visible=measurementsEnabled&&lit&&front&&facing>.15&&centerNdc.z>=-1&&centerNdc.z<=1&&math.frustum.containsPoint(math.center)&&clippedWidth>1&&clippedHeight>1&&distance<(placement.surface==='hero'?420:150)
   return{placement,visible,viewable:false,readable:false,distance,facing,projectedArea,pixelWidth:clippedWidth,pixelHeight:clippedHeight,occlusion:1,visibleDurationMs:0,sampledAt:now,fullyFramed:minX>=-1&&maxX<=1&&minY>=-1&&maxY<=1,occluders:[]}
  })
  // Pollution guard: only the nearest framed projection plays motion; the rest hold a dim still.
  activeProjection.current=samples.filter(s=>s.placement.surface==='projection'&&s.distance<170&&s.facing>.2&&s.pixelWidth>1&&night.current>=.3).sort((a,b)=>a.distance-b.distance)[0]?.placement.id??null
  const candidates=samples.filter(s=>s.visible).sort((a,b)=>a.distance-b.distance).slice(0,2)
  // Raycast only currently visible, opaque meshes; invisible chunks and helper
  // hitboxes cannot produce occlusion. Vehicle and windshield frame remain included.
  const blockers:OcclusionObject[]=[]
  const farthest=candidates.reduce((distance,sample)=>Math.max(distance,sample.distance+Math.hypot(sample.placement.width/2,sample.placement.height/2)),0)+.2
  if(candidates.length)scene.traverse(object=>{if(object instanceof T.Mesh&&actualVisible(object)){const materials=Array.isArray(object.material)?object.material:[object.material];if(!materials.some(opaqueMaterial))return
   let record=objects.get(object);if(!record){record={mesh:object,inverse:new T.Matrix4(),box:new T.Box3()};objects.set(object,record)}
   // Exact conservative broad phase: an object whose world-space bounding
   // sphere lies wholly beyond both targets cannot obstruct either ray set.
   if(object instanceof T.InstancedMesh){if(record.sourceGeometry!==object.geometry||record.instanceVersion!==object.instanceMatrix.version||record.instanceCount!==object.count||!object.boundingSphere||!object.boundingBox){object.computeBoundingSphere();object.computeBoundingBox();record.sourceGeometry=object.geometry;record.instanceVersion=object.instanceMatrix.version;record.instanceCount=object.count}math.sphere.copy(object.boundingSphere!)}else{if(!object.geometry.boundingSphere)object.geometry.computeBoundingSphere();math.sphere.copy(object.geometry.boundingSphere!)}
   math.sphere.applyMatrix4(object.matrixWorld);if(math.sphere.center.distanceTo(math.eye)-math.sphere.radius>farthest)return
   record.inverse.copy(object.matrixWorld).invert()
   if(object instanceof T.InstancedMesh){if(!object.boundingBox)object.computeBoundingBox();record.box.copy(object.boundingBox!)}else{if(!object.geometry.boundingBox)object.geometry.computeBoundingBox();record.box.copy(object.geometry.boundingBox!)}
   record.tree=rigidVehicle(object)?trees.get(object.geometry)?.tree:undefined;blockers.push(record)
  }})
  let rayCount=0
  for(const sample of candidates){const placement=sample.placement;let blocked=0
   // Two rows across the headline catch narrow cockpit pillars that could
   // fall between the former center/corner probes. Ten actual scene rays.
   for(const x of[-.4,-.2,0,.2,.4])for(const y of[.2,0]){
    math.corner.set(placement.x-p.x+Math.cos(placement.yaw)*placement.width*x,placement.y+placement.height*y,placement.z-p.z-Math.sin(placement.yaw)*placement.width*x);math.direction.copy(math.corner).sub(math.eye);const rayLength=math.direction.length();math.ray.set(math.eye,math.direction.normalize());math.ray.near=.035;math.ray.far=rayLength-.035
    rayCount++;let first:T.Intersection|null=null
    // Exact per-ray box rejection avoids traversing every distant facade or
    // instanced window. Trees accelerate only rigid, single-material cars;
    // native raycasting preserves every other group's renderer semantics.
    const ordered:{record:OcclusionObject;entry:number}[]=[]
    for(const record of blockers){let node:T.Object3D|null=record.mesh,own=false;while(node){if(node.userData.miamiAdId===placement.id){own=true;break}node=node.parent}if(own)continue
     math.localRay.copy(math.ray.ray).applyMatrix4(record.inverse);const point=math.localRay.intersectBox(record.box,math.boxHit);if(!point)continue;const entry=record.box.containsPoint(math.localRay.origin)?0:math.boxHit.applyMatrix4(record.mesh.matrixWorld).distanceTo(math.eye);if(entry<=math.ray.far)ordered.push({record,entry})
    }
    ordered.sort((a,b)=>a.entry-b.entry)
    for(const {record,entry}of ordered){if(first&&entry>first.distance)break;const mesh=record.mesh;let hits:T.Intersection[]=[]
     const originalFar=math.ray.far;if(first)math.ray.far=Math.min(originalFar,first.distance)
     if(record.tree){math.localRay.copy(math.ray.ray).applyMatrix4(record.inverse);math.worldScale.setFromMatrixScale(mesh.matrixWorld);math.scaledDirection.copy(math.localRay.direction).multiply(math.worldScale);const scale=math.scaledDirection.length();hits=record.tree.raycast(math.localRay,mesh.material,math.ray.near/scale,math.ray.far/scale).map(hit=>{hit.point.applyMatrix4(mesh.matrixWorld);hit.distance=hit.point.distanceTo(math.eye);hit.object=mesh;return hit})}
     else mesh.raycast(math.ray,hits)
     math.ray.far=originalFar
     for(const hit of hits)if(opaqueMaterial(hitMaterial(hit))&&(!first||hit.distance<first.distance))first=hit
    }
    if(first){blocked++;const material=hitMaterial(first) as T.MeshStandardMaterial&{transmission?:number};sample.occluders.push({probe:[x,y],mesh:first.object.name||first.object.type,material:material.name,distance:first.distance,uv:first.uv?first.uv.toArray():null,transparent:material.transparent,opacity:material.opacity,alphaTest:material.alphaTest,depthWrite:material.depthWrite,colorWrite:material.colorWrite,transmission:material.transmission||0,map:!!material.map,alphaMap:!!material.alphaMap})}
   }
   sample.occlusion=blocked/10;const fullyFramed=sample.pixelWidth>40&&sample.pixelHeight>18
   sample.viewable=sample.visible&&sample.facing>.35&&fullyFramed&&sample.occlusion<=.2&&sample.projectedArea>=.003
   sample.readable=sample.viewable&&sample.fullyFramed&&sample.pixelWidth>=(placement.format==='billboard'?150:140)&&sample.pixelHeight>=(placement.format==='billboard'?62:58)&&sample.facing>=.55&&sample.occlusion===0
   // Keyed by creative too: a hero screen that rotates mid-view starts a new exposure for the new campaign.
   const key=`${placement.id}|${placement.campaign.id}`
   if(sample.viewable){const total=duration.current.has(key)?duration.current.get(key)!+delta:0;duration.current.set(key,total);sample.visibleDurationMs=total}else duration.current.delete(key)
  }
  for(const sample of samples)if(!sample.viewable)duration.current.delete(`${sample.placement.id}|${sample.placement.campaign.id}`)
  latest.current=samples;onSamples(samples)
  const stats=performanceStats.current,elapsed=performance.now()-measuredAt;stats.measurements++;stats.averageMs+=(elapsed-stats.averageMs)/stats.measurements;stats.lastMs=elapsed;stats.maxMs=Math.max(stats.maxMs,elapsed);stats.lastRayCount=rayCount;stats.lastBlockerCount=blockers.length
 })
 // Wet-road reflections of the lit signage; the hero screen owns its own (its tint follows the creative).
 const streaks=useMemo(()=>look?createWetStreaks(placements.flatMap((p):WetLight[]=>p.surface==='billboard'?[{x:p.x,y:p.y,z:p.z,width:2.4,color:'#f2e6cc',intensity:.25}]:p.surface==='blade'?[{x:p.x,y:p.y,z:p.z,width:1,color:p.campaign.creatives.wall.accent,intensity:.35}]:[])):null,[look,placements])
 useEffect(()=>()=>{streaks?.geometry.dispose()},[streaks])
 return <group ref={group} name="MiamiMeasuredAdvertisements">{placements.map(placement=><AdFace key={placement.id} placement={placement} onActivate={onActivate} enabled={measurementsEnabled} night={night} active={activeProjection} video={video} look={look}/>)}{streaks&&<primitive object={streaks}/>}</group>
}
