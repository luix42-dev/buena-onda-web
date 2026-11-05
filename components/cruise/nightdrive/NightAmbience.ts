export type AmbienceInput = {
  speed: number; moving: boolean; visible: boolean; musicPlaying: boolean; musicMuted: boolean
  camera: string; districtMix: number; reduced: boolean
  traffic: Array<{ distance: number; lateral: number; speed: number }>; distance: number
}
const clamp = (value: number, max = 1) => Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : 0

/** Pure sound targets; these never feed the music analyser or synthetic FFT. */
export function ambienceTargets(input: AmbienceInput, enabled: boolean, gain: number) {
  const speed = clamp(input.speed / 24), district = clamp(input.districtMix)
  const active = enabled && input.visible && input.moving && input.musicPlaying && !input.musicMuted
  const nearest = input.traffic.filter(car => Number.isFinite(car.distance) && Number.isFinite(car.lateral))
    .reduce<AmbienceInput['traffic'][number] | undefined>((best, car) => !best || Math.abs(car.distance - input.distance) < Math.abs(best.distance - input.distance) ? car : best, undefined)
  const proximity = nearest ? Math.max(0, 1 - Math.abs(nearest.distance - input.distance) / 28) ** 2 : 0
  return {
    master: active ? clamp(gain) * .25 * (input.camera === 'driver' ? .72 : 1) : 0,
    wind: .12 + speed * .22, road: .12 + speed * .18,
    engine: .08 + speed * .035, frequency: 43 + speed * 32,
    windFrequency: 450 + speed * 650, roadFrequency: 150 + district * 90,
    traffic: proximity * (.06 + district * .025),
    pan: input.reduced || !nearest ? 0 : Math.max(-.65, Math.min(.65, nearest.lateral / 5)),
  }
}

const idle: AmbienceInput = { speed: 0, moving: false, visible: true, musicPlaying: false, musicMuted: false, camera: 'driver', districtMix: 0, reduced: false, traffic: [], distance: 0 }

/** Lab-only procedural draft. No microphone, recording of radio, network or external assets. */
export class NightAmbience {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private gains: GainNode[] = []
  private filters: BiquadFilterNode[] = []
  private oscillators: OscillatorNode[] = []
  private sources: AudioBufferSourceNode[] = []
  private nodes: AudioNode[] = []
  private panner: StereoPannerNode | null = null
  private recording: MediaStreamAudioDestinationNode | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private enabled = true
  private gain = .2
  private input = idle
  private target = 0
  private generation = 0
  private fault: string | null = null

  async unlock(): Promise<void> {
    if (!this.context) {
      try {
        this.context = new AudioContext()
        this.build(this.context)
      } catch {
        this.dispose(); this.fault = 'Ambience unavailable; radio remains independent'
        return
      }
    }
    const context = this.context, generation = this.generation
    try {
      await context.resume()
      if (context !== this.context || generation !== this.generation) return
      this.fault = null; this.apply()
    } catch { if (context === this.context) this.fault = 'Tap to enable ambience' }
  }

  setEnabled(enabled: boolean) { this.enabled = enabled; this.apply() }
  setGain(gain: number) { this.gain = clamp(gain); this.apply() }
  update(input: AmbienceInput) { this.input = input; this.apply() }

  private build(context: AudioContext) {
    const keep = <T extends AudioNode>(node: T): T => { this.nodes.push(node); return node }
    this.master = keep(context.createGain()); this.master.gain.value = 0
    this.master.connect(context.destination)
    // Seeded noise generated once; remove the linear endpoint discontinuity for looping.
    const buffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate)
    const data = buffer.getChannelData(0)
    let seed = 1984, last = 0
    for (let i = 0; i < data.length; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; last = (last + (seed / 4294967296 * 2 - 1) * .06) / 1.02; data[i] = last * 3 }
    const seam = data[data.length - 1] - data[0]
    for (let i = 0; i < data.length; i++) data[i] -= seam * i / (data.length - 1)
    this.panner = keep(context.createStereoPanner()); this.panner.connect(this.master)
    for (let i = 0; i < 3; i++) {
      const source = keep(context.createBufferSource()), filter = keep(context.createBiquadFilter()), gain = keep(context.createGain())
      source.buffer = buffer; source.loop = true
      filter.type = i === 1 ? 'lowpass' : 'bandpass'; filter.Q.value = .5
      filter.frequency.value = i === 1 ? 180 : i === 2 ? 650 : 700
      gain.gain.value = 0; source.connect(filter); filter.connect(gain); gain.connect(i === 2 ? this.panner : this.master)
      source.start(0, i * .73); this.sources.push(source); this.filters.push(filter); this.gains.push(gain)
    }
    for (let i = 0; i < 2; i++) {
      const oscillator = keep(context.createOscillator()), gain = keep(context.createGain())
      oscillator.type = 'sine'; oscillator.frequency.value = 43 * (i + 1)
      gain.gain.value = 0; oscillator.connect(gain); gain.connect(this.master); oscillator.start()
      this.oscillators.push(oscillator); this.gains.push(gain)
    }
  }

  private apply() {
    const context = this.context, master = this.master
    const values = ambienceTargets(this.input, this.enabled, this.gain)
    this.target = values.master
    if (!context || !master || context.state === 'closed') return
    if (values.master > 0 && this.timer) { clearTimeout(this.timer); this.timer = null }
    const now = context.currentTime
    const smooth = (param: AudioParam, value: number) => { param.cancelScheduledValues(now); param.setTargetAtTime(value, now, .08) }
    smooth(master.gain, values.master)
    ;[values.wind, values.road, values.traffic, values.engine, values.engine * .22].forEach((value, i) => smooth(this.gains[i].gain, value))
    smooth(this.filters[0].frequency, values.windFrequency); smooth(this.filters[1].frequency, values.roadFrequency)
    this.oscillators.forEach((oscillator, i) => smooth(oscillator.frequency, values.frequency * (i + 1)))
    smooth(this.panner!.pan, values.pan)
    if (values.master > 0 && context.state === 'suspended') {
      void context.resume().catch(() => { if (context === this.context) this.fault = 'Tap to enable ambience' })
    } else if (values.master === 0 && context.state === 'running' && !this.timer) {
      const generation = this.generation
      this.timer = setTimeout(() => {
        this.timer = null
        if (context !== this.context || generation !== this.generation || this.target !== 0) return
        master.gain.cancelScheduledValues(context.currentTime); master.gain.value = 0
        void context.suspend().catch(() => {})
      }, 400)
    }
  }

  /** Explicit opt-in capture of this generated graph ONLY; caller owns its MediaRecorder. */
  recordingStream(): MediaStream | null {
    if (!this.context || !this.master) return null
    if (!this.recording) { this.recording = this.context.createMediaStreamDestination(); this.nodes.push(this.recording); this.master.connect(this.recording) }
    return this.recording.stream
  }

  snapshot() { return { state: this.context?.state ?? 'locked', enabled: this.enabled, gain: this.gain, targetGain: this.target, nodeCount: this.nodes.length, error: this.fault, synthetic: true } }

  dispose() {
    this.generation++
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    for (const source of [...this.sources, ...this.oscillators]) { try { source.stop() } catch {} }
    this.nodes.forEach(node => node.disconnect())
    this.recording?.stream.getTracks().forEach(track => track.stop())
    const context = this.context
    this.context = null; this.master = null; this.recording = null; this.panner = null
    this.nodes = []; this.gains = []; this.filters = []; this.sources = []; this.oscillators = []; this.target = 0
    if (context && context.state !== 'closed') void context.close().catch(() => {})
  }
}
