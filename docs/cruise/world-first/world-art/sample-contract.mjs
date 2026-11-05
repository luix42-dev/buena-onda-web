import { readFileSync } from 'node:fs'

export const contract = JSON.parse(readFileSync(new URL('./scene-contract.json', import.meta.url), 'utf8'))

// Intent sampler for renderer handoff. Actual rendered camera metadata takes precedence.
export function sampleWorldFirstAt(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0 || seconds > contract.timeline.durationSeconds) {
    throw new RangeError('Scene time must be between 0 and 60 seconds inclusive')
  }
  let station = 0
  let speed = contract.timeline.speedPhases[0].startMps
  for (const phase of contract.timeline.speedPhases) {
    const duration = phase.endSeconds - phase.startSeconds
    const u = Math.max(0, Math.min(1, (seconds - phase.startSeconds) / duration))
    const difference = phase.endMps - phase.startMps
    station += duration * (phase.startMps * u + difference * (u ** 3 - .5 * u ** 4))
    if (seconds >= phase.startSeconds) speed = phase.startMps + difference * (3 * u * u - 2 * u ** 3)
  }
  const elevation = 24 - .03 * station
  const position = [contract.camera.lateralMeters, elevation + contract.camera.eyeHeightAboveRoadMeters, -station]
  const halfPitch = contract.camera.pitchWorldDegrees * Math.PI / 360
  return {
    timeSeconds: seconds,
    stationMeters: station,
    stationSpeedMps: speed,
    trueSpeedMps: speed * Math.sqrt(1 + .03 ** 2),
    cameraPositionMeters: position,
    cameraQuaternionThreeXYZW: [Math.sin(halfPitch), 0, 0, Math.cos(halfPitch)],
    unrealPositionCentimeters: [-position[2] * 100, position[0] * 100, position[1] * 100],
    unrealRotationDegrees: { pitch: -1, yaw: 0, roll: 0 },
  }
}
