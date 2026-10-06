import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { getVehicle, VEHICLE_OPTIONS } from '../lib/cruise/vehicles'

assert.deepEqual(VEHICLE_OPTIONS.map(vehicle => vehicle.id), ['coastal-coupe', 'classic-coupe', 'island-trail'])
for (const vehicle of VEHICLE_OPTIONS) {
  assert.equal(vehicle.wheels.length, 4)
  assert.equal(new Set(vehicle.wheels.map(wheel => wheel.node)).size, 4)
  assert.ok(vehicle.driverSeat && vehicle.radioTargets && vehicle.lightControlTarget)
  assert.ok(Object.values(vehicle.radioTargets).flat().every(Number.isFinite))
  for (const anchor of Object.values(vehicle.cameraAnchors)) {
    assert.ok([...anchor.position, ...anchor.target].every(Number.isFinite))
  }
  const data = readFileSync(`public${vehicle.model}`)
  if (vehicle.id === 'island-trail') {
    const manifest=JSON.parse(data.toString('utf8'))
    assert.equal(manifest.kind,'original-procedural-component')
    assert.equal(manifest.referencePhotosRedistributed,false)
    assert.ok(manifest.wheelbase>2.3 && manifest.wheelbase<2.4)
    assert.ok(vehicle.cameraAnchors.driver.position[1]>1.6)
    assert.ok(vehicle.cameraAnchors.driver.position[0]<0)
    assert.ok(readFileSync(manifest.source,'utf8').includes('PhysicalRadio'))
    continue
  }
  assert.equal(data.toString('ascii', 0, 4), 'glTF')
  const json = JSON.parse(data.toString('utf8', 20, 20 + data.readUInt32LE(12)))
  for (const wheel of vehicle.wheels) assert.ok(json.nodes.some((node: { name?: string }) => node.name === wheel.node), wheel.node)
  if (vehicle.id === 'classic-coupe') {
    const triangles = json.meshes.reduce((sum: number, mesh: { primitives: { indices: number }[] }) =>
      sum + mesh.primitives.reduce((n, primitive) => n + json.accessors[primitive.indices].count / 3, 0), 0)
    assert.equal(triangles, 267109)
    assert.ok(data.length <= 1941060)
    assert.ok(json.extensionsRequired.includes('EXT_meshopt_compression'))
    assert.ok(json.nodes.some((node: { name?: string }) => node.name === vehicle.steeringWheelNode))
    assert.ok(vehicle.wheels.every(wheel => wheel.axis[0] === 1))
  }
}
assert.equal(getVehicle('classic-coupe').model, getVehicle('classic-coupe').lowModel)
assert.ok(getVehicle('classic-coupe').cameraAnchors.driver.position[0] < 0)
console.log('Vehicle registry and classic candidate budgets passed')
