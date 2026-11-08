/** A moving FM dial: colored static, three quiet carrier catches, and a soft whistle. */
export function fillDialNoise(samples: Float32Array, sampleRate: number, random = Math.random) {
  let pink = 0, phase = 0
  const duration = samples.length / sampleRate
  for (let i = 0; i < samples.length; i++) {
    const time = i / sampleRate, position = time / duration
    const white = random() * 2 - 1
    pink = .94 * pink + .06 * white
    const catches = [.23, .53, .82].reduce((sum, center) => sum + Math.exp(-(((position - center) / .035) ** 2)), 0)
    const flutter = .78 + .22 * Math.sin(time * 43 + Math.sin(time * 17))
    const frequency = 2900 - 2350 * position + 340 * Math.sin(position * Math.PI * 5)
    phase += Math.PI * 2 * frequency / sampleRate
    samples[i] = Math.max(-1, Math.min(1,
      (white * .42 + pink * 2.2) * flutter * (1 - catches * .82)
      + Math.sin(phase) * catches * .055))
  }
}
