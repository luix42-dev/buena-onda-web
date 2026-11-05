/**
 * Procedural engine sound: every car gets its own voice from cylinder count, firing unevenness and exhaust
 * resonance, synthesized in the browser (no audio files). The combustion synthesis, the two RPM banks, gearbox and
 * parameter smoothing are adapted from Mr.doob's slop-newyork (js/audio-synthesis.js), MIT License,
 * Copyright (c) 2026 Mr.doob; see ./engine-audio.LICENSE.txt. Changes: TypeScript, per-car profiles (cylinders,
 * resonance, unevenness, idle/redline, tone) instead of three fixed kinds, and no spatial/doppler handling (the
 * listener rides in the car).
 */
import type { RideVehicleId } from '@/lib/real-miami/ride-vehicles'

export type EngineProfile = {
  label: string; cylinders: number; resonance: number; uneven: number; idle: number; redline: number
  /** Exhaust lowpass at idle (Hz) and its opening with RPM/effort: lower = deeper, more muffled. */
  tone: number; level: number; mechanical: number
}

export const ENGINE_PROFILES: Record<RideVehicleId, EngineProfile> = {
  countach: { label: 'V12', cylinders: 12, resonance: 205, uneven: .02, idle: 950, redline: 7800, tone: 900, level: 1, mechanical: 1.5 },
  eighties: { label: '2.8 V6', cylinders: 6, resonance: 140, uneven: .035, idle: 800, redline: 6200, tone: 700, level: .9, mechanical: 1 },
  delorean: { label: 'PRV V6', cylinders: 6, resonance: 122, uneven: .03, idle: 760, redline: 5800, tone: 580, level: .85, mechanical: .9 },
  cadillac: { label: '390 V8', cylinders: 8, resonance: 82, uneven: .09, idle: 560, redline: 4600, tone: 430, level: 1.1, mechanical: .6 },
  wrangler: { label: 'V6', cylinders: 6, resonance: 108, uneven: .04, idle: 700, redline: 6000, tone: 560, level: .95, mechanical: 1.1 },
  'coastal-coupe': { label: 'I4', cylinders: 4, resonance: 165, uneven: .03, idle: 850, redline: 6800, tone: 760, level: .85, mechanical: 1.2 },
  'classic-coupe': { label: 'V8', cylinders: 8, resonance: 95, uneven: .07, idle: 640, redline: 5200, tone: 480, level: 1, mechanical: .7 },
  'island-trail': { label: 'I4', cylinders: 4, resonance: 104, uneven: .045, idle: 740, redline: 5000, tone: 520, level: .95, mechanical: 1.3 },
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

function setControlRate(...parameters: AudioParam[]) { for (const p of parameters) if (p.automationRate !== undefined) p.automationRate = 'k-rate' }

function randomSequence(seed: number) {
  let state = seed >>> 0
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296 }
}

function normalizeLoop(buffer: AudioBuffer, rms: number, ceiling = .9) {
  const data = buffer.getChannelData(0)
  let mean = 0; for (let i = 0; i < data.length; i++) mean += data[i]; mean /= data.length
  let energy = 0, peak = 0
  for (let i = 0; i < data.length; i++) { data[i] -= mean; energy += data[i] * data[i]; peak = Math.max(peak, Math.abs(data[i])) }
  const scale = Math.min(ceiling / Math.max(peak, .0001), rms / Math.max(Math.sqrt(energy / data.length), .0001))
  for (let i = 0; i < data.length; i++) data[i] *= scale
  return buffer
}

function noiseBuffer(context: BaseAudioContext) {
  const rate = context.sampleRate, noise = context.createBuffer(1, Math.round(rate * 2), rate), samples = noise.getChannelData(0), random = randomSequence(0x6e796361)
  for (let i = 0; i < samples.length; i++) samples[i] = random() * 2 - 1
  // Warm the filter with one full cycle first so the loop seam is an ordinary sample transition.
  const coefficient = Math.exp(-2 * Math.PI * 7000 / rate)
  for (let pass = 0; pass < 2; pass++) {
    let previous = 0
    for (let i = 0; i < samples.length; i++) previous += (samples[i] - previous) * (1 - coefficient)
    for (let i = 0; i < samples.length; i++) { previous += (samples[i] - previous) * (1 - coefficient); samples[i] = previous }
  }
  return normalizeLoop(noise, .3, .95)
}

