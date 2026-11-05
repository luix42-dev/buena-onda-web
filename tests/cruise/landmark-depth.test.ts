import test from 'node:test'
import assert from 'node:assert/strict'
import * as T from 'three'
import {createMiamiLandmark} from '../../components/real-miami/miami/MiamiLandmarks'

test('experimental facade has genuine openings and recessed geometry; default stays solid',()=>{
  const gradient={addColorStop(){}}
  const context=new Proxy({}, {get:(_target,key)=>String(key).startsWith('create')?()=>gradient:()=>{},set:()=>true})
  const prior=globalThis.document
  Object.assign(globalThis,{document:{createElement:()=>({width:0,height:0,getContext:()=>context})}})
  const building={id:1,height:16.1,points:[[-6,0],[6,0],[6,-15],[-6,-15],[-6,0]] as [number,number][]}
  const config={kind:'colony' as const,name:'Test Colony',bodyHeight:10.8,height:16.1,levels:3,streetFacing:{edge:[[-6,0],[6,0]] as [[number,number],[number,number]],normal:[0,1] as [number,number]}}
  const original=createMiamiLandmark(building,config)
  const enhanced=createMiamiLandmark(building,config,undefined,true)
  try{
    // Away from mullions/curtains, the ray must pass through the original wall
    // plane and hit the actual room behind it, rather than a painted front pane.
    const x=-3.48+.22,y=5.328+.35
    const hit=(group:T.Group)=>{group.updateMatrixWorld(true);return new T.Raycaster(new T.Vector3(x,y,5),new T.Vector3(0,0,-1)).intersectObject(group,true).find(hit=>!((hit.object as T.Mesh).material as T.Material).transparent)!}
    assert.ok(hit(original.group).point.z>=0)
    assert.ok(hit(enhanced.group).point.z<-.5)
    assert.equal(enhanced.group.position.x,original.group.position.x)
    assert.equal(enhanced.group.position.z,original.group.position.z)
    const geometryStats=(group:T.Group)=>{let meshes=0,triangles=0;group.traverse(object=>{if(object instanceof T.Mesh){meshes++;triangles+=(object.geometry.index?.count??object.geometry.getAttribute('position').count)/3}});return {meshes,triangles}}
    console.log(JSON.stringify({original:geometryStats(original.group),enhanced:geometryStats(enhanced.group)}))
  }finally{original.dispose();enhanced.dispose();Object.assign(globalThis,{document:prior})}
})
