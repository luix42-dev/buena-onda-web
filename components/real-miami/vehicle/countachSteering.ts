import * as T from 'three'

// Measured from the licensed GLB after its existing 4.14 m normalization.
export const COUNTACH_STEERING_CENTER=new T.Vector3(-.3392,.67935,-.44345)
export const COUNTACH_STEERING_AXIS=new T.Vector3(0,.337,.942).normalize()
export function rigCountachSteering(scene:T.Object3D){
  scene.updateMatrixWorld(true)
  const pivot=new T.Group();pivot.name='CountachSteeringWheel'
  pivot.position.copy(COUNTACH_STEERING_CENTER)
  pivot.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),COUNTACH_STEERING_AXIS)
  const base=pivot.quaternion.clone(),inverse=base.clone().invert(),owned:T.BufferGeometry[]=[],point=new T.Vector3()
  let triangles=0
  const meshes:T.Mesh[]=[];scene.traverse(o=>{if(o instanceof T.Mesh&&!Array.isArray(o.material))meshes.push(o)})
  for(const mesh of meshes){
    const source=mesh.geometry,pos=source.attributes.position,index=source.index,keep:number[]=[],move:number[]=[]
    const inside=(i:number)=>{point.fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld).sub(pivot.position);const axial=point.dot(COUNTACH_STEERING_AXIS);return Math.abs(axial)<.06&&point.lengthSq()-axial*axial<.18*.18}
    for(let i=0;i<(index?.count??pos.count);i+=3){const ids=[0,1,2].map(j=>index?index.getX(i+j):i+j);(ids.every(inside)?move:keep).push(...ids)}
    if(!move.length)continue
    triangles+=move.length/3
    const body=source.clone();body.setIndex(keep);body.clearGroups();mesh.geometry=body;owned.push(body)
    const part=new T.BufferGeometry(),normalMatrix=new T.Matrix3().getNormalMatrix(mesh.matrixWorld)
    for(const [name,attribute]of Object.entries(source.attributes)){
      if(name==='tangent')continue
      const copy=new T.Float32BufferAttribute(new Float32Array(move.length*attribute.itemSize),attribute.itemSize,attribute.normalized)
      move.forEach((vertex,i)=>{for(let k=0;k<attribute.itemSize;k++)copy.setComponent(i,k,attribute.getComponent(vertex,k))})
      if(name==='position')for(let i=0;i<copy.count;i++){point.fromBufferAttribute(copy,i).applyMatrix4(mesh.matrixWorld).sub(pivot.position).applyQuaternion(inverse);copy.setXYZ(i,point.x,point.y,point.z)}
      if(name==='normal')for(let i=0;i<copy.count;i++){point.fromBufferAttribute(copy,i).applyMatrix3(normalMatrix).applyQuaternion(inverse).normalize();copy.setXYZ(i,point.x,point.y,point.z)}
      part.setAttribute(name,copy)
    }
    owned.push(part);pivot.add(new T.Mesh(part,mesh.material))
  }
  return {pivot,base,triangles,dispose:()=>owned.forEach(g=>g.dispose())}
}