/** Twenty four-stroke cycles at two reference RPMs, so the firing pulses keep their length in seconds across the rev range. */
function combustionBuffers(context: BaseAudioContext, profile: EngineProfile, seed: number) {
  const rate = context.sampleRate, referenceRPM = 1200, highReferenceRPM = 3600, cycles = 20, cylinders = profile.cylinders
  const mechanical = context.createBuffer(1, Math.round(cycles * 120 / referenceRPM * rate), rate)
  const random = randomSequence(seed)
  const cylinderStrength = Array.from({ length: cylinders }, () => .83 + random() * .34)
  const cylinderDelay = Array.from({ length: cylinders }, () => (random() - .5) * profile.uneven)
  const resonance = profile.resonance * (.97 + random() * .06), duration = Math.round(rate * .048)
  const exhaustBuffer = (rpm: number, clatter?: Float32Array) => {
    const length = Math.round(cycles * 120 / rpm * rate), buffer = context.createBuffer(1, length, rate), pressure = buffer.getChannelData(0)
    const interval = length / (cycles * cylinders), timing = randomSequence(seed), noise = randomSequence(seed ^ 0x65786861)
    for (let firing = 0; firing < cycles * cylinders; firing++) {
      const cylinder = firing % cylinders
      let index = Math.round((firing + cylinderDelay[cylinder] + (timing() - .5) * .012) * interval); index = (index + length) % length
      const strength = cylinderStrength[cylinder] * (.92 + timing() * .16), decay = .012 * (.95 + timing() * .1)
      let lowNoise = 0
      for (let i = 0; i < duration; i++) {
        const t = i / rate, white = noise() * 2 - 1
        lowNoise += (white - lowNoise) * .16
        const attack = 1 - Math.exp(-t / .00065), tail = Math.exp(-t / decay)
        const release = Math.exp(-t / .0022) - .36 * Math.exp(-t / .009), body = Math.sin(2 * Math.PI * resonance * t) * tail * .34
        pressure[index] += strength * attack * (release + body + lowNoise * tail * .28)
        if (clatter) {
          const valveTime = Math.max(0, t - .009), valve = t > .009 ? Math.exp(-valveTime / .0016) * (white * .65 + Math.sin(valveTime * 14900) * .12) : 0
          clatter[index] += strength * (white * attack * Math.exp(-t / .0022) + valve * .35)
        }
        if (++index === length) index = 0
      }
    }
    return normalizeLoop(buffer, .3)
  }
  return { exhaust: exhaustBuffer(referenceRPM, mechanical.getChannelData(0)), highExhaust: exhaustBuffer(highReferenceRPM), mechanical: normalizeLoop(mechanical, .18, .85), referenceRPM, highReferenceRPM }
}

/** Only meaningful target changes; setTargetAtTime continues from wherever an interrupted ramp got to. */
function smoothParameter(parameter: AudioParam, timeConstant = .07, epsilon = .0001, snapInitial = false) {
  let target = NaN, scheduledTime = -Infinity
  return (value: number, now: number, smoothing = timeConstant) => {
    if (Math.abs(value - target) < epsilon && now >= scheduledTime) return
    parameter.cancelScheduledValues(now)
    if (snapInitial && Number.isNaN(target)) parameter.setValueAtTime(value, now)
    else parameter.setTargetAtTime(value, now, smoothing)
    target = value; scheduledTime = now
  }
}

export type EngineVoice = { render: (speed: number, load: number, now: number) => void; rpm: () => number; dispose: () => void }

