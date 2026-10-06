import type { CruiseVehicleId, VehicleDefinition } from './types'

const wheelNames = ['FL_WHEEL', 'FR_WHEEL', 'RL_WHEEL', 'RR_WHEEL'] as const

/** Camera anchors are meters in driving-local space: +Y up, -Z forward. */
export const VEHICLES: Readonly<Record<CruiseVehicleId, VehicleDefinition>> = {
  'coastal-coupe': {
    id: 'coastal-coupe', label: 'Coastal coupe',
    model: '/cruise/vehicle/rx7-fc-optimized.glb',
    scale: 4.3 / 4.319832311051291, rotation: [0, Math.PI, 0], groundOffset: 0.01,
    wheels: wheelNames.map(node => ({ node, radius: 0.316, axis: [0, 0, 1] as const, steering: node.startsWith('F') })),
    cameraAnchors: {
      chase: { position: [0.85, 1.85, 6.7], target: [-0.2, 0.9, -8] },
      hood: { position: [0, 1.05, -1.05], target: [0, 1.25, -45] },
      driver: { position: [-0.36, 1.12, 0.25], target: [-0.36, 1.15, -35] },
      side: { position: [-5.6, 1.5, 1.8], target: [0, 0.72, -0.35] },
      lowRear: { position: [0.45, 0.66, 6.1], target: [0, 0.7, -3.8] },
    },
    driverSeat: { position: [0.36, 0.42, -0.22] }, steeringWheelNode: 'BuenaOndaSteeringWheel',
    radioTargets: { tuning: [-0.13, 0.79, 0.18], volume: [0.13, 0.79, 0.18], preset: [0, 0.755, 0.18] }, lightControlTarget: [0.57, 0.82, 0.18],
    popupLidNodes: [], lampNodes: [], soundProfile: 'coupe',
  },
  'classic-coupe': {
    id: 'classic-coupe', label: 'Classic coupe',
    model: '/cruise/vehicle/gto-candidate/gto-low.glb',
    lowModel: '/cruise/vehicle/gto-candidate/gto-low.glb',
    scale: 1, rotation: [0, 0, 0], groundOffset: 0.045,
    wheels: wheelNames.map(node => ({ node, radius: 0.351077, axis: [1, 0, 0] as const, steering: node.startsWith('R') })),
    cameraAnchors: {
      chase: { position: [0.95, 2.05, 7.6], target: [-0.2, 0.95, -8] },
      hood: { position: [0, 1.17, -1.3], target: [0, 1.25, -45] },
      driver: { position: [-0.3024, 1.29, 0.042], target: [-0.3024, 1.32, -35.208] },
      side: { position: [-6.3, 1.65, 1.8], target: [0, 0.78, -0.2] },
      lowRear: { position: [0.5, 0.76, 7], target: [0, 0.75, -3.8] },
    },
    driverSeat: { position: [-0.3024, 0.5454, 0.012] }, steeringWheelNode: 'STEERING_WHEEL',
    cockpitTransform: { position: [0.0576, 0.1254, -0.208], rotation: [0, Math.PI, 0] },
    radioTargets: { tuning: [0.1876, 0.9154, -0.388], volume: [-0.0724, 0.9154, -0.388], preset: [0.0576, 0.8804, -0.388] },
    lightControlTarget: [-0.5124, 0.9454, -0.388],
    popupLidNodes: [], lampNodes: [], soundProfile: 'classic',
  },
  'island-trail': {
    id: 'island-trail', label: 'Island Trail',
    // Original component-built vehicle; this metadata URI is never GLTF-loaded.
    model: '/cruise/vehicle/jeep/manifest.json',
    scale: 1, rotation: [0, 0, 0], groundOffset: 0,
    wheels: wheelNames.map(node => ({ node, radius: 0.394, axis: [1, 0, 0] as const, steering: node.startsWith('F') })),
    cameraAnchors: {
      chase: { position: [0.88, 2.36, 6.65], target: [-0.18, 1.12, -8] },
      hood: { position: [0, 1.64, -.86], target: [0, 1.55, -45] },
      driver: { position: [-.43, 1.73, .38], target: [-.43, 1.58, -35] },
      side: { position: [-5.5, 1.88, 1.9], target: [0, 1.04, -.15] },
      lowRear: { position: [.5, .9, 6.1], target: [0, 1.03, -3.8] },
    },
    driverSeat: { position: [-.43, .94, .32] }, steeringWheelNode: 'IslandSteeringWheel',
    radioTargets: { tuning: [.192, 1.125, -.457], volume: [-.082, 1.125, -.457], preset: [.055, 1.095, -.457] },
    lightControlTarget: [-.60, 1.028, -.405],
    popupLidNodes: [], lampNodes: [], soundProfile: 'classic',
  },
}

export const VEHICLE_OPTIONS = Object.values(VEHICLES)
export function getVehicle(id: CruiseVehicleId): VehicleDefinition { return VEHICLES[id] }
