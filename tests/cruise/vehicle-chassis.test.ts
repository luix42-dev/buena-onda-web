import test from 'node:test'
import assert from 'node:assert/strict'
import * as T from 'three'
import {rigVehicleChassis} from '../../lib/cruise-os/vehicle-chassis'
import {createVehicleFeel} from '../../lib/cruise-os/vehicle-feel'

test('suspension preserves tire contact and native spin under rotated/scaled model parents',()=>{
 const root=new T.Group(),body=new T.Group(),offset=new T.Group(),model=new T.Group(),road=new T.Group()
 root.position.set(8,0,-20);root.rotation.y=.7;root.add(body,road);body.position.y=.55;body.add(offset);offset.position.y=-.55;offset.add(model)
 model.position.set(0,.03,0);model.rotation.y=Math.PI;model.scale.setScalar(.94)
 const nodes=['FL_WHEEL','FR_WHEEL','RL_WHEEL','RR_WHEEL'].map((name,i)=>{const n=new T.Group();n.name=name;n.position.set(i%2?1:-1,.4,i<2?1.2:-1.2);model.add(n);return n})
 root.updateMatrixWorld(true)
 const positions=nodes.map(n=>n.getWorldPosition(new T.Vector3()))
 const rig=rigVehicleChassis(root,body,road)
 assert.equal(rig.wheels.length,4)
 nodes.forEach((n,i)=>assert.ok(n.getWorldPosition(new T.Vector3()).distanceTo(positions[i])<1e-8))
 const response={...createVehicleFeel(),pitch:-.05,roll:.07,frontSteer:.14}
 rig.apply(response);root.updateMatrixWorld(true)
 nodes.forEach((n,i)=>assert.ok(n.getWorldPosition(new T.Vector3()).distanceTo(positions[i])<1e-8,'body pitch/roll must not lift a tire'))
 assert.equal(rig.wheels.filter(w=>w.front).length,2)
 for(const wheel of rig.wheels){wheel.node.rotation.x=.6;assert.ok(Math.abs(wheel.turn.quaternion.angleTo(new T.Quaternion())-(wheel.front?.14:0))<1e-8)}
 assert.equal(body.rotation.x,-.05);assert.equal(body.rotation.z,.07)
 rig.apply(createVehicleFeel());assert.equal(body.rotation.x,0);assert.equal(body.rotation.z,0)
 rig.dispose();assert.equal(road.children.length,0);nodes.forEach(n=>assert.equal(n.parent,model))
})

test('extracted RollingWheel pivots retain their position for odometer animation',()=>{
 const root=new T.Group(),body=new T.Group(),road=new T.Group();root.add(body,road)
 const pivot=new T.Group();pivot.name='RollingWheel';pivot.position.set(-.8,.35,-1.25);body.add(pivot)
 const rear=new T.Group();rear.name='RollingWheel';rear.position.set(-.8,.35,1.25);body.add(rear)
 const rig=rigVehicleChassis(root,body,road)
 assert.equal(pivot.position.z,-1.25)
 rig.apply({...createVehicleFeel(),frontRoad:.004})
 assert.ok(Math.abs(pivot.getWorldPosition(new T.Vector3()).y-.354)<1e-8)
 rig.dispose()
})