/** speed in m/s, load 0..1 (throttle); call ~10 times a second with context.currentTime. */
export function createEngineVoice(context: BaseAudioContext, profile: EngineProfile, output: AudioNode, seed = 0x636f756e): EngineVoice {
  const nodes: AudioNode[] = [], sources: AudioBufferSourceNode[] = []
  const own = <N extends AudioNode>(node: N) => { nodes.push(node); return node }
  const gain = (value = 0) => { const node = own(context.createGain()); node.gain.value = value; return node }
  const filter = (type: BiquadFilterType, frequency: number, q = .7) => { const node = own(context.createBiquadFilter()); setControlRate(node.frequency, node.detune, node.Q, node.gain); node.type = type; node.frequency.value = Math.min(frequency, context.sampleRate * .45); node.Q.value = q; return node }
  const loop = (buffer: AudioBuffer) => { const node = own(context.createBufferSource()); node.buffer = buffer; node.loop = true; sources.push(node); return node }
  const sound = combustionBuffers(context, profile, seed), noise = noiseBuffer(context)
  const mix = gain(profile.level); mix.connect(output)
  const bankRatio = sound.highExhaust.duration / sound.exhaust.duration
  // Gear ratios (engine RPM per m/s) scale with the redline so every car shifts near its own top end.
  const ratios = [500, 325, 230, 170, 130].map(r => r * profile.redline / 6200)
  let gear = 0, rpm = profile.idle, throttle = 0, previousTime = -1, gearLock = 0, shiftUntil = 0
  const exhaust = loop(sound.exhaust), highExhaust = loop(sound.highExhaust); highExhaust.playbackRate.value = bankRatio
  const lowBankGain = gain(1), highBankGain = gain(), exhaustFilter = filter('lowpass', profile.tone, .65), exhaustGain = gain()
  exhaust.connect(lowBankGain).connect(exhaustFilter); highExhaust.connect(highBankGain).connect(exhaustFilter); exhaustFilter.connect(exhaustGain).connect(mix)
  const mechanism = loop(sound.mechanical), mechanismFilter = filter('bandpass', 1700, .45), mechanismGain = gain()
  mechanism.connect(mechanismFilter).connect(mechanismGain).connect(mix)
  const road = loop(noise), roadHighpass = filter('highpass', 120, .5), roadLowpass = filter('lowpass', 1400, .5), roadGain = gain()
  road.connect(roadHighpass).connect(roadLowpass).connect(roadGain).connect(mix)
  const exhaustRate = smoothParameter(exhaust.playbackRate, .035, .0005, true), highExhaustRate = smoothParameter(highExhaust.playbackRate, .035, .0005 * bankRatio, true)
  const lowBankLevel = smoothParameter(lowBankGain.gain, .07, .0001, true), highBankLevel = smoothParameter(highBankGain.gain, .07, .0001, true)
  const mechanicalRate = smoothParameter(mechanism.playbackRate, .035, .0005, true), exhaustCutoff = smoothParameter(exhaustFilter.frequency, .07, 1)
  const exhaustLevel = smoothParameter(exhaustGain.gain, .055), mechanicalFrequency = smoothParameter(mechanismFilter.frequency, .12, 1)
  const mechanicalLevel = smoothParameter(mechanismGain.gain, .09), roadLevel = smoothParameter(roadGain.gain, .18), roadFrequency = smoothParameter(roadLowpass.frequency, .18, 1)
  const start = context.currentTime + .02; sources.forEach(source => source.start(start))
  const render = (speed: number, load: number, now: number) => {
    const first = previousTime < 0, dt = first ? .1 : clamp(now - previousTime, 0, .5); previousTime = now
    throttle = first ? load : throttle + (load - throttle) * (1 - Math.exp(-dt / (load > throttle ? .14 : .32)))
    const shiftRPM = profile.redline * .43 + throttle * profile.redline * .47
    let upshift = false
    if (speed < .6) { gear = 0; gearLock = shiftUntil = 0 }
    else if (first) { while (gear < ratios.length - 1 && speed * ratios[gear] > shiftRPM) gear++ }
    else if (now >= gearLock) {
      const oldGear = gear, wheelRPM = speed * ratios[gear]
      if (gear < ratios.length - 1 && wheelRPM > shiftRPM) gear++
      else if (gear > 0 && speed * ratios[gear - 1] < shiftRPM * .82 && (wheelRPM < profile.redline * .26 || (throttle > .65 && wheelRPM < shiftRPM * .55))) gear--
      if (gear !== oldGear) { gearLock = now + .65; upshift = gear > oldGear; if (upshift) shiftUntil = now + .16 }
    }
    const slip = throttle * 1500 * Math.max(.12, 1 - speed / 16)
    const targetRPM = clamp(Math.max(profile.idle, speed * ratios[gear]) + slip, profile.idle, profile.redline)
    rpm = first || upshift ? targetRPM : rpm + (targetRPM - rpm) * (1 - Math.exp(-dt / (targetRPM > rpm ? .12 : .075)))
    const effort = Math.min(1, throttle + speed * .005), rolling = Math.min(1.35, speed / 28)
    exhaustRate(rpm / sound.referenceRPM, now); highExhaustRate(rpm / sound.referenceRPM * bankRatio, now)
    const bank = clamp((rpm - sound.referenceRPM) / (sound.highReferenceRPM - sound.referenceRPM), 0, 1), blend = bank * bank * (3 - 2 * bank)
    lowBankLevel(Math.cos(blend * Math.PI / 2), now); highBankLevel(Math.sin(blend * Math.PI / 2), now)
    mechanicalRate(rpm / sound.referenceRPM, now)
    const cutoff = profile.tone + rpm * .24, exhaustIdle = .11, mechanicalIdle = .03 * profile.mechanical
    if (upshift) { const unloaded = Math.min(effort, .06); exhaustCutoff(cutoff + unloaded * 1800, now, .012); exhaustLevel(exhaustIdle + unloaded * .26, now, .012); mechanicalLevel(mechanicalIdle + unloaded * .085 * profile.mechanical, now, .012) }
    const loadTime = Math.max(now, shiftUntil), recovery = now < shiftUntil ? .045 : undefined
    exhaustCutoff(cutoff + effort * 1800, loadTime, recovery); exhaustLevel(exhaustIdle + effort * .26, loadTime, recovery)
    mechanicalFrequency(1250 + rpm * .12, now); mechanicalLevel(mechanicalIdle + effort * .085 * profile.mechanical, loadTime, recovery)
    roadLevel(Math.pow(rolling, 1.25) * .1, now); roadFrequency(900 + Math.min(1, rolling) * 1000, now)
  }
  return {
    render, rpm: () => rpm,
    dispose() { for (const source of sources) try { source.stop() } catch { /* never started */ } nodes.forEach(node => node.disconnect()) },
  }
}
