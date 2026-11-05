import type { MusicAudio } from '@/lib/real-miami/music-audio'

/**
 * One shared, allocation-free visualizer state. The radio drives the city:
 * neon, lamps, sky, palms, ocean, banner EQ and the cockpit radio all read from here.
 *
 * Sources, in order of preference:
 *  - 'live'   : real FFT of the playing radio (MusicAudio capture tap, CORS permitting)
 *  - 'groove' : radio is playing but the browser/stream will not allow analysis;
 *               a 112 BPM synthetic groove keeps the city alive (never claimed as "live")
 *  - 'idle'   : radio off; slow breathing only
 */
export const BANDS = 24
export const pulse = {
  source: 'idle' as 'live' | 'groove' | 'idle',
  bass: 0, mids: 0, highs: 0, energy: 0,
  kick: 0, snare: 0, beat: 0, time: 0,
  /** Log-spaced band levels 0..1, low → high. */
  spectrum: new Float32Array(BANDS),
  /** Slow peak-hold copy of spectrum for VFD peak dots. */
  peaks: new Float32Array(BANDS),
  vuL: 0, vuR: 0,
}

const edges = (() => {
  // Bin edges for 1024 bins at ~44.1/48 kHz: ~40 Hz → ~13 kHz, log spaced.
  const out: number[] = []
  for (let i = 0; i <= BANDS; i++) out.push(Math.round(1.8 * Math.pow(560 / 1.8, i / BANDS)))
  return out
})()

let lastKick = 0
export function updatePulse(music: MusicAudio | null, playing: boolean, dt: number) {
  const p = pulse
  const reduced = reducedMotion()
  // This clock drives decorations and fallback rhythm, never audio playback or analysis.
  p.time += dt * (reduced ? .18 : 1)
  const k = 1 - Math.exp(-dt * (reduced ? 1.4 : 14))
  const level = reduced ? .5 : 1
  const spectrumFollow = reduced ? k : 0
  if (music?.analysisActive) {
    p.source = 'live'
    const s = music.director.signal
    p.bass += (s.bass * level - p.bass) * k; p.mids += (s.mids * level - p.mids) * k; p.highs += (s.highs * level - p.highs) * k
    p.energy += (s.energy * level - p.energy) * k
    p.kick = reduced ? 0 : Math.max(p.kick * Math.exp(-dt * 6), s.kick); p.snare = reduced ? 0 : Math.max(p.snare * Math.exp(-dt * 9), s.snare)
    const bins = music.bins
    for (let b = 0; b < BANDS; b++) {
      let sum = 0, n = 0
      for (let i = edges[b]; i < Math.max(edges[b] + 1, edges[b + 1]); i++) { sum += bins[i] / 255; n++ }
      const v = Math.min(1, (sum / Math.max(1, n)) * (0.85 + b * 0.03))
      p.spectrum[b] += (v * level - p.spectrum[b]) * (reduced ? spectrumFollow : v > p.spectrum[b] ? 0.6 : 0.18)
    }
  } else if (playing) {
    p.source = 'groove'
    const bpm = 112, beatLen = 60 / bpm
    const phase = (p.time % beatLen) / beatLen
    if (!reduced && p.time - lastKick >= beatLen * 0.98 && phase < 0.1) { lastKick = p.time; p.kick = 0.85 }
    p.kick = reduced ? 0 : p.kick * Math.exp(-dt * 6)
    const bar = (p.time / beatLen) % 4
    p.snare = reduced ? 0 : (bar > 1 && bar < 1.15) || (bar > 3 && bar < 3.15) ? 0.7 : p.snare * Math.exp(-dt * 9)
    p.bass += ((0.35 + p.kick * 0.5) * level - p.bass) * k
    p.mids += ((0.32 + Math.sin(p.time * 1.7) * 0.08 + p.snare * 0.25) * level - p.mids) * k
    p.highs += ((0.22 + Math.sin(p.time * 7.3) * 0.06) * level - p.highs) * k
    p.energy += (0.42 * level - p.energy) * k
    for (let b = 0; b < BANDS; b++) {
      const t = b / (BANDS - 1)
      const shape = (1 - t) * (0.35 + p.kick * 0.55) + t * 0.25 + Math.sin(p.time * (3 + b * 0.7) + b) * 0.08 + (b > 8 && b < 16 ? p.snare * 0.3 : 0)
      const v = Math.max(0, Math.min(1, shape))
      p.spectrum[b] += (v * level - p.spectrum[b]) * (reduced ? spectrumFollow : 0.35)
    }
  } else {
    p.source = 'idle'
    const breathe = 0.5 + Math.sin(p.time * 0.6) * 0.5
    p.kick = reduced ? 0 : p.kick * Math.exp(-dt * 4); p.snare = reduced ? 0 : p.snare * Math.exp(-dt * 6)
    p.bass += (0.04 * breathe * level - p.bass) * k; p.mids += (0.03 * level - p.mids) * k; p.highs += (0.02 * level - p.highs) * k; p.energy += (0 - p.energy) * k
    for (let b = 0; b < BANDS; b++) p.spectrum[b] += ((0.02 + 0.03 * breathe * (1 - b / BANDS)) * level - p.spectrum[b]) * (reduced ? spectrumFollow : 0.1)
  }
  for (let b = 0; b < BANDS; b++) p.peaks[b] = Math.max(p.spectrum[b], p.peaks[b] - dt * (reduced ? .12 : .35))
  const lo = p.spectrum[1] + p.spectrum[3], hi = p.spectrum[12] + p.spectrum[18]
  p.vuL += (Math.min(1, p.energy * 1.4 + lo * 0.25) - p.vuL) * (1 - Math.exp(-dt * (reduced ? 1.4 : 10)))
  p.vuR += (Math.min(1, p.energy * 1.4 + hi * 0.25) - p.vuR) * (1 - Math.exp(-dt * (reduced ? 1.4 : 10)))
  p.beat = p.kick
}

let reducedQuery: MediaQueryList | null | undefined
/** True when the visitor asked the OS/browser for reduced motion (cached media query, no per-frame allocation). */
export function reducedMotion() {
  if (reducedQuery === undefined) reducedQuery = typeof matchMedia === 'undefined' ? null : matchMedia('(prefers-reduced-motion: reduce)')
  return !!reducedQuery?.matches
}
