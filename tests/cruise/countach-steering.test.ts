import test from 'node:test'
import assert from 'node:assert/strict'
import * as T from 'three'
import {loadCountachGeometry} from '../../scripts/countach-geometry.mjs'
import {rigCountachSteering} from '../../components/real-miami/vehicle/countachSteering'

test('actual Countach steering is isolated without deleting triangles or changing cached buffers',()=>{
 const cached=loadCountachGeometry() as T.Group,scene=cached.clone(true)
 const indices:T.BufferAttribute[]=[]
 cached.traverse(o=>{if(o instanceof T.Mesh&&o.geometry.index)indices.push(o.geometry.index)})
 const signature=()=>indices.map(i=>[i.count,Array.from(i.array).reduce((a,b)=>a+b,0)])
 const before=JSON.stringify(signature())
 const count=(object:T.Object3D)=>{let total=0;object.traverse(o=>{if(o instanceof T.Mesh)total+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3});return total}
 const total=count(scene),rig=rigCountachSteering(scene)
 console.log(JSON.stringify({triangles:rig.triangles,parts:rig.pivot.children.map(o=>({material:((o as T.Mesh).material as T.Material).name,triangles:(o as T.Mesh).geometry.attributes.position.count/3}))}))
 try{
  assert.ok(rig.triangles>1000,'real steering ring/spokes were not isolated')
  assert.equal(count(scene)+count(rig.pivot),total,'triangle conservation')
  assert.equal(JSON.stringify(signature()),before,'cached source geometry was modified')
  rig.pivot.updateMatrixWorld(true)
  const bounds=new T.Box3().setFromObject(rig.pivot),size=bounds.getSize(new T.Vector3())
  assert.ok(size.x>.30&&size.x<.38)
  assert.ok(size.y>.29&&size.y<.38)
  assert.ok(size.z<.18,'stationary steering column/dashboard was included')
  console.log(JSON.stringify({steeringTriangles:rig.triangles,parts:rig.pivot.children.length,diameter:size.toArray()}))
 }finally{rig.dispose();cached.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose()})}
})
