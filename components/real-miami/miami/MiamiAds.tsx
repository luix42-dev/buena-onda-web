'use client'
import{memo,useCallback,useEffect,useMemo,useRef,type MutableRefObject}from'react'
import{useFrame,useThree,type ThreeEvent}from'@react-three/fiber'
import * as T from'three'
import{MeshBVH}from'three-mesh-bvh'
import type{CruiseCampaign}from'@/lib/cruise/types'
import{createMiamiAdPlacements,heroCreative,type MiamiAdPlacement,type MiamiAdSample,type MiamiAdRoute}from'@/lib/real-miami/advertising'
import{cruiseLookEnabled,LOOK}from'@/lib/cruise-os/look'
import{createWetStreaks,type WetLight}from'./wetStreaks'
import type{MiamiGeoData}from'@/lib/real-miami/miami-geo'
import type{NightState}from'../nightdrive/state'
import{registerLamp}from'../vehicle/lampGrid'
import{ownGeometry}from'../neon/instancing'

type AdMeasurementPerformance={measurements:number;averageMs:number;maxMs:number;lastMs:number;lastRayCount:number;lastBlockerCount:number;bvhGeometries:number;bvhBuildMs:number;lastBroadMs?:number;lastInlineBuildMs?:number;slowest?:string[]}
const measureCosts=typeof location!=='undefined'&&new URLSearchParams(location.search).has('diagnostics')
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
type PrivateTree={tree:MeshBVH;geometry:T.BufferGeometry;version:number}
type OcclusionObject={mesh:T.Mesh;inverse:T.Matrix4;box:T.Box3;adId?:string|null;rigid?:boolean;tree?:MeshBVH;sourceGeometry?:T.BufferGeometry;instanceVersion?:number;instanceCount?:number;instanceBoxes?:Float32Array;groupBoxes?:Float32Array;boxesVersion?:number}
const triangles=(geometry:T.BufferGeometry)=>(geometry.index?.count||geometry.attributes.position.count)/3
/** Static world meshes big enough that native raycasting dominated the measurement (City: 17-43k-triangle
 * merged facades at 4-7 ms per ray, ~110 ms per pass). Their trees are built lazily, the first time they
 * stand between the driver and a candidate ad, and dropped if the geometry is rewritten. 2026-10-30: from
 * 300 triangles (landmarks and street detail of 800-1,700 triangles still cost ~10 ms a pass on a phone CPU). */
const TREE_MIN_TRIANGLES=300
const treeable=(mesh:T.Mesh)=>!(mesh instanceof T.SkinnedMesh)&&!Object.keys(mesh.geometry.morphAttributes).length&&triangles(mesh.geometry)>=TREE_MIN_TRIANGLES
const worldTree=(mesh:T.Mesh)=>!(mesh instanceof T.InstancedMesh)&&treeable(mesh)
/** Indirect mode leaves all source indices/UVs/material groups intact; array materials map per group. */
function buildTree(source:T.BufferGeometry):PrivateTree|null{
 const geometry=new T.BufferGeometry();for(const [key,attribute]of Object.entries(source.attributes))geometry.setAttribute(key,attribute);geometry.setIndex(source.index);geometry.groups=source.groups.map(group=>({...group}));geometry.setDrawRange(source.drawRange.start,source.drawRange.count)
 const options={indirect:true,setBoundingBox:false,maxLeafTris:10}
 try{return{tree:new MeshBVH(geometry,options),geometry,version:positionVersion(source)}}catch{geometry.dispose();return null}
}
function positionVersion(geometry:T.BufferGeometry){const position=geometry.attributes.position;return position instanceof T.InterleavedBufferAttribute?position.data.version:position.version}
const instanceProbe={mesh:new T.Mesh(),matrix:new T.Matrix4(),inverse:new T.Matrix4(),box:new T.Box3(),corner:new T.Box3(),ray:new T.Ray(),scale:new T.Vector3()}
/** InstancedMesh.raycast tests every instance (2,725 boxes x 20 rays per pass in City). Cached per-instance
 * boxes reject almost all of them with a slab test; the survivors get three's exact per-instance raycast.
 * Instances are laid out street by street, so boxes over runs of INSTANCE_RUN reject most runs in one test. */
const INSTANCE_RUN=32
function raycastInstances(record:OcclusionObject,raycaster:T.Raycaster,localRay:T.Ray,hits:T.Intersection[],tree?:MeshBVH){
 const mesh=record.mesh as T.InstancedMesh,geometry=mesh.geometry
 if(!record.instanceBoxes||record.boxesVersion!==mesh.instanceMatrix.version||record.instanceBoxes.length!==mesh.count*6){
  if(!geometry.boundingBox)geometry.computeBoundingBox()
  const boxes=new Float32Array(mesh.count*6)
  for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,instanceProbe.matrix);instanceProbe.corner.copy(geometry.boundingBox!).applyMatrix4(instanceProbe.matrix);instanceProbe.corner.min.toArray(boxes,i*6);instanceProbe.corner.max.toArray(boxes,i*6+3)}
  const runs=new Float32Array(Math.ceil(mesh.count/INSTANCE_RUN)*6)
  for(let r=0;r*INSTANCE_RUN<mesh.count;r++){runs.fill(Infinity,r*6,r*6+3);runs.fill(-Infinity,r*6+3,r*6+6);for(let i=r*INSTANCE_RUN;i<Math.min(mesh.count,(r+1)*INSTANCE_RUN);i++)for(let k=0;k<3;k++){runs[r*6+k]=Math.min(runs[r*6+k],boxes[i*6+k]);runs[r*6+3+k]=Math.max(runs[r*6+3+k],boxes[i*6+3+k])}}
  record.instanceBoxes=boxes;record.groupBoxes=runs;record.boxesVersion=mesh.instanceMatrix.version
 }
 const boxes=record.instanceBoxes,runs=record.groupBoxes!,probe=instanceProbe.mesh;probe.geometry=geometry;probe.material=mesh.material
 for(let i=0;i<mesh.count;i++){
  if(i%INSTANCE_RUN===0){const r=i/INSTANCE_RUN;instanceProbe.box.min.fromArray(runs,r*6);instanceProbe.box.max.fromArray(runs,r*6+3);if(!localRay.intersectsBox(instanceProbe.box)){i+=INSTANCE_RUN-1;continue}}
  instanceProbe.box.min.fromArray(boxes,i*6);instanceProbe.box.max.fromArray(boxes,i*6+3);if(!localRay.intersectsBox(instanceProbe.box))continue
  mesh.getMatrixAt(i,instanceProbe.matrix);probe.matrixWorld.multiplyMatrices(mesh.matrixWorld,instanceProbe.matrix)
  const before=hits.length
  // A shared tree for the instance geometry replaces three's per-triangle test (same hits, instance space).
  if(tree){const p=instanceProbe;p.inverse.copy(probe.matrixWorld).invert();p.ray.copy(raycaster.ray).applyMatrix4(p.inverse);p.scale.setFromMatrixScale(probe.matrixWorld).multiply(p.ray.direction);const scale=p.scale.length()
   for(const hit of tree.raycast(p.ray,mesh.material,raycaster.near/scale,raycaster.far/scale)){hit.point.applyMatrix4(probe.matrixWorld);hit.distance=hit.point.distanceTo(raycaster.ray.origin);hits.push(hit)}}
  else probe.raycast(raycaster,hits)
  for(let j=before;j<hits.length;j++){hits[j].instanceId=i;hits[j].object=mesh}
 }
}
/** Readability first (Luis: "ads should be readable, people need to actually see them"): a short eyebrow, one huge
 * headline auto-fitted to at most two lines, a bold call to action; no small print. Catalog products (campaign
 * `billboardImage`) split photo | type; a designed card (`digitalFallbackImage`) fills the face. */
