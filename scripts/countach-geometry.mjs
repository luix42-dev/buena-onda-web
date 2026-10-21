/** Geometry-only inspection of our existing GLB. Does not decode its textures. */
import {readFileSync} from 'node:fs'
import * as T from 'three'
export function loadCountachGeometry(){
 const bytes=readFileSync('public/real-miami/vehicle/countach-1988/countach.glb')
 const length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length)),bin=bytes.subarray(28+length)
 function attribute(index){
  const a=json.accessors[index],v=json.bufferViews[a.bufferView],size={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type]
  const types={5126:['getFloat32',4],5125:['getUint32',4],5123:['getUint16',2],5121:['getUint8',1]},[method,component]=types[a.componentType]
  const view=new DataView(bin.buffer,bin.byteOffset,bin.byteLength),out=[]
  for(let i=0;i<a.count;i++)for(let j=0;j<size;j++)out.push(view[method]((v.byteOffset||0)+(a.byteOffset||0)+i*(v.byteStride||size*component)+j*component,true))
  return out
 }
 const materials=json.materials.map(m=>new T.MeshStandardMaterial({name:m.name})),scene=new T.Group()
 function node(index){
  const n=json.nodes[index],o=new T.Group()
  if(n.matrix)o.applyMatrix4(new T.Matrix4().fromArray(n.matrix));else{if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale)}
  if(n.mesh!==undefined)for(const p of json.meshes[n.mesh].primitives){
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(attribute(p.attributes.POSITION),3))
   if(p.attributes.NORMAL!==undefined)g.setAttribute('normal',new T.Float32BufferAttribute(attribute(p.attributes.NORMAL),3))
   if(p.indices!==undefined)g.setIndex(attribute(p.indices))
   o.add(new T.Mesh(g,materials[p.material]))
  }
  for(const child of n.children||[])o.add(node(child));return o
 }
 for(const root of json.scenes[json.scene||0].nodes)scene.add(node(root))
 scene.rotation.y-=Math.PI/2;scene.updateMatrixWorld(true)
 const bounds=new T.Box3().setFromObject(scene),center=bounds.getCenter(new T.Vector3()),scale=4.14/bounds.getSize(new T.Vector3()).z
 scene.scale.multiplyScalar(scale);scene.position.set(-center.x*scale,-bounds.min.y*scale+.015,-center.z*scale);scene.updateMatrixWorld(true)
 return scene
}
