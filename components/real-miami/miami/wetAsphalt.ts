import * as T from 'three'

/** Repeatable roughness variation, generated locally; no imported Cybercity assets. */
export function wetAsphaltTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256
  const ctx = canvas.getContext('2d')!
  const pixels = ctx.createImageData(256, 256)
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    // Periodic broad damp patches with small pores. The green channel is PBR roughness.
    const u = x / 256 * Math.PI * 2, v = y / 256 * Math.PI * 2
    const patch = Math.sin(u + .6 * Math.sin(v)) * Math.cos(v * 2 - .4 * Math.cos(u * 2))
    const grain = ((x * 73 + y * 151 + x * y * 19) % 31) / 31
    const value = Math.round(T.MathUtils.clamp(.54 + patch * .22 + grain * .1, .3, .88) * 255)
    const i = (y * 256 + x) * 4
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value; pixels.data[i + 3] = 255
  }
  ctx.putImageData(pixels, 0, 0)
  const texture = new T.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = T.RepeatWrapping
  texture.repeat.set(.19, .19); texture.anisotropy = 4
  return texture
}
