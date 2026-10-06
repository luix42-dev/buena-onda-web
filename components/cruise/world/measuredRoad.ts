import * as THREE from 'three'
import { WORLD_LENGTH } from '@/lib/cruise/constants'

/** Owns its texture requests, including disposal when loading outlives the scene. */
export function loadMeasuredRoad(onReady: (maps: THREE.Texture[]) => void) {
  let active = true
  const textures: THREE.Texture[] = []
  const loader = new THREE.TextureLoader()
  const requests = ['color', 'normal', 'roughness'].map((channel) => new Promise<THREE.Texture>((resolve, reject) => {
    const texture = loader.load(`/cruise/materials/asphalt-aggregate/${channel}.webp`, resolve, undefined, reject)
    texture.name = `polyhaven-asphalt-aggregate-${channel}`
    texture.colorSpace = channel === 'color' ? THREE.SRGBColorSpace : THREE.NoColorSpace
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    // Integer repeats keep texture phase continuous at the modulo-world wrap.
    texture.repeat.set(14.2 / 1.5, Math.round(WORLD_LENGTH / 1.5))
    texture.anisotropy = 4
    textures.push(texture)
  }))
  void Promise.all(requests).then((maps) => {
    if (active) onReady(maps)
    else maps.forEach((map) => map.dispose())
  }).catch(() => {
    // Keep the already-rendering local fallback if any map is unavailable.
    active = false
    textures.forEach((map) => map.dispose())
  })
  return () => {
    active = false
    textures.forEach((map) => map.dispose())
  }
}
