'use client'
import {useFrame} from '@react-three/fiber'
import {useEffect,useMemo,useRef,type MutableRefObject} from 'react'
import * as T from 'three'
import type {NightState} from '../nightdrive/state'
import {HIGHWAY,highwayPoint,type HighwayRoute} from '@/lib/real-miami/highway'
import {LOOK} from '@/lib/cruise-os/look'
import {createWetStreaks,wetStreakUniforms,type WetLight} from '../miami/wetStreaks'
import {registerLamp} from '../vehicle/lampGrid'
import HighwayTraffic from './HighwayTraffic'

/** Look v2 Highway (authored I-95, Miami): an elevated eight-lane deck at night. Built to be cheaper
 * than the city: one ribbon for both carriageways (markings and light pools in its shader), instanced
 * poles/heads/piers/reflectors, ~24 gantries, a backdrop skyline band and a wrapped point grid for the
 * city below. Recentred on the car each frame like MiamiWorld, so ads and the paint share coordinates. */
type Built={root:T.Group;road:T.MeshStandardMaterial;heads:T.MeshStandardMaterial;dispose:()=>void}
const noRay=(o:T.Object3D)=>{o.raycast=()=>{}}

function ribbon(route:HighwayRoute,from:number,to:number,up:number,down:number,uv:boolean){
 const n=Math.round(route.length/HIGHWAY.step),pos=new Float32Array((n+1)*2*3),uvs=new Float32Array((n+1)*2*2),index:number[]=[]
 for(let i=0;i<=n;i++){const d=i*HIGHWAY.step,a=highwayPoint(route,d,from,up),b=highwayPoint(route,d,to,down)
  pos.set([a.x,a.y,a.z,b.x,b.y,b.z],i*6);uvs.set(uv?[from,d,to,d]:[0,d,1,d],i*4)
  if(i<n){const k=i*2;index.push(k,k+1,k+2,k+1,k+3,k+2)}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('uv',new T.BufferAttribute(uvs,2));g.setIndex(index);g.computeVertexNormals();return g
}
/** Extrude a cross-section (lateral, height pairs) along the route at a lateral offset. */
function extrude(route:HighwayRoute,offset:number,profile:[number,number][]){
 const n=Math.round(route.length/(HIGHWAY.step*2)),m=profile.length,pos=new Float32Array((n+1)*m*3),index:number[]=[]
 for(let i=0;i<=n;i++){const d=i*HIGHWAY.step*2;profile.forEach(([u,y],j)=>{const q=highwayPoint(route,d,offset+u,y);pos.set([q.x,q.y,q.z],(i*m+j)*3)})
  if(i<n)for(let j=0;j<m-1;j++){const a=i*m+j,b=a+m;index.push(a,b,a+1,a+1,b,b+1)}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setIndex(index);g.computeVertexNormals();return g
}
function instanced(geometry:T.BufferGeometry,material:T.Material,matrices:T.Matrix4[]){
 const mesh=new T.InstancedMesh(geometry,material,matrices.length);matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();return mesh
}
const m4=new T.Matrix4(),q=new T.Quaternion(),e=new T.Euler(),v=new T.Vector3(),sc=new T.Vector3()
const place=(x:number,y:number,z:number,yaw:number,sx=1,sy=1,sz=1)=>{e.set(0,yaw,0);q.setFromEuler(e);return new T.Matrix4().compose(v.set(x,y,z),q,sc.set(sx,sy,sz))}

const SIGNS=[
 ['95','NORTH','Downtown Miami','EXIT 2A  ·  1/2 MILE'],['','','Brickell Ave','EXIT 1  ·  1 MILE'],['95','EXPRESS','Biscayne Blvd','TOLL  ·  ALL ELECTRONIC'],
 ['','','NW 8 St / Little Havana','EXIT 3A'],['95','NORTH','Fort Lauderdale','25'],['','','Design District / NW 29 St','EXIT 4  ·  1/4 MILE'],
] as const
function signTexture(index:number){
 const [shield,dir,line,sub]=SIGNS[index%SIGNS.length],c=document.createElement('canvas');c.width=1024;c.height=448
 const g=c.getContext('2d')!;g.fillStyle='#0b6b3f';g.fillRect(0,0,1024,448);g.strokeStyle='#f3f3ee';g.lineWidth=10;g.strokeRect(14,14,996,420)
 let x=60
 if(shield){g.fillStyle='#f3f3ee';g.fillRect(58,62,170,170);g.fillStyle='#1d3f8f';g.fillRect(66,96,154,128);g.fillStyle='#c4262e';g.fillRect(66,70,154,26);g.fillStyle='#f3f3ee';g.font='bold 92px Arial';g.textAlign='center';g.fillText(shield,143,198);g.font='bold 40px Arial';g.fillText(dir,143,276);x=270}
 g.textAlign='left';g.fillStyle='#f3f3ee';g.font='bold 86px Arial';g.fillText(line,x,190,1024-x-50);g.font='bold 52px Arial';g.fillText(sub,x,300,1024-x-50)
 g.fillStyle='#f3f3ee';g.beginPath();g.moveTo(880,350);g.lineTo(940,350);g.lineTo(910,410);g.closePath();g.fill()
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;return t
}
function skylineTexture(){
 const c=document.createElement('canvas');c.width=4096;c.height=512;const g=c.getContext('2d')!
 g.clearRect(0,0,4096,512);let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647
 // Two far rings of towers; downtown/Brickell is the dense, tall cluster around a quarter of the way round.
 for(const [layer,shade]of[[0,'#0a1222'],[1,'#060b16']]as const)for(let x=0;x<4096;){
  const center=Math.exp(-Math.pow((x-1100)/420,2))+.45*Math.exp(-Math.pow((x-1700)/260,2)),w=18+rnd()*46,h=(layer?30:50)+rnd()*(layer?60:90)+center*(layer?220:330)
  g.fillStyle=shade;g.fillRect(x,512-h,w,h)
  for(let wy=512-h+8;wy<506;wy+=7)for(let wx=x+3;wx<x+w-3;wx+=6)if(rnd()<.16+center*.25){g.fillStyle=rnd()<.82?'#ffcf8a':rnd()<.5?'#bfe6ff':'#ff6fae';g.globalAlpha=.5+rnd()*.5;g.fillRect(wx,wy,2,3);g.globalAlpha=1}
  if(center>.6&&rnd()<.25){g.fillStyle=rnd()<.5?LOOK.cyan:'#ff4f9a';g.fillRect(x+2,512-h,w-4,3)}
  x+=w+(layer?2:8)+rnd()*(center>.4?6:40)}
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=T.RepeatWrapping;return t
}

function build(route:HighwayRoute):Built{
 const root=new T.Group();root.name='HighwayI95';const disposables:{dispose:()=>void}[]=[]
 const own=<X extends {dispose:()=>void}>(x:X)=>{disposables.push(x);return x}
 const L=HIGHWAY,lanes=L.laneWidth,edge=lanes*2,far=L.oncoming
 // 1. One deck ribbon for both carriageways, shoulders and the median; markings + light pools in the shader.
 const road=own(new T.MeshStandardMaterial({color:'#1b2029',roughness:.34,metalness:.08}))
 road.onBeforeCompile=shader=>{
  shader.uniforms.uNight=roadNight
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vRoad;').replace('#include <uv_vertex>','#include <uv_vertex>\nvRoad=uv;')
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
varying vec2 vRoad; uniform float uNight;
float hline(float u,float c,float w){float a=fwidth(u);return 1.-smoothstep(w*.5,w*.5+a,abs(u-c));}
float dash(float s){return step(fract(s/12.),.25);}
float pool(float s,float u,float off,float lane){float d=(fract((s-off)/${L.lampEvery}.+.5)-.5)*${L.lampEvery}.;return exp(-d*d/110.)*exp(-(u-lane)*(u-lane)/34.);}`)
  .replace('#include <map_fragment>',`#include <map_fragment>
 float u=vRoad.x,s=vRoad.y;
 vec3 white=vec3(.86,.86,.82),yellow=vec3(.86,.68,.22);
 float lines=0.;vec3 paint=white;
 // Our carriageway (centre 0): dashed lane lines, yellow left edge, white right edge.
 for(int i=-1;i<=1;i++)lines=max(lines,hline(u,float(i)*${lanes},.14)*dash(s));
 float yl=hline(u,-${edge},.16)+hline(u,${far}+${edge},.16);
 lines=max(lines,hline(u,${edge},.16));
 for(int i=-1;i<=1;i++)lines=max(lines,hline(u,${far}+float(i)*${lanes},.14)*dash(s+6.));
 lines=max(lines,hline(u,${far}-${edge},.16));
 float median=step(-${L.barrier+.9},u)*step(u,-${L.barrier-.3});
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.16,.16,.17),median);
 diffuseColor.rgb=mix(diffuseColor.rgb,white,lines*.85);
 diffuseColor.rgb=mix(diffuseColor.rgb,yellow,clamp(yl,0.,1.)*.85);`)
  .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
 float lit=pool(s,u,0.,-${edge+1.1})+pool(s,u,${(L.lampEvery/2).toFixed(1)},${edge+1.4})+pool(s,u,0.,${far+edge+1.1});
 totalEmissiveRadiance+=vec3(1.,.62,.3)*lit*.16*uNight;`)
  .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
 roughnessFactor=clamp(roughnessFactor+.18*sin(vRoad.y*.21+sin(vRoad.x*.9)*2.)*sin(vRoad.y*.047),.12,.7);`)
 }
 const deck=new T.Mesh(own(ribbon(route,far-L.barrier-.4,L.barrier+.6,0,0,true)),road);deck.name='I95Deck';noRay(deck);root.add(deck)
 // 2. Concrete: fascia under both deck edges, jersey barriers (right, median pair, far left), piers to the grid.
 const concrete=own(new T.MeshStandardMaterial({color:'#4a4f57',roughness:.85}))
 const jersey:[number,number][]=[[-.3,0],[-.22,.25],[-.1,.82],[.1,.82],[.22,.25],[.3,0]]
 for(const offset of[L.barrier+.3,-L.barrier,-L.barrier-.6,far-L.barrier]){const b=new T.Mesh(own(extrude(route,offset,jersey)),concrete);noRay(b);root.add(b)}
 for(const [offset,side]of[[L.barrier+.6,1],[far-L.barrier-.4,-1]]as const){const f=new T.Mesh(own(extrude(route,offset,[[0,0],[side*.05,-1.9]])),concrete);noRay(f);root.add(f)}
 const piers:T.Matrix4[]=[];for(let d=0;d<route.length;d+=L.pierEvery)for(const u of[0,far]){const p=highwayPoint(route,d,u);piers.push(place(p.x,-(L.deck+1.9)/2,p.z,p.yaw,2.2,L.deck-1.9,2.2))}
 const pierMesh=instanced(own(new T.BoxGeometry(1,1,1)),concrete,piers);noRay(pierMesh);root.add(pierMesh)
 // 3. Sodium lamps: median poles with arms over both carriageways, right-shoulder poles offset half a spacing.
 const steel=own(new T.MeshStandardMaterial({color:'#5d636b',roughness:.55,metalness:.6}))
 const heads=own(new T.MeshStandardMaterial({color:'#2b2622',emissive:LOOK.sodium,emissiveIntensity:2.2,toneMapped:false}))
 const poles:T.Matrix4[]=[],arms:T.Matrix4[]=[],headMats:T.Matrix4[]=[],wet:WetLight[]=[]
 const lamp=(d:number,base:number,reach:number)=>{const p=highwayPoint(route,d,base),h=highwayPoint(route,d,reach,10.9);poles.push(place(p.x,5.5,p.z,p.yaw,.22,11,.22));const mid=highwayPoint(route,d,(base+reach)/2,11.2);arms.push(place(mid.x,11.2,mid.z,p.yaw,Math.abs(reach-base),.14,.14))
  headMats.push(place(h.x,10.95,h.z,p.yaw,.9,.16,.42));registerLamp(h.x,10.9,h.z,0xffb15c,1);wet.push({x:h.x,y:10.9,z:h.z,width:1.1,color:LOOK.sodium,intensity:.32})}
 for(let d=0;d<route.length;d+=L.lampEvery){lamp(d,-L.barrier-.3,-edge-1.1);lamp(d,-L.barrier-.3,far+edge+1.1);lamp(d+L.lampEvery/2,L.barrier+.7,edge+1.4)}
 const poleGeo=own(new T.BoxGeometry(1,1,1));for(const [list,mat]of[[poles,steel],[arms,steel],[headMats,heads]]as const){const mesh=instanced(poleGeo,mat,list);noRay(mesh);root.add(mesh)}
 const streaks=createWetStreaks(wet);if(streaks){own(streaks.geometry);root.add(streaks)}
 // 4. Reflectors on the barriers: amber on the median, white on the right.
 const amber=own(new T.MeshBasicMaterial({color:'#ffae3a',toneMapped:false})),pale=own(new T.MeshBasicMaterial({color:'#dfe6ee',toneMapped:false}))
 const reflect=(u:number)=>{const list:T.Matrix4[]=[];for(let d=0;d<route.length;d+=25){const p=highwayPoint(route,d,u,.62);list.push(place(p.x,.62,p.z,p.yaw,.09,.09,.04))}return list}
 for(const [u,mat]of[[-L.barrier+.32,amber],[L.barrier,pale]]as const){const r=instanced(poleGeo,mat,reflect(u));noRay(r);root.add(r)}
 // 5. Overhead gantries with green guide signs (original artwork; the 95 shield is the public route marker).
 const signMats:T.Material[]=[]
 for(let d=700,i=0;d<route.length;d+=L.gantryEvery,i++){
  const p=highwayPoint(route,d,0),posts=[L.barrier+.9,-L.barrier+.4]
  for(const u of posts){const q=highwayPoint(route,d,u);const post=new T.Mesh(poleGeo,steel);post.position.set(q.x,3.6,q.z);post.rotation.y=p.yaw;post.scale.set(.45,7.2,.45);root.add(post)}
  const beam=new T.Mesh(poleGeo,steel);const mid=highwayPoint(route,d,(posts[0]+posts[1])/2);beam.position.set(mid.x,7.1,mid.z);beam.rotation.y=p.yaw;beam.scale.set(posts[0]-posts[1],.7,.5);root.add(beam)
  for(const [k,u]of[[0,-4.6],[1,4.2]]as const){const map=own(signTexture(i*2+k)),mat=own(new T.MeshStandardMaterial({map,emissive:'#ffffff',emissiveMap:map,emissiveIntensity:.42,roughness:.6}));signMats.push(mat)
   const q=highwayPoint(route,d,u);const sign=new T.Mesh(own(new T.PlaneGeometry(6.4,2.8)),mat);sign.position.set(q.x,5.6,q.z);sign.rotation.y=p.yaw;sign.position.x+=Math.sin(p.yaw)*.3;sign.position.z+=Math.cos(p.yaw)*.3;root.add(sign)}
 }
 return {root,road,heads,dispose:()=>disposables.forEach(x=>x.dispose())}
}
const roadNight={value:1}

/** The street grid fourteen metres below, as wrapped points around the car: endless and one draw. */
function GroundLights({route,state}:{route:HighwayRoute;state:MutableRefObject<NightState>}){
 const points=useMemo(()=>{
  const tile=2400,list:number[]=[],tints:number[]=[];let seed=3;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647
  for(let gx=-tile/2;gx<tile/2;gx+=110)for(let z=-tile/2;z<tile/2;z+=14+rnd()*10){if(rnd()<.18)continue;list.push(gx+(rnd()-.5)*3,0,z);const w=rnd()<.8;tints.push(w?1:.75,w?.66:.85,w?.34:1)}
  for(let gz=-tile/2;gz<tile/2;gz+=95)for(let x=-tile/2;x<tile/2;x+=14+rnd()*10){if(rnd()<.18)continue;list.push(x,0,gz+(rnd()-.5)*3);const w=rnd()<.8;tints.push(w?1:.75,w?.66:.85,w?.34:1)}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(list,3));g.setAttribute('tint',new T.Float32BufferAttribute(tints,3))
  const material=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:{uCar:{value:new T.Vector2()},uTile:{value:tile},uNight:roadNight},
   vertexShader:`attribute vec3 tint;uniform vec2 uCar;uniform float uTile;varying vec3 vTint;varying float vFade;
    void main(){vec2 p=mod(position.xz-uCar+uTile*.5,uTile)-uTile*.5;vec4 mv=modelViewMatrix*vec4(p.x,position.y,p.y,1.);float d=length(p);
     vFade=smoothstep(1150.,500.,d)*smoothstep(25.,60.,d);vTint=tint;gl_PointSize=clamp(260./-mv.z,1.,3.5);gl_Position=projectionMatrix*mv;}`,
   fragmentShader:`uniform float uNight;varying vec3 vTint;varying float vFade;void main(){vec2 c=gl_PointCoord-.5;float a=1.-smoothstep(.2,.5,length(c));gl_FragColor=vec4(vTint*a*vFade*(.25+.75*uNight)*.8,1.);}`})
  const mesh=new T.Points(g,material);mesh.frustumCulled=false;noRay(mesh);return mesh
 },[])
 useEffect(()=>()=>{points.geometry.dispose();(points.material as T.Material).dispose()},[points])
 // Wrap around the car's absolute position; the mesh itself sits at the recentred origin.
 useFrame(()=>{const u=(points.material as T.ShaderMaterial).uniforms,p=route.sample(state.current.distance);u.uCar.value.set(p.x,p.z);points.position.set(0,-HIGHWAY.deck,0)})
 return <primitive object={points}/>
}

/** Skyline band around the camera, just inside StreetSky's 200 m dome and drawn right after it (alpha-tested,
 * no depth write), so it replaces the horizon glow but never covers nearer geometry. World-fixed orientation;
 * its base sits a little under eye level so the towers rise behind the far end of the road. */
function Skyline(){
 const mesh=useRef<T.Mesh>(null),map=useMemo(skylineTexture,[])
 useEffect(()=>()=>map.dispose(),[map])
 useFrame(({camera})=>{if(mesh.current)mesh.current.position.set(camera.position.x,camera.position.y-2+30,camera.position.z)})
 return <mesh ref={mesh} renderOrder={11} raycast={()=>{}} frustumCulled={false}><cylinderGeometry args={[190,190,60,96,1,true]}/><meshBasicMaterial map={map} alphaTest={.35} side={T.BackSide} fog={false} depthWrite={false} toneMapped={false} color="#cfc9c2"/></mesh>
}

export default function HighwayWorld({state,route,blend,onReady}:{state:MutableRefObject<NightState>;route:HighwayRoute;blend:MutableRefObject<number>;onReady?:()=>void}){
 const group=useRef<T.Group>(null),built=useMemo(()=>build(route),[route])
 useEffect(()=>()=>built.dispose(),[built])
 useEffect(()=>{onReady?.()},[onReady])
 useEffect(()=>{const w=window as Window&{__highway?:()=>unknown};w.__highway=()=>({length:route.length,meters:state.current.distance%route.length,street:route.sample(state.current.distance).streetName});return()=>{delete w.__highway}},[route,state])
 useFrame(()=>{
  const s=state.current,p=route.sample(s.distance),night=blend.current
  group.current?.position.set(-p.x,-p.y,-p.z)
  roadNight.value=night;built.heads.emissiveIntensity=.2+night*1.4
  // The city normally drives the shared wet-reflection uniforms; on the highway this world does.
  wetStreakUniforms.strength.value=night;wetStreakUniforms.time.value=s.elapsed
 })
 return <><group ref={group}><primitive object={built.root}/><HighwayTraffic route={route} state={state} blend={blend}/></group><GroundLights route={route} state={state}/><Skyline/></>
}