function drawCreative(canvas:HTMLCanvasElement,placement:MiamiAdPlacement,image?:HTMLImageElement){
 const c=canvas.getContext('2d')!,w=canvas.width,h=canvas.height,creative=placement.campaign.creatives[placement.format==='poster'?'poster':'billboard']
 const cover=(img:HTMLImageElement,x:number,y:number,cw:number,ch:number)=>{const r=Math.max(cw/img.naturalWidth,ch/img.naturalHeight),iw=img.naturalWidth*r,ih=img.naturalHeight*r;c.save();c.beginPath();c.rect(x,y,cw,ch);c.clip();c.drawImage(img,x+(cw-iw)/2,y+(ch-ih)/2,iw,ih);c.restore()}
 c.fillStyle=creative.background;c.fillRect(0,0,w,h)
 if(image&&placement.campaign.billboardImage?.includes('/product-ads/')){cover(image,0,0,w,h);return}
 const product=!!(image&&placement.campaign.billboardImage)
 if(image&&!product){cover(image,0,0,w,h);return}
 let x0=0
 if(product&&image){x0=Math.round(w*.42);cover(image,0,0,x0,h);c.fillStyle=creative.accent;c.fillRect(x0,0,Math.max(4,h*.012),h)}
 const pad=Math.round(h*.09),tx=x0+pad,tw=w-x0-pad*2,font=(size:number,weight=700)=>`${weight} ${Math.round(size)}px Outfit, Arial, sans-serif`
 c.textBaseline='alphabetic';c.fillStyle=creative.accent;c.font=font(h*.085);c.fillText(creative.eyebrow,tx,pad+h*.07,tw)
 // Largest size at which the headline fits two lines in the text column.
 const words=placement.headline.toUpperCase().split(/\s+/);let lines:string[]=[words.join(' ')],size=h*.36
 for(;size>h*.11;size-=h*.01){c.font=font(size,800);lines=[];let line='';for(const word of words){const next=line?line+' '+word:word;if(c.measureText(next).width>tw&&line){lines.push(line);line=word}else line=next}if(line)lines.push(line)
  if(lines.length<=2&&lines.every(l=>c.measureText(l).width<=tw)&&lines.length*size*1.02<=h*.56)break}
 c.fillStyle=creative.foreground;c.font=font(size,800);const top=pad+h*.16+size*.82
 lines.slice(0,2).forEach((text,i)=>c.fillText(text,tx,top+i*size*1.02,tw))
 c.fillStyle=creative.accent;c.fillRect(tx,h-pad-h*.1,h*.12,Math.max(4,h*.014))
 c.fillStyle=creative.foreground;c.font=font(h*.075,600);c.fillText(placement.cta.toUpperCase(),tx+h*.16,h-pad-h*.07,tw-h*.16)
}
function AdFace({placement,onActivate,enabled,night,active,video,look}:{placement:MiamiAdPlacement;onActivate:(placement:MiamiAdPlacement)=>void;enabled:boolean;night:MutableRefObject<number>;active:MutableRefObject<string|null>;video:boolean;look:boolean}){
 if(placement.surface==='hero')return <HeroFace placement={placement} onActivate={onActivate} enabled={enabled} night={night}/>
 if(placement.surface==='digital')return <DigitalFace placement={placement} onActivate={onActivate} enabled={enabled} active={active} video={video}/>
 if(placement.surface==='projection')return <ProjectionFace placement={placement} onActivate={onActivate} enabled={enabled} night={night} active={active} video={video}/>
 if(placement.surface==='blade')return <BladeFace placement={placement} onActivate={onActivate} enabled={enabled}/>
 return <BoardFace placement={placement} onActivate={onActivate} enabled={enabled} glow={look?.44:.32}/>
}
// One unit plane serves every ad face (scaled per placement); never disposed with a face.
const UNIT_PLANE=new T.PlaneGeometry(1,1),UNIT_BOX=new T.BoxGeometry(1,1,1)
// Lit faces share materials per creative; MiamiAds sets every glow once per frame instead of one useFrame per board.
const litFaces=new Map<T.MeshStandardMaterial,{base:number;night:number}>()
// Repeated campaign faces share a single canvas/GPU texture (and material) across the 36 km highway.
type BoardArt={texture:T.CanvasTexture;material:T.MeshStandardMaterial;users:number;image?:HTMLImageElement}
const boardArt=new Map<string,BoardArt>()
const boardKey=(p:MiamiAdPlacement)=>`${p.campaign.id}|${p.headline}|${p.cta}|${p.format}`
function acquireBoardArt(p:MiamiAdPlacement,glow:number){
 const key=boardKey(p),existing=boardArt.get(key);if(existing){existing.users++;return existing.material}
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=422;drawCreative(canvas,p)
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4
 const material=new T.MeshStandardMaterial({map:texture,emissiveMap:texture,emissive:'#ffffff',emissiveIntensity:.06,roughness:.78});litFaces.set(material,{base:.06,night:glow})
 const entry:BoardArt={texture,material,users:1};boardArt.set(key,entry)
 const update=()=>{if(boardArt.get(key)!==entry)return;drawCreative(canvas,p,entry.image?.complete&&entry.image.naturalWidth?entry.image:undefined);texture.needsUpdate=true}
 void document.fonts.ready.then(update)
 const url=p.campaign.billboardImage||p.campaign.digitalFallbackImage
 if(url){const image=new Image();entry.image=image;image.onload=update;image.src=url}
 return material
}
function releaseBoardArt(p:MiamiAdPlacement){const key=boardKey(p),entry=boardArt.get(key);if(!entry||--entry.users>0)return;boardArt.delete(key);if(entry.image)entry.image.onload=null;litFaces.delete(entry.material);entry.material.dispose();entry.texture.dispose()}
function BoardFace({placement,onActivate,enabled,glow=.36}:{placement:MiamiAdPlacement;onActivate:(placement:MiamiAdPlacement)=>void;enabled:boolean;glow?:number}){
 const material=useMemo(()=>acquireBoardArt(placement,glow),[placement,glow])
 useEffect(()=>()=>releaseBoardArt(placement),[placement,glow])
 const activate=(event:ThreeEvent<MouseEvent>)=>{if(enabled){event.stopPropagation();onActivate(placement)}}
 // Frame, posts, footings and brace are drawn once for every ad by AdStructure.
 return <group position={[placement.x,placement.y,placement.z]} rotation-y={placement.yaw} userData={{miamiAdId:placement.id}}>
  <mesh onClick={activate} userData={{miamiAdFace:placement.id}} position-z={.015} scale={[placement.width,placement.height,1]} geometry={UNIT_PLANE} material={material}/>
 </group>
}

