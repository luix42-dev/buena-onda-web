import { MusicDirector } from './music'
import { MiamiChoreography } from './miami-choreography'
import { acquireMediaElementAudio } from '../cruise/media-element-capture'

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
  private captureLease: ReturnType<typeof acquireMediaElementAudio> | null = null
  private bindCapture: (() => void) | null = null
  /** Latest frequency bins (0-255). Read-only for visualizers; refreshed ~30 Hz while analysis is active. */
  readonly bins = new Uint8Array(1024)
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
      this.captureLease = acquireMediaElementAudio(audio)
      this.stream = this.captureLease.stream
      this.analyser = this.context.createAnalyser(); this.analyser.fftSize = 2048; this.analyser.smoothingTimeConstant = 0.35
      let boundTrack: MediaStreamTrack | undefined
      this.bindCapture = () => {
        const track = this.stream?.getAudioTracks().find(item => item.readyState === 'live')
        if (track === boundTrack) return
        boundTrack = track
        this.source?.disconnect(); this.source = null
        if (!track || !this.context || !this.analyser) return
        this.source = this.context.createMediaStreamSource(new MediaStream([track]))
        this.source.connect(this.analyser) // The original radio remains the only audible local output.
      }
      this.stream.addEventListener('addtrack', this.bindCapture)
      this.stream.addEventListener('removetrack', this.bindCapture)
      this.bindCapture()
      this.previous = performance.now(); this.silence = 0
      this.timer = window.setInterval(() => {
        const now = performance.now(); const dt = (now - this.previous) / 1000; this.previous = now
        const active = !!this.source && !audio.paused && (!audio.muted || audio.dataset.cruiseLocalSilent === 'true') && !document.hidden && audio.readyState >= 3 && this.context?.state === 'running'
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
    if (this.bindCapture) {
      this.stream?.removeEventListener('addtrack', this.bindCapture)
      this.stream?.removeEventListener('removetrack', this.bindCapture)
      this.bindCapture = null
    }
    this.captureLease?.release(); this.captureLease = null
    this.source = null; this.analyser = null; this.stream = null; this.director.reset()
  }
  dispose() { this.detach(); void this.context?.close(); this.context = null }
}
