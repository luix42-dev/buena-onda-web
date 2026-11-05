import * as T from 'three'
import type {VehicleFeel} from './vehicle-feel'

const wheelName=/^(RollingWheel|[FR][LR]_WHEEL)$/
const steeringName=/^(STEERING_WHEEL|IslandSteeringWheel|BuenaOndaSteeringWheel|SteeringWheel)$/

/** Preserve each model's native wheel axes/spin while separating the tires from the sprung body. */
export function rigVehicleChassis(root:T.Group,body:T.Group,roadWheels:T.Group){
 root.updateWorldMatrix(true,true)
 const inverse=root.matrixWorld.clone().invert(),nodes:T.Object3D[]=[],steering:T.Object3D[]=[]
 body.traverse(node=>{if(wheelName.test(node.name))nodes.push(node);if(steeringName.test(node.name))steering.push(node)})
 const wheels=nodes.filter(node=>!nodes.some(other=>other!==node&&isAncestor(other,node))).map(node=>{
  const parent=node.parent!,carrier=new T.Group(),turn=new T.Group(),offset=new T.Group()
  carrier.name='SuspensionWheelCarrier'
  const matrix=new T.Matrix4().multiplyMatrices(inverse,parent.matrixWorld)
  matrix.decompose(carrier.position,carrier.quaternion,carrier.scale)
  turn.position.copy(node.position);offset.position.copy(node.position).negate()
  roadWheels.add(carrier);carrier.add(turn);turn.add(offset);offset.add(node)
  const center=node.getWorldPosition(new T.Vector3()).applyMatrix4(inverse)
  const axis=new T.Vector3(0,1,0).applyQuaternion(carrier.quaternion.clone().invert()).normalize()
  return {node,parent,carrier,turn,axis,center,baseY:carrier.position.y,front:false}
 })
 const mid=wheels.reduce((sum,w)=>sum+w.center.z,0)/Math.max(1,wheels.length)
 wheels.forEach(w=>{w.front=w.center.z<mid})
 const cabin=steering.map(node=>({node,base:node.quaternion.clone()})),spin=new T.Quaternion(),z=new T.Vector3(0,0,1)
 return {wheels,
  apply(response:VehicleFeel){
   body.position.y=.55+response.heave;body.rotation.set(response.pitch,0,response.roll)
   for(const wheel of wheels){wheel.turn.quaternion.setFromAxisAngle(wheel.axis,wheel.front?response.frontSteer:0);wheel.carrier.position.y=wheel.baseY+(wheel.front?response.frontRoad:response.rearRoad)}
   for(const wheel of cabin){spin.setFromAxisAngle(z,response.steering);wheel.node.quaternion.copy(wheel.base).multiply(spin)}
  },
  dispose(){for(const wheel of wheels){wheel.parent.add(wheel.node);roadWheels.remove(wheel.carrier)}body.position.y=.55;body.rotation.set(0,0,0)},
 }
}
function isAncestor(parent:T.Object3D,node:T.Object3D){for(let at=node.parent;at;at=at.parent)if(at===parent)return true;return false}