type Part={x:number;y:number;z:number;w:number;h:number;d:number;color:string}
/** The static support parts each surface used to build as separate meshes (same sizes and colours). */
function structureParts(p:MiamiAdPlacement):{metal:Part[];concrete:Part[]}{
 const {width:w,height:h,y}=p,ground=p.groundY??0,metal:Part[]=[],concrete:Part[]=[]
 if(p.surface==='projection')return{metal,concrete}
 if(p.surface==='blade'){metal.push({x:0,y:0,z:0,w:w+.12,h:h+.12,d:.22,color:'#1b1e22'});return{metal,concrete}}
 if(p.surface==='digital'){
  const post=Math.max(.1,y-ground-h/2)
  metal.push({x:0,y:0,z:-.16,w:w+.45,h:h+.45,d:.3,color:'#10151c'})
  for(const side of[-1,1]){metal.push({x:side*w*.3,y:ground/2-y/2-h/4,z:-.22,w:.72,h:post,d:.72,color:'#535e62'});concrete.push({x:side*w*.3,y:ground-y+.25,z:-.22,w:1.55,h:.5,d:1.55,color:'#68706c'})}
  return{metal,concrete}
 }
 if(p.surface==='hero'){
  metal.push({x:0,y:0,z:-.25,w:w+.5,h:h+.5,d:.4,color:'#07090d'})
  for(const side of[-1,1]){metal.push({x:side*w*.3,y:-y/2-h/4,z:-.3,w:1.1,h:Math.max(.1,y-h/2),d:1.1,color:'#303a3e'});concrete.push({x:side*w*.3,y:-y+.3,z:-.3,w:2.1,h:.6,d:2.1,color:'#6a716d'})}
  return{metal,concrete}
 }
 const post=Math.max(.1,y-ground-h/2),tall=post>8,postWidth=tall?.7:.24,foot=tall?1.5:.7
 metal.push({x:0,y:0,z:-.12,w:w+.28,h:h+.28,d:.24,color:'#303a3b'},{x:0,y:-h*.34,z:-.33,w:w*.7,h:.18,d:.24,color:'#626b6b'})
 for(const side of[-1,1]){metal.push({x:side*w*.31,y:-h/2-post/2,z:-.18,w:postWidth,h:post,d:postWidth,color:'#536064'});concrete.push({x:side*w*.31,y:-h/2-post+.2,z:-.18,w:foot,h:.4,d:foot,color:'#666c69'})}
 return{metal,concrete}
}
/** Every ad's frame, posts, footings and braces in two instanced draws (was ~6 meshes and materials per ad).
 * Not a measured blocker: an ad's own supports never stood between the driver and its face. */
function AdStructure({placements}:{placements:MiamiAdPlacement[]}){
 const meshes=useMemo(()=>{
  const all=placements.map(p=>({p,...structureParts(p)})),o=new T.Object3D(),color=new T.Color()
  const build=(key:'metal'|'concrete',material:T.Material)=>{
   const count=all.reduce((n,a)=>n+a[key].length,0),mesh=new T.InstancedMesh(ownGeometry(UNIT_BOX),material,Math.max(1,count));let i=0
   for(const {p,[key]:parts}of all)for(const part of parts){
    const c=Math.cos(p.yaw),s=Math.sin(p.yaw)
    o.position.set(p.x+part.x*c+part.z*s,p.y+part.y,p.z-part.x*s+part.z*c);o.rotation.set(0,p.yaw,0);o.scale.set(part.w,part.h,part.d);o.updateMatrix()
    mesh.setMatrixAt(i,o.matrix);mesh.setColorAt(i++,color.set(part.color))
   }
   mesh.count=count;mesh.computeBoundingSphere();mesh.userData.adStructure=true;mesh.raycast=()=>{}
   return mesh
  }
  return [build('metal',new T.MeshStandardMaterial({metalness:.55,roughness:.57})),build('concrete',new T.MeshStandardMaterial({roughness:.92}))]
 },[placements])
 // <primitive dispose={null}> sets mesh.dispose = null; call the class method so the instance buffers are freed.
 useEffect(()=>()=>meshes.forEach(mesh=>{(mesh.material as T.Material).dispose();mesh.geometry.dispose();T.InstancedMesh.prototype.dispose.call(mesh)}),[meshes])
 return <>{meshes.map((mesh,i)=><primitive key={i} object={mesh} dispose={null}/>)}</>
}

/** One <video> per creative URL, shared by every projection of that campaign; it plays only while a projection using it is the active one. */
const videos=new Map<string,{video:HTMLVideoElement;texture:T.VideoTexture;users:number}>()
function shareVideo(url:string){let entry=videos.get(url);if(!entry){const video=document.createElement('video');video.src=url;video.muted=true;video.loop=true;video.playsInline=true;video.crossOrigin='anonymous';video.preload='auto';const texture=new T.VideoTexture(video);texture.colorSpace=T.SRGBColorSpace;entry={video,texture,users:0};videos.set(url,entry)}entry.users++;return entry}
function releaseVideo(url:string){const entry=videos.get(url);if(!entry||--entry.users>0)return;entry.video.pause();entry.video.removeAttribute('src');entry.video.load();entry.texture.dispose();videos.delete(url)}
const digitalImages=new Map<string,HTMLImageElement>()
function digitalImage(url:string){let image=digitalImages.get(url);if(!image){image=new Image();image.src=url;digitalImages.set(url,image)}return image.complete&&image.naturalWidth?image:undefined}
/** Highway screens rotate slowly. A muted house loop plays on only the nearest framed screen;
 * the campaign name and destination cue remain legible over motion. Low tier and reduced motion use still art. */
/** Screens rotate through a small roster, so art and caption are drawn once per creative and shared by every
 * screen showing it (was two 768 px canvases per screen: ~100 MB of GPU memory across the highway). */
