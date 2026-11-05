import * as T from 'three'

/** Remove only the center mirror triangles from a cloned licensed car model. */
export function hideRearviewMirror(scene: T.Object3D, meshName: string, area: T.Box3) {
 scene.updateMatrixWorld(true)
 const mesh=scene.getObjectByName(meshName)
 if(!(mesh instanceof T.Mesh))return null
 const source=mesh.geometry as T.BufferGeometry,position=source.getAttribute('position'),index=source.index
 const count=index?.count??position.count,kept:number[]=[],point=new T.Vector3()
 let removed=0
 for(let i=0;i<count;i+=3){
  let inside=true
  for(let j=0;j<3;j++){
   const vertex=index?index.getX(i+j):i+j
   point.fromBufferAttribute(position,vertex).applyMatrix4(mesh.matrixWorld)
   if(!area.containsPoint(point))inside=false
  }
  if(inside)removed++
  else for(let j=0;j<3;j++)kept.push(index?index.getX(i+j):i+j)
 }
 if(!removed)return null
 const geometry=source.clone()
 geometry.setIndex(kept)
 mesh.geometry=geometry
 return geometry
}
