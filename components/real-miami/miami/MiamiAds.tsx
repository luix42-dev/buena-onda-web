'use client'
import{useEffect,useMemo,useRef,type MutableRefObject}from'react'
import{useFrame,useThree,type ThreeEvent}from'@react-three/fiber'
import * as T from'three'
import{MeshBVH}from'three-mesh-bvh'
import type{CruiseCampaign}from'@/lib/cruise/types'
import{createMiamiAdPlacements,type MiamiAdPlacement,type MiamiAdSample,type MiamiAdRoute}from'@/lib/real-miami/advertising'
import type{MiamiGeoData}from'@/lib/real-miami/miami-geo'
import type{NightState}from'../nightdrive/state'

type AdMeasurementPerformance={measurements:number;averageMs:number;maxMs:number;lastMs:number;lastRayCount:number;lastBlockerCount:number;bvhGeometries:number;bvhBuildMs:number}
declare global{interface Window{__miamiAds?:()=>{placements:MiamiAdPlacement[];samples:MiamiAdSample[];performance:AdMeasurementPerformance}}}
const actualVisible=(object:T.Object3D)=>{let node:T.Object3D|null=object;while(node){if(!node.visible)return false;node=node.parent}return true}
type OccluderDiagnostic={probe:[number,number];mesh:string;material:string;distance:number;uv:[number,number]|null;transparent:boolean;opacity:number;alphaTest:number;depthWrite:boolean;colorWrite:boolean;transmission:number;map:boolean;alphaMap:boolean}
const hitMaterial=(hit:T.Intersection)=>{const mesh=hit.object as T.Mesh;return Array.isArray(mesh.material)?mesh.material[hit.face?.materialIndex||0]:mesh.material}
const opaqueMaterial=(material:T.Material)=>{
 if(!material.visible||material.colorWrite===false||(material.transparent&&material.opacity<.2)||('transmission'in material&&Number(material.transmission)>.05))return false
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
function AdFace({placement,onActivate,enabled}:{placement:MiamiAdPlacement;onActivate:(placement:MiamiAdPlacement)=>void;enabled:boolean}){
 const texture=useMemo(()=>{const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=422;drawCreative(canvas,placement);const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;return map},[placement])
 useEffect(()=>{let alive=true,loadedImage:HTMLImageElement|undefined;void document.fonts.ready.then(()=>{if(alive){drawCreative(texture.image,placement,loadedImage);texture.needsUpdate=true}});const imageUrl=placement.campaign.billboardImage||placement.campaign.digitalFallbackImage;let image:HTMLImageElement|undefined;if(imageUrl){image=new Image();image.onload=()=>{if(alive){loadedImage=image;drawCreative(texture.image,placement,loadedImage);texture.needsUpdate=true}};image.src=imageUrl}return()=>{alive=false;if(image)image.onload=null;texture.dispose()}},[texture,placement])
 const activate=(event:ThreeEvent<MouseEvent>)=>{if(enabled){event.stopPropagation();onActivate(placement)}}
 return <group position={[placement.x,placement.y,placement.z]} rotation-y={placement.yaw} userData={{miamiAdId:placement.id}}>
  <mesh position-z={-.07}><boxGeometry args={[placement.width+.18,placement.height+.18,.12]}/><meshStandardMaterial color="#29342f" metalness={.35} roughness={.74}/></mesh>
  <mesh onClick={activate} userData={{miamiAdFace:placement.id}}><planeGeometry args={[placement.width,placement.height]}/><meshStandardMaterial map={texture} emissiveMap={texture} emissive="#ffffff" emissiveIntensity={.36} roughness={.85}/></mesh>
  {[-1,1].map(side=><mesh key={side} position={[side*placement.width*.31,-placement.y/2-placement.height/4,-.09]}><boxGeometry args={[.13,Math.max(.1,placement.y-placement.height/2),.13]}/><meshStandardMaterial color="#41453e" roughness={.8} metalness={.3}/></mesh>)}
 </group>
}

export default function MiamiAds({state,route,data,campaign,onSamples,onActivate,measurementsEnabled,vehicleId,vehicleReady}:{state:MutableRefObject<NightState>;route:MiamiAdRoute;data:MiamiGeoData;campaign:CruiseCampaign;onSamples:(samples:MiamiAdSample[])=>void;onActivate:(placement:MiamiAdPlacement)=>void;measurementsEnabled:boolean;vehicleId?:string;vehicleReady?:boolean}){
 const group=useRef<T.Group>(null),{camera,scene,size}=useThree(),placements=useMemo(()=>createMiamiAdPlacements(data,route,campaign),[data,route,campaign]),duration=useRef(new Map<string,number>()),last=useRef(0),latest=useRef<MiamiAdSample[]>([])
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
  const samples:(MiamiAdSample&{fullyFramed:boolean;occluders:OccluderDiagnostic[]})[]=placements.map(placement=>{
   math.center.set(placement.x-p.x,placement.y-p.y,placement.z-p.z);const distance=math.eye.distanceTo(math.center)
   math.normal.set(Math.sin(placement.yaw),0,Math.cos(placement.yaw));math.direction.copy(math.eye).sub(math.center).normalize();const facing=math.normal.dot(math.direction)
   const centerNdc=math.center.clone().project(camera);let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,front=true
   for(const x of[-.5,.5])for(const y of[-.5,.5]){math.corner.set(math.center.x+Math.cos(placement.yaw)*placement.width*x,math.center.y+placement.height*y,math.center.z-Math.sin(placement.yaw)*placement.width*x).project(camera);front&&=math.corner.z>=-1&&math.corner.z<=1;minX=Math.min(minX,math.corner.x);maxX=Math.max(maxX,math.corner.x);minY=Math.min(minY,math.corner.y);maxY=Math.max(maxY,math.corner.y)}
   const clippedWidth=Math.max(0,Math.min(1,maxX)-Math.max(-1,minX))*size.width/2,clippedHeight=Math.max(0,Math.min(1,maxY)-Math.max(-1,minY))*size.height/2,projectedArea=clippedWidth*clippedHeight/(size.width*size.height)
   const visible=measurementsEnabled&&front&&facing>.15&&centerNdc.z>=-1&&centerNdc.z<=1&&math.frustum.containsPoint(math.center)&&clippedWidth>1&&clippedHeight>1&&distance<150
   return{placement,visible,viewable:false,readable:false,distance,facing,projectedArea,pixelWidth:clippedWidth,pixelHeight:clippedHeight,occlusion:1,visibleDurationMs:0,sampledAt:now,fullyFramed:minX>=-1&&maxX<=1&&minY>=-1&&maxY<=1,occluders:[]}
  })
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
   if(sample.viewable){const total=duration.current.has(placement.id)?duration.current.get(placement.id)!+delta:0;duration.current.set(placement.id,total);sample.visibleDurationMs=total}else duration.current.delete(placement.id)
  }
  for(const sample of samples)if(!sample.viewable)duration.current.delete(sample.placement.id)
  latest.current=samples;onSamples(samples)
  const stats=performanceStats.current,elapsed=performance.now()-measuredAt;stats.measurements++;stats.averageMs+=(elapsed-stats.averageMs)/stats.measurements;stats.lastMs=elapsed;stats.maxMs=Math.max(stats.maxMs,elapsed);stats.lastRayCount=rayCount;stats.lastBlockerCount=blockers.length
 })
 return <group ref={group} name="MiamiMeasuredAdvertisements">{placements.map(placement=><AdFace key={placement.id} placement={placement} onActivate={onActivate} enabled={measurementsEnabled}/>)}</group>
}
