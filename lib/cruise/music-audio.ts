import { MusicDirector } from './music'
import { MiamiChoreography } from './miami-choreography'

type CapturableAudio = HTMLAudioElement & { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream }
/** A capture tap never reroutes the audible element. Unsupported/CORS sources keep ordinary playback. */
export class MusicAudio {
  readonly director = new MusicDirector()
  readonly miami = new MiamiChoreography()
  analysisActive = false
  sampledAt = 0
  status = 'Waiting for radio'
  analysisMs = 0
  private context: AudioContext | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private analyser: AnalyserNode | null = null
  private stream: MediaStream | null = null
  private bins = new Uint8Array(1024)
  private waveform = new Uint8Array(2048)
  private timer = 0
  private previous = 0
  private silence = 0
  unlock() {
    try {
      this.context ??= new AudioContext()
      void this.context.resume().catch(() => { this.status = 'Tap play to enable analysis' })
    } catch { this.status = 'Web Audio unavailable; radio remains independent' }
  }
  attach(audio: CapturableAudio) {
    this.detach()
    if (!this.context) return
    const capture = audio.captureStream || audio.mozCaptureStream
    if (!capture) { this.status = 'Audio capture unavailable in this browser'; return }
    try {
      this.stream = capture.call(audio)
      if (!this.stream.getAudioTracks().length) { this.status = 'No capturable audio track'; return }
      this.source = this.context.createMediaStreamSource(this.stream)
      this.analyser = this.context.createAnalyser(); this.analyser.fftSize = 2048; this.analyser.smoothingTimeConstant = 0.35
      this.source.connect(this.analyser) // No destination connection: the original radio is the only audible output.
      this.previous = performance.now(); this.silence = 0
      this.timer = window.setInterval(() => {
        const now = performance.now(); const dt = (now - this.previous) / 1000; this.previous = now
        const active = !audio.paused && !audio.muted && !document.hidden && audio.readyState >= 3 && this.context?.state === 'running'
        this.analysisActive = active
        if (active) { this.analyser!.getByteFrequencyData(this.bins); this.analyser!.getByteTimeDomainData(this.waveform) }
        this.sampledAt = now
        this.director.update(this.bins, this.waveform, this.context!.sampleRate, dt, active)
        this.analysisMs += ((performance.now() - now) - this.analysisMs) * 0.1
        this.silence = active && this.director.signal.energy < 0.001 ? this.silence + dt : 0
        this.status = !active ? 'Idle / paused' : this.silence > 5 ? 'No signal: silence or capture restriction' : 'Analyzing current radio'
      }, 33)
      this.status = 'Analyzing current radio'
    } catch { this.status = 'Capture restricted; radio playback unaffected'; this.detach() }
  }
  detach() {
    this.analysisActive = false; this.miami.clear()
    window.clearInterval(this.timer); this.timer = 0
    this.source?.disconnect(); this.analyser?.disconnect()
    this.stream?.getTracks().forEach(track => track.stop())
    this.source = null; this.analyser = null; this.stream = null; this.director.reset()
  }
  dispose() { this.detach(); void this.context?.close(); this.context = null }
}