type CreativeTextures={art:T.CanvasTexture;label:T.CanvasTexture;photo:boolean;drawn:boolean}
const creativeTextures=new Map<string,CreativeTextures>()
if(typeof document!=='undefined')void document.fonts?.ready.then(()=>creativeTextures.forEach(entry=>{entry.drawn=false}))
function creativeArt(creative:MiamiAdPlacement){
 const photo=creative.campaign.billboardImage?digitalImage(creative.campaign.billboardImage):undefined,key=boardKey(creative)
 let entry=creativeTextures.get(key)
 if(!entry){const make=()=>{const canvas=document.createElement('canvas');canvas.width=768;canvas.height=318;const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;return map};entry={art:make(),label:make(),photo:false,drawn:false};entry.art.anisotropy=4;creativeTextures.set(key,entry)}
 if(!entry.drawn||(photo&&!entry.photo)){
  entry.drawn=true;entry.photo=!!photo;drawCreative(entry.art.image as HTMLCanvasElement,creative,photo);entry.art.needsUpdate=true
  const c=(entry.label.image as HTMLCanvasElement).getContext('2d')!;c.clearRect(0,0,768,318);c.fillStyle='rgba(9,16,24,.88)';c.fillRect(0,215,768,103)
  c.fillStyle='#f7e8d9';c.font='700 42px Outfit, Arial, sans-serif';c.fillText(creative.headline.toUpperCase(),26,262,716)
  c.fillStyle=creative.campaign.creatives.billboard.accent;c.font='600 22px Outfit, Arial, sans-serif';c.fillText(`BUENA ONDA  /  ${creative.cta.toUpperCase()}`,27,301,714);entry.label.needsUpdate=true
 }
 return entry
}
function releaseCreativeArt(){creativeTextures.forEach(entry=>{entry.art.dispose();entry.label.dispose()});creativeTextures.clear()}
function DigitalFace({placement,onActivate,enabled,active,video}:{placement:MiamiAdPlacement;onActivate:(placement:MiamiAdPlacement)=>void;enabled:boolean;active:MutableRefObject<string|null>;video:boolean}){
 const face=useRef<T.MeshBasicMaterial>(null),overlayMaterial=useRef<T.MeshBasicMaterial>(null),overlay=useRef<T.Mesh>(null),current=useRef(placement),checked=useRef(0),{camera}=useThree(),eye=useMemo(()=>new T.Vector3(),[]),board=useMemo(()=>new T.Vector3(placement.x,placement.y,placement.z),[placement])
 const first=useMemo(()=>creativeArt(heroCreative(placement,Date.now())),[placement])
 const loopUrl=video&&!reducedMotion()?placement.rotation?.find(c=>c.digitalVideo)?.digitalVideo:undefined
 const loop=useMemo(()=>loopUrl?shareVideo(loopUrl):null,[loopUrl])
 useEffect(()=>()=>{if(loopUrl)releaseVideo(loopUrl)},[loopUrl])
 useFrame(()=>{
  // Rotation is 30 s per creative and the active screen changes every 250 ms: 5 checks a second is plenty.
  const now=performance.now();if(now-checked.current<200||!face.current)return;checked.current=now
  const creative=heroCreative(placement,Date.now());current.current=creative
  const textures=creativeArt(creative)
  camera.getWorldPosition(eye);const near=eye.distanceTo(board)<180
  const moving=!!loop&&creative.campaign.digitalVideo===loopUrl&&active.current===placement.id&&near
  const wanted=moving?loop.texture:textures.art
  if(face.current.map!==wanted){face.current.map=wanted;face.current.needsUpdate=true}
  if(overlayMaterial.current&&overlayMaterial.current.map!==textures.label){overlayMaterial.current.map=textures.label;overlayMaterial.current.needsUpdate=true}
  if(overlay.current)overlay.current.visible=moving
  if(moving&&loop.video.paused)void loop.video.play().catch(()=>{})
 })
 const click=(event:ThreeEvent<MouseEvent>)=>{if(enabled){event.stopPropagation();onActivate(current.current)}}
 const scale:[number,number,number]=[placement.width,placement.height,1]
 return <group position={[placement.x,placement.y,placement.z]} rotation-y={placement.yaw} userData={{miamiAdId:placement.id}}>
  <mesh onClick={click} userData={{miamiAdFace:placement.id}} scale={scale} geometry={UNIT_PLANE}><meshBasicMaterial ref={face} map={first.art} toneMapped={false}/></mesh>
  <mesh ref={overlay} position-z={.012} raycast={()=>{}} visible={false} scale={scale} geometry={UNIT_PLANE}><meshBasicMaterial ref={overlayMaterial} map={first.label} transparent toneMapped={false} depthWrite={false}/></mesh>
 </group>
}
let softEdge:T.CanvasTexture|null=null
/** Projected light falls off at the edges instead of reading as a pasted screen. */
function projectorMask(){if(softEdge)return softEdge;const canvas=document.createElement('canvas');canvas.width=256;canvas.height=144;const c=canvas.getContext('2d')!,g=c.createRadialGradient(128,72,40,128,72,150);g.addColorStop(0,'#fff');g.addColorStop(.62,'#fff');g.addColorStop(1,'#000');c.fillStyle=g;c.fillRect(0,0,256,144);softEdge=new T.CanvasTexture(canvas);return softEdge}
const reducedMotion=()=>typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches
/** Wall projections of the same creative share one still texture (was a 1024 px canvas texture per wall). */
const projectionArt=new Map<string,{texture:T.CanvasTexture;users:number}>()
function acquireProjectionArt(p:MiamiAdPlacement){
 const key=boardKey(p),existing=projectionArt.get(key);if(existing){existing.users++;return existing.texture}
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=576;drawCreative(canvas,p)
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const entry={texture,users:1};projectionArt.set(key,entry)
 void document.fonts.ready.then(()=>{if(projectionArt.get(key)!==entry)return;drawCreative(canvas,p);texture.needsUpdate=true})
 return texture
}
function releaseProjectionArt(p:MiamiAdPlacement){const key=boardKey(p),entry=projectionArt.get(key);if(!entry||--entry.users>0)return;projectionArt.delete(key);entry.texture.dispose()}
function ProjectionFace({placement,onActivate,enabled,night,active,video}:{placement:MiamiAdPlacement;onActivate:(placement:MiamiAdPlacement)=>void;enabled:boolean;night:MutableRefObject<number>;active:MutableRefObject<string|null>;video:boolean}){
 const material=useRef<T.MeshBasicMaterial>(null),mesh=useRef<T.Mesh>(null)
 const url=video&&!reducedMotion()?placement.campaign.digitalVideo:undefined
 const motion=useMemo(()=>acquireProjectionArt(placement),[placement])
 const shared=useMemo(()=>url?shareVideo(url):null,[url])
 useEffect(()=>()=>{if(url)releaseVideo(url)},[url])
 useEffect(()=>()=>releaseProjectionArt(placement),[placement])
 useFrame(()=>{
  const m=material.current;if(!m||!mesh.current)return
  const playing=active.current===placement.id,target=Math.max(0,(night.current-.3)/.7)*.62
  m.opacity+=(target-m.opacity)*.06;mesh.current.visible=m.opacity>.02
  if(shared){const wanted=playing&&mesh.current.visible?shared.texture:motion;if(m.map!==wanted){m.map=wanted;m.needsUpdate=true}
   // The element is shared per campaign: the active projection starts it; it stops once no projection is active.
   if(playing&&shared.video.paused)void shared.video.play().catch(()=>{});else if(active.current===null&&!shared.video.paused)shared.video.pause();return}
 })
 const activate=(event:ThreeEvent<MouseEvent>)=>{if(enabled&&mesh.current?.visible){event.stopPropagation();onActivate(placement)}}
 return <group position={[placement.x,placement.y,placement.z]} rotation-y={placement.yaw} userData={{miamiAdId:placement.id}}>
  <mesh ref={mesh} onClick={activate} userData={{miamiAdFace:placement.id}} renderOrder={2} scale={[placement.width,placement.height,1]} geometry={UNIT_PLANE}><meshBasicMaterial ref={material} map={motion} alphaMap={projectorMask()} transparent opacity={0} depthWrite={false} toneMapped={false} polygonOffset polygonOffsetFactor={-2}/></mesh>
 </group>
}
function drawBlade(canvas:HTMLCanvasElement,placement:MiamiAdPlacement){
 const c=canvas.getContext('2d')!,w=canvas.width,h=canvas.height,creative=placement.campaign.creatives.wall,text=placement.campaign.name.replace(/\s+(house|motel|service|vintage house)$/i,'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,9)
 c.fillStyle='#0d0f12';c.fillRect(0,0,w,h);c.strokeStyle=creative.accent;c.lineWidth=10;c.strokeRect(14,14,w-28,h-28)
 const letters=[...text],step=(h-80)/letters.length,size=Math.min(150,step*.9);c.font=`700 ${size}px Outfit, Arial, sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillStyle=creative.foreground;c.shadowColor=creative.accent;c.shadowBlur=26
 letters.forEach((letter,i)=>c.fillText(letter,w/2,40+step*(i+.5),w-40))
 c.shadowBlur=0
}
/** Blade lettering depends only on the campaign: one texture and material per campaign, both faces. */
const bladeArt=new Map<string,{texture:T.CanvasTexture;material:T.MeshStandardMaterial;users:number}>()
function acquireBladeArt(p:MiamiAdPlacement){
 const key=p.campaign.id,existing=bladeArt.get(key);if(existing){existing.users++;return existing.material}
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=1280;drawBlade(canvas,p)
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4
 const material=new T.MeshStandardMaterial({map:texture,emissiveMap:texture,emissive:'#ffffff',emissiveIntensity:.3,roughness:.6});litFaces.set(material,{base:.3,night:.8})
 const entry={texture,material,users:1};bladeArt.set(key,entry)
 void document.fonts.ready.then(()=>{if(bladeArt.get(key)!==entry)return;drawBlade(canvas,p);texture.needsUpdate=true})
 return material
}
function releaseBladeArt(p:MiamiAdPlacement){const entry=bladeArt.get(p.campaign.id);if(!entry||--entry.users>0)return;bladeArt.delete(p.campaign.id);litFaces.delete(entry.material);entry.material.dispose();entry.texture.dispose()}
function BladeFace({placement,onActivate,enabled}:{placement:MiamiAdPlacement;onActivate:(placement:MiamiAdPlacement)=>void;enabled:boolean}){
 const material=useMemo(()=>acquireBladeArt(placement),[placement])
 useEffect(()=>()=>releaseBladeArt(placement),[placement])
 const activate=(event:ThreeEvent<MouseEvent>)=>{if(enabled){event.stopPropagation();onActivate(placement)}}
 const scale:[number,number,number]=[placement.width,placement.height,1]
 return <group position={[placement.x,placement.y,placement.z]} rotation-y={placement.yaw} userData={{miamiAdId:placement.id}}>
  <mesh position-z={.115} onClick={activate} userData={{miamiAdFace:placement.id}} scale={scale} geometry={UNIT_PLANE} material={material}/>
  <mesh position-z={-.115} rotation-y={Math.PI} scale={scale} geometry={UNIT_PLANE} material={material}/>
 </group>
}

/** Portrait house creative, bright enough to light the street like the reference screen. */
function drawHero(canvas:HTMLCanvasElement,placement:MiamiAdPlacement,image?:HTMLImageElement){
 const c=canvas.getContext('2d')!,w=canvas.width,h=canvas.height,creative=placement.campaign.creatives.billboard
 if(image?.complete&&image.naturalWidth){const scale=Math.max(w/image.naturalWidth,h/image.naturalHeight),iw=image.naturalWidth*scale,ih=image.naturalHeight*scale;c.drawImage(image,(w-iw)/2,(h-ih)/2,iw,ih);return}
 const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,creative.accent);g.addColorStop(.62,LOOK.cyan);g.addColorStop(1,creative.background);c.fillStyle=g;c.fillRect(0,0,w,h)
 c.globalAlpha=.16;c.fillStyle='#ffffff';for(let y=0;y<h;y+=6)c.fillRect(0,y,w,2);c.globalAlpha=1
 c.fillStyle=creative.background;c.font='600 30px Outfit, Arial, sans-serif';c.fillText(creative.eyebrow,36,64,w-72)
 const words=placement.headline.toUpperCase().split(/\s+/),lines:string[]=[];let line='';c.font='700 92px Outfit, Arial, sans-serif'
 for(const word of words){const next=line?line+' '+word:word;if(c.measureText(next).width>w-72&&line){lines.push(line);line=word}else line=next}if(line)lines.push(line)
 const size=Math.min(92,300/Math.max(1,lines.length));c.font=`700 ${size}px Outfit, Arial, sans-serif`;c.fillStyle='#ffffff';c.shadowColor=creative.background;c.shadowBlur=18
 lines.slice(0,4).forEach((text,i)=>c.fillText(text,36,170+i*(size+6),w-72));c.shadowBlur=0
 c.fillStyle=creative.foreground;c.font='500 26px Outfit, Arial, sans-serif';c.fillText(placement.cta,36,h-86,w-72)
 if(placement.kind==='station'){c.fillStyle='#ffffffaa';c.font='18px Outfit, Arial, sans-serif';c.fillText('BUENA ONDA CRUISE RADIO',36,h-30,w-72)}
}
const heroTint=(placement:MiamiAdPlacement)=>new T.Color(placement.campaign.creatives.billboard.accent).lerp(new T.Color(LOOK.cyan),.6)
/** Vanishing-point screen. One canvas redrawn at each rotation; fog-exempt so it holds the frame through the haze. */
function HeroFace({placement,onActivate,enabled,night}:{placement:MiamiAdPlacement;onActivate:(placement:MiamiAdPlacement)=>void;enabled:boolean;night:MutableRefObject<number>}){
 const material=useRef<T.MeshBasicMaterial>(null),face=useRef<T.Mesh>(null),shown=useRef(''),world=useMemo(()=>new T.Vector3(),[]),{camera}=useThree()
 const images=useMemo(()=>new Map<string,HTMLImageElement>(),[])
 const texture=useMemo(()=>{const canvas=document.createElement('canvas');canvas.width=512;canvas.height=683;const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;return map},[])
 const streaks=useMemo(()=>createWetStreaks([-.32,0,.32].map(t=>({x:t*placement.width,y:placement.y,z:0,width:t?3.2:5,color:LOOK.cyan,intensity:t?.7:1.5}))),[placement])
 useEffect(()=>()=>{texture.dispose();streaks?.geometry.dispose();images.forEach(image=>image.onload=null)},[texture,streaks,images])
 // Redraw once webfonts land so the first creative is not stuck in the fallback face.
 useEffect(()=>{let alive=true;void document.fonts.ready.then(()=>{if(alive)shown.current=''});return()=>{alive=false}},[])
 useFrame((_,dt)=>{
  const current=heroCreative(placement,Date.now())
  if(current.campaign.id!==shown.current){
   shown.current=current.campaign.id
   const url=current.campaign.billboardImage;let image=url?images.get(url):undefined
   if(url&&!image){image=new Image();images.set(url,image);image.onload=()=>{shown.current=''};image.src=url}
   drawHero(texture.image as HTMLCanvasElement,current,image);texture.needsUpdate=true
   const tint=streaks?.geometry.getAttribute('tint') as T.InstancedBufferAttribute|undefined,color=heroTint(current)
   if(tint){for(let i=0;i<tint.count;i++)tint.setXYZ(i,color.r,color.g,color.b);tint.needsUpdate=true}
  }
  if(material.current&&face.current){face.current.getWorldPosition(world);const haze=1-.45*T.MathUtils.smoothstep(world.distanceTo(camera.position),120,420)
   material.current.color.setScalar((.55+.75*night.current)*haze)}
 })
 const activate=(event:ThreeEvent<MouseEvent>)=>{if(enabled){event.stopPropagation();onActivate(heroCreative(placement,Date.now()))}}
 const {width,height}=placement
 return <>
  <group position={[placement.x,placement.y,placement.z]} rotation-y={placement.yaw} userData={{miamiAdId:placement.id}}>
   <mesh ref={face} onClick={activate} userData={{miamiAdFace:placement.id}} scale={[width,height,1]} geometry={UNIT_PLANE}><meshBasicMaterial ref={material} map={texture} toneMapped={false}/></mesh>
  </group>
  {streaks&&<group position={[placement.x,0,placement.z]}><primitive object={streaks}/></group>}
 </>
}

type MiamiAdsProps={night:MutableRefObject<number>;video?:boolean;state:MutableRefObject<NightState>;route:MiamiAdRoute;data?:MiamiGeoData;placements?:MiamiAdPlacement[];campaign:CruiseCampaign;onSamples:(samples:MiamiAdSample[])=>void;onActivate:(placement:MiamiAdPlacement)=>void;measurementsEnabled:boolean;vehicleId?:string;vehicleReady?:boolean}
/** The cruise HUD re-renders its parent five times a second; the two callbacks arrive as fresh arrows each time.
 * They are read through a ref, so ~100 ad faces only re-render when an actual input changes. */
const sameAds=(a:MiamiAdsProps,b:MiamiAdsProps)=>(Object.keys(a) as (keyof MiamiAdsProps)[]).every(key=>key==='onSamples'||key==='onActivate'||a[key]===b[key])&&Object.keys(a).length===Object.keys(b).length
export default memo(MiamiAds,sameAds)
function MiamiAds({state,route,data,campaign,onSamples:reportSamples,onActivate:activateAd,measurementsEnabled,vehicleId,vehicleReady,night,video=true,placements:fixed}:MiamiAdsProps){
 const handlers=useRef({reportSamples,activateAd});handlers.current={reportSamples,activateAd}
 const onSamples=useCallback((samples:MiamiAdSample[])=>handlers.current.reportSamples(samples),[]),onActivate=useCallback((placement:MiamiAdPlacement)=>handlers.current.activateAd(placement),[])
 const group=useRef<T.Group>(null),{camera,scene,size}=useThree(),look=useMemo(()=>cruiseLookEnabled(),[]),placements=useMemo(()=>fixed??(data?createMiamiAdPlacements(data,route,campaign,{hero:look}):[]),[fixed,data,route,campaign,look]),duration=useRef(new Map<string,number>()),last=useRef(0),activeProjection=useRef<string|null>(null),latest=useRef<MiamiAdSample[]>([])
 const trees=useMemo(()=>new Map<T.BufferGeometry,PrivateTree>(),[]),objects=useMemo(()=>new WeakMap<T.Mesh,OcclusionObject>(),[])
 const performanceStats=useRef<AdMeasurementPerformance>({measurements:0,averageMs:0,maxMs:0,lastMs:0,lastRayCount:0,lastBlockerCount:0,bvhGeometries:0,bvhBuildMs:0})
 const math=useMemo(()=>({center:new T.Vector3(),normal:new T.Vector3(),eye:new T.Vector3(),direction:new T.Vector3(),corner:new T.Vector3(),ray:new T.Raycaster(),localRay:new T.Ray(),boxHit:new T.Vector3(),worldScale:new T.Vector3(),scaledDirection:new T.Vector3(),sphere:new T.Sphere(),matrix:new T.Matrix4(),frustum:new T.Frustum(),ndc:new T.Vector3()}),[])
 useEffect(()=>()=>releaseCreativeArt(),[])
 // Look v2: the hero screens light the black paint (see vehicle/lampGrid).
 useEffect(()=>{if(look)for(const p of placements)if(p.surface==='hero')registerLamp(p.x,p.y,p.z,0x4fe3ff,2.4)},[look,placements])
 useEffect(()=>{if(!new URLSearchParams(location.search).has('diagnostics'))return;window.__miamiAds=()=>({placements,samples:latest.current,performance:{...performanceStats.current}});return()=>{delete window.__miamiAds}},[placements])
 useEffect(()=>{
  if(vehicleReady===false)return
  // Build private trees during idle time after the already-loaded native car mounts.
  const queue:T.BufferGeometry[]=[],seen=new Set<T.BufferGeometry>();scene.traverse(object=>{if(object instanceof T.Mesh&&rigidVehicle(object)&&opaqueMaterial(object.material as T.Material)){const geometry=object.geometry;if(triangles(geometry)>=2000&&!trees.has(geometry)&&!seen.has(geometry)){seen.add(geometry);queue.push(geometry)}}})
  let alive=true,job=0;const idle=typeof window.requestIdleCallback==='function',schedule=(callback:()=>void)=>idle?window.requestIdleCallback(callback,{timeout:1000}):window.setTimeout(callback,50)
  const build=()=>{if(!alive)return;const source=queue.shift();if(!source)return;const started=performance.now(),built=buildTree(source);if(built)trees.set(source,built)
   performanceStats.current.bvhGeometries=trees.size;performanceStats.current.bvhBuildMs+=performance.now()-started;if(queue.length)job=schedule(build)
  }
  if(queue.length)job=schedule(build)
  return()=>{alive=false;if(idle)window.cancelIdleCallback(job);else window.clearTimeout(job)}
 },[scene,trees,measurementsEnabled,vehicleId,vehicleReady])
 useEffect(()=>()=>{trees.forEach(({geometry})=>geometry.dispose());trees.clear()},[trees])
 // World trees: one per idle slot, queued by the measurement below.
 const worldQueue=useRef({pending:[] as T.BufferGeometry[],queued:new Set<T.BufferGeometry>(),job:0,alive:true})
 const queueWorldTree=(geometry:T.BufferGeometry)=>{const q=worldQueue.current;if(q.queued.has(geometry)||trees.has(geometry))return;q.queued.add(geometry);q.pending.push(geometry)
  if(q.job)return;const idle=typeof window.requestIdleCallback==='function'
  const run=()=>{q.job=0;if(!q.alive)return;const source=q.pending.shift();if(source){const started=performance.now(),built=buildTree(source);if(built)trees.set(source,built);q.queued.delete(source);performanceStats.current.bvhGeometries=trees.size;performanceStats.current.bvhBuildMs+=performance.now()-started}
   if(q.pending.length)q.job=idle?window.requestIdleCallback(run,{timeout:1500}):window.setTimeout(run,60)}
  q.job=idle?window.requestIdleCallback(run,{timeout:1500}):window.setTimeout(run,60)}
 useEffect(()=>{const q=worldQueue.current;q.alive=true;return()=>{q.alive=false;if(q.job){if(typeof window.cancelIdleCallback==='function')window.cancelIdleCallback(q.job);else window.clearTimeout(q.job)}q.job=0;q.pending.length=0;q.queued.clear()}},[])
 useEffect(()=>{if(measurementsEnabled)return;duration.current.clear();const now=performance.now();latest.current=latest.current.map(sample=>({...sample,visible:false,viewable:false,readable:false,visibleDurationMs:0,sampledAt:now}));onSamples(latest.current)},[measurementsEnabled,onSamples])
 useFrame(()=>{
  if(!group.current)return;const p=route.sample(state.current.distance);group.current.position.set(-p.x,-p.y,-p.z);group.current.updateMatrixWorld(true)
  const glow=night.current;litFaces.forEach((lit,material)=>{material.emissiveIntensity=lit.base+lit.night*glow})
  // Low tier (phones, integrated GPUs) measures twice a second; exposure time still accrues by elapsed delta.
  const now=performance.now();if(now-last.current<(document.documentElement.dataset.cruiseQuality==='low'?500:250))return;const measuredAt=now;const delta=Math.min(1000,Math.max(0,now-last.current));last.current=now
  camera.updateMatrixWorld();camera.getWorldPosition(math.eye);math.matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);math.frustum.setFromProjectionMatrix(math.matrix)
  const samples:(MiamiAdSample&{fullyFramed:boolean;occluders:OccluderDiagnostic[]})[]=placements.map(slot=>{
   // A rotating hero screen is measured as the creative it shows right now.
   const placement=heroCreative(slot,Date.now())
   math.center.set(placement.x-p.x,placement.y-p.y,placement.z-p.z);const distance=math.eye.distanceTo(math.center)
   math.normal.set(Math.sin(placement.yaw),0,Math.cos(placement.yaw));math.direction.copy(math.eye).sub(math.center).normalize();const facing=math.normal.dot(math.direction)
   // Beyond its qualifying distance an ad cannot be visible: skip the projection work (most of the 96 highway slots).
   if(distance>=(placement.maxDistance??(placement.surface==='hero'?420:150)))return{placement,visible:false,viewable:false,readable:false,distance,facing,projectedArea:0,pixelWidth:0,pixelHeight:0,occlusion:1,visibleDurationMs:0,sampledAt:now,fullyFramed:false,occluders:[]}
   const centerNdc=math.ndc.copy(math.center).project(camera);let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,front=true
   for(const x of[-.5,.5])for(const y of[-.5,.5]){math.corner.set(math.center.x+Math.cos(placement.yaw)*placement.width*x,math.center.y+placement.height*y,math.center.z-Math.sin(placement.yaw)*placement.width*x).project(camera);front&&=math.corner.z>=-1&&math.corner.z<=1;minX=Math.min(minX,math.corner.x);maxX=Math.max(maxX,math.corner.x);minY=Math.min(minY,math.corner.y);maxY=Math.max(maxY,math.corner.y)}
   const clippedWidth=Math.max(0,Math.min(1,maxX)-Math.max(-1,minX))*size.width/2,clippedHeight=Math.max(0,Math.min(1,maxY)-Math.max(-1,minY))*size.height/2,projectedArea=clippedWidth*clippedHeight/(size.width*size.height)
   const lit=placement.surface!=='projection'||night.current>=.3
   const visible=measurementsEnabled&&lit&&front&&facing>.15&&centerNdc.z>=-1&&centerNdc.z<=1&&math.frustum.containsPoint(math.center)&&clippedWidth>1&&clippedHeight>1&&distance<(placement.maxDistance??(placement.surface==='hero'?420:150))
   return{placement,visible,viewable:false,readable:false,distance,facing,projectedArea,pixelWidth:clippedWidth,pixelHeight:clippedHeight,occlusion:1,visibleDurationMs:0,sampledAt:now,fullyFramed:minX>=-1&&maxX<=1&&minY>=-1&&maxY<=1,occluders:[]}
  })
  const candidates=samples.filter(s=>s.visible).sort((a,b)=>a.distance-b.distance).slice(0,2)
  // Raycast only currently visible, opaque meshes; invisible chunks and helper
  // hitboxes cannot produce occlusion. Vehicle and windshield frame remain included.
  const blockers:OcclusionObject[]=[]
  const farthest=candidates.reduce((distance,sample)=>Math.max(distance,sample.distance+Math.hypot(sample.placement.width/2,sample.placement.height/2)),0)+.2
  // The world and rigid traffic update local transforms earlier this frame. Measure their current pose,
  // matching the pose the renderer will draw; only needed when an ad is in range.
  let inlineBuildMs=0
  const broadStart=performance.now(),costs=measureCosts&&candidates.length?new Map<string,number>():null
  if(candidates.length)scene.updateMatrixWorld(true)
  if(candidates.length)scene.traverse(object=>{if(object instanceof T.Mesh&&!object.userData.adStructure&&!object.userData.noOcclusion&&actualVisible(object)){const materials=Array.isArray(object.material)?object.material:[object.material];if(!materials.some(opaqueMaterial))return
   let record=objects.get(object);if(!record){record={mesh:object,inverse:new T.Matrix4(),box:new T.Box3()};objects.set(object,record)}
   // Exact conservative broad phase: an object whose world-space bounding
   // sphere lies wholly beyond both targets cannot obstruct either ray set.
   if(object instanceof T.InstancedMesh){if(record.sourceGeometry!==object.geometry||record.instanceVersion!==object.instanceMatrix.version||record.instanceCount!==object.count||!object.boundingSphere||!object.boundingBox){object.computeBoundingSphere();object.computeBoundingBox();record.sourceGeometry=object.geometry;record.instanceVersion=object.instanceMatrix.version;record.instanceCount=object.count}math.sphere.copy(object.boundingSphere!)}else{if(!object.geometry.boundingSphere)object.geometry.computeBoundingSphere();math.sphere.copy(object.geometry.boundingSphere!)}
   math.sphere.applyMatrix4(object.matrixWorld);if(math.sphere.center.distanceTo(math.eye)-math.sphere.radius>farthest)return
   record.inverse.copy(object.matrixWorld).invert()
   if(object instanceof T.InstancedMesh){if(!object.boundingBox)object.computeBoundingBox();record.box.copy(object.boundingBox!)}else{if(!object.geometry.boundingBox)object.geometry.computeBoundingBox();record.box.copy(object.geometry.boundingBox!)}
   const built=trees.get(object.geometry)
   if(built&&built.version!==positionVersion(object.geometry)){trees.delete(object.geometry);built.geometry.dispose()}
   record.rigid??=rigidVehicle(object)
   const eligible=record.rigid||worldTree(object)||object instanceof T.InstancedMesh&&treeable(object)
   const instanced=object instanceof T.InstancedMesh
   record.tree=eligible&&!instanced?trees.get(object.geometry)?.tree:undefined
   // A tree costs less to build than one pass of native rays against the same mesh: build up to ~12 ms
   // of them inline per pass, queue the rest for idle time.
   if(eligible&&!trees.has(object.geometry)&&(worldTree(object)||instanced)){
    if(performance.now()-broadStart<12){const started=performance.now(),tree=buildTree(object.geometry);if(tree){trees.set(object.geometry,tree);if(!instanced)record.tree=tree.tree;performanceStats.current.bvhGeometries=trees.size;performanceStats.current.bvhBuildMs+=performance.now()-started}inlineBuildMs+=performance.now()-started}
    else queueWorldTree(object.geometry)
   }
   blockers.push(record)
  }})
  let rayCount=0;const broadMs=performance.now()-broadStart
  for(const sample of candidates){const placement=sample.placement;let blocked=0
   // Two rows across the headline catch narrow cockpit pillars that could
   // fall between the former center/corner probes. Ten actual scene rays.
   for(const x of[-.4,-.2,0,.2,.4])for(const y of[.2,0]){
    math.corner.set(placement.x-p.x+Math.cos(placement.yaw)*placement.width*x,placement.y+placement.height*y,placement.z-p.z-Math.sin(placement.yaw)*placement.width*x);math.direction.copy(math.corner).sub(math.eye);const rayLength=math.direction.length();math.ray.set(math.eye,math.direction.normalize());math.ray.near=.035;math.ray.far=rayLength-.035
    rayCount++;let first:T.Intersection|null=null
    // Exact per-ray box rejection avoids traversing every distant facade or
    // instanced window. Trees accelerate rigid cars and large static world meshes
    // (per-group materials and sides, as native raycasting); instances are box-filtered.
    const ordered:{record:OcclusionObject;entry:number}[]=[]
    for(const record of blockers){
     // The ad a mesh belongs to never changes; resolve it once instead of walking ancestors on every ray.
     if(record.adId===undefined){let node:T.Object3D|null=record.mesh;record.adId=null;while(node){if(node.userData.miamiAdId){record.adId=node.userData.miamiAdId;break}node=node.parent}}
     if(record.adId===placement.id)continue
     math.localRay.copy(math.ray.ray).applyMatrix4(record.inverse);const point=math.localRay.intersectBox(record.box,math.boxHit);if(!point)continue;const entry=record.box.containsPoint(math.localRay.origin)?0:math.boxHit.applyMatrix4(record.mesh.matrixWorld).distanceTo(math.eye);if(entry<=math.ray.far)ordered.push({record,entry})
    }
    ordered.sort((a,b)=>a.entry-b.entry)
    for(const {record,entry}of ordered){if(first&&entry>first.distance)break;const mesh=record.mesh;let hits:T.Intersection[]=[]
     const originalFar=math.ray.far,castStart=performance.now();if(first)math.ray.far=Math.min(originalFar,first.distance)
     if(record.tree){math.localRay.copy(math.ray.ray).applyMatrix4(record.inverse);math.worldScale.setFromMatrixScale(mesh.matrixWorld);math.scaledDirection.copy(math.localRay.direction).multiply(math.worldScale);const scale=math.scaledDirection.length();hits=record.tree.raycast(math.localRay,mesh.material,math.ray.near/scale,math.ray.far/scale).map(hit=>{hit.point.applyMatrix4(mesh.matrixWorld);hit.distance=hit.point.distanceTo(math.eye);hit.object=mesh;return hit})}
     else if(mesh instanceof T.InstancedMesh){math.localRay.copy(math.ray.ray).applyMatrix4(record.inverse);raycastInstances(record,math.ray,math.localRay,hits,trees.get(mesh.geometry)?.tree)}
     else mesh.raycast(math.ray,hits)
     math.ray.far=originalFar
     if(costs){const key=`${mesh.name||mesh.parent?.name||mesh.type}|${Math.round(triangles(mesh.geometry))}${mesh instanceof T.InstancedMesh?`x${mesh.count}`:''}${record.tree?'|bvh':''}`;costs.set(key,(costs.get(key)||0)+performance.now()-castStart)}
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
  // One unobscured motion surface at a time; all others hold still art.
  activeProjection.current=samples.filter(s=>s.viewable&&s.distance<180&&(s.placement.surface==='digital'||s.placement.surface==='projection'&&night.current>=.3)).sort((a,b)=>a.distance-b.distance)[0]?.placement.id??null
  if(!samples.some(s=>s.placement.id===activeProjection.current&&s.placement.campaign.digitalVideo))videos.forEach(entry=>{if(!entry.video.paused)entry.video.pause()})
  latest.current=samples;onSamples(samples)
  const stats=performanceStats.current,elapsed=performance.now()-measuredAt;stats.measurements++;stats.averageMs+=(elapsed-stats.averageMs)/stats.measurements;stats.lastMs=elapsed;stats.maxMs=Math.max(stats.maxMs,elapsed);stats.lastRayCount=rayCount;stats.lastBlockerCount=blockers.length
  if(costs){stats.lastBroadMs=+broadMs.toFixed(1);stats.lastInlineBuildMs=+inlineBuildMs.toFixed(1);stats.slowest=[...costs].sort((a,b)=>b[1]-a[1]).slice(0,6).map(([key,ms])=>`${key} ${ms.toFixed(1)}ms`)}
 })
 // Wet-road reflections of the lit signage; the hero screen owns its own (its tint follows the creative).
 const streaks=useMemo(()=>look?createWetStreaks(placements.flatMap((p):WetLight[]=>p.surface==='billboard'?[{x:p.x,y:p.y,z:p.z,width:2.4,color:'#f2e6cc',intensity:.25}]:p.surface==='blade'?[{x:p.x,y:p.y,z:p.z,width:1,color:p.campaign.creatives.wall.accent,intensity:.35}]:[])):null,[look,placements])
 useEffect(()=>()=>{streaks?.geometry.dispose()},[streaks])
 return <group ref={group} name="MiamiMeasuredAdvertisements"><AdStructure placements={placements}/>{placements.map(placement=><AdFace key={placement.id} placement={placement} onActivate={onActivate} enabled={measurementsEnabled} night={night} active={activeProjection} video={video} look={look}/>)}{streaks&&<primitive object={streaks}/>}</group>
}
