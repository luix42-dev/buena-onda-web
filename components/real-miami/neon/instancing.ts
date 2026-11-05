import * as T from 'three'

/** three.js caches vertex-array state per (geometry, program). InstancedMeshes that share one geometry and
 * one program fight over that cache: every draw re-binds every attribute because the instanceMatrix
 * differs. A shallow view (same BufferAttributes, so the same GPU buffers) gives each mesh its own state.
 * Measured on Retrowave: ~1,300 vertexAttribPointer calls per frame before this. */
export function ownGeometry(source: T.BufferGeometry) {
  const view = new T.BufferGeometry()
  view.setIndex(source.index)
  for (const [name, attribute] of Object.entries(source.attributes)) view.setAttribute(name, attribute)
  for (const group of source.groups) view.addGroup(group.start, group.count, group.materialIndex)
  view.boundingBox = source.boundingBox; view.boundingSphere = source.boundingSphere
  return view
}

/** An empty InstancedMesh still costs a program bind and a full uniform upload before three skips the draw. */
export function hideEmpty(...meshes: T.InstancedMesh[]) { for (const mesh of meshes) if (mesh.userData.enabled !== false) mesh.visible = mesh.count > 0 }

const noRaycast = () => {}
/** Only listed objects take pointer rays; R3F otherwise intersects every descendant of a handler-bearing group on each move. */
export function raycastOnly(root: T.Object3D, keep: (object: T.Object3D) => boolean) {
  root.traverse(object => { if (!keep(object)) object.raycast = noRaycast })
}
