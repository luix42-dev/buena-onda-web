/** Fixed-storage signal processor and event director. Values are heuristic, not instrument recognition. */
export class MusicDirector {
  kickCount = 0; snareCount = 0; generation = 0
  readonly signal = { bass: 0, mids: 0, highs: 0, energy: 0, transient: 0, flux: 0, confidence: 0, kick: 0, snare: 0, shimmer: 0, phrase: 0, events: 0 }
  private previous = new Float32Array(1024)
  private floor = 0.01
  private bassFloor = 0.02
  private elapsed = 0
  private lastKick = -10
  private lastSnare = -10
  private lastPhrase = -20
  private interval = 0.5
  reset() {
    this.kickCount = this.snareCount = 0; this.generation++
    for (const key of Object.keys(this.signal) as (keyof typeof this.signal)[]) this.signal[key] = 0
    this.previous.fill(0); this.floor = 0.01; this.bassFloor = 0.02
    this.elapsed = 0; this.lastKick = -10; this.lastSnare = -10; this.lastPhrase = -20; this.interval = 0.5
  }
  update(bins: Uint8Array, waveform: Uint8Array, sampleRate: number, delta: number, active: boolean) {
    const dt = Math.min(0.1, Math.max(0, delta)); this.elapsed += dt
    const s = this.signal; const smooth = 1 - Math.exp(-dt * 9)
    let bass = 0, mids = 0, highs = 0, nb = 0, nm = 0, nh = 0, flux = 0, rms = 0
    for (let i = 0; i < bins.length; i++) {
      const value = active ? bins[i] / 255 : 0
      const hz = i * sampleRate / (bins.length * 2)
      if (hz >= 35 && hz < 180) { bass += value * value; nb++ }
      else if (hz >= 180 && hz < 2400) { mids += value * value; nm++ }
      else if (hz >= 2400 && hz < 12000) { highs += value * value; nh++ }
      flux += Math.max(0, value - this.previous[i]); this.previous[i] = value
    }
    for (let i = 0; i < waveform.length; i++) { const v = active ? (waveform[i] - 128) / 128 : 0; rms += v * v }
    bass = Math.sqrt(bass / Math.max(1, nb)); mids = Math.sqrt(mids / Math.max(1, nm)); highs = Math.sqrt(highs / Math.max(1, nh))
    flux /= bins.length
    const energy = Math.min(1, Math.sqrt(rms / waveform.length) * 3)
    const transient = active && energy > 0.015 ? Math.min(1, Math.max(0, (flux - this.floor * 1.5) * 18)) : 0
    s.bass += (bass - s.bass) * smooth; s.mids += (mids - s.mids) * smooth; s.highs += (highs - s.highs) * smooth
    s.energy += (energy - s.energy) * (1 - Math.exp(-dt * 2)); s.flux = flux; s.transient = transient
    s.kick *= Math.exp(-dt * 5); s.snare *= Math.exp(-dt * 8); s.shimmer *= Math.exp(-dt * 9); s.phrase *= Math.exp(-dt * 1.3)
    // One priority event per sample, refractory periods, and a one-second warmup.
    if (this.elapsed > 1 && active && energy > 0.025) {
      if (transient > 0.08 && bass > this.bassFloor * 1.08 && this.elapsed - this.lastKick > 0.28) {
        const interval = this.elapsed - this.lastKick
        s.confidence = interval < 1.2 ? s.confidence * 0.7 + Math.max(0, 1 - Math.abs(interval - this.interval) / 0.25) * 0.3 : 0
        if (interval < 1.2) this.interval = this.interval * 0.7 + interval * 0.3
        this.kickCount++; this.lastKick = this.elapsed; s.kick = Math.min(1, 0.35 + transient); s.events++
        if (transient > 0.5 && this.elapsed - this.lastPhrase > 8) { s.phrase = 1; this.lastPhrase = this.elapsed }
      } else if (transient > 0.07 && mids > bass * 0.65 && this.elapsed - this.lastSnare > 0.22) {
        this.snareCount++; s.snare = Math.min(1, transient + 0.25); this.lastSnare = this.elapsed; s.events++
      }
      if (transient > 0.04 && highs > 0.08) s.shimmer = Math.min(0.7, transient)
    }
    if (this.elapsed - this.lastKick > 2) s.confidence *= Math.exp(-dt)
    this.floor += (flux - this.floor) * (1 - Math.exp(-dt * 1.5))
    this.bassFloor += (bass - this.bassFloor) * (1 - Math.exp(-dt * 1.5))
  }
}
