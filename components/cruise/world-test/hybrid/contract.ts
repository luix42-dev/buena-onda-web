export type HybridContent = 'environmentOnly' | 'fullFrame' | 'diagnosticReference'

export type HybridCamera = {
  horizontalFovDeg: number
  aspect: number
  eyeHeightM: number
  speedMps: number
  /** Every source frame has a corresponding authored camera pose; no inferred head motion. */
  poseUrl?: string
}

export type HybridSegment = {
  id: string
  url: string
  durationSeconds: number
  fps: number
  content: HybridContent
  provenance: string
  camera?: HybridCamera
  /** Contiguous source frame after preceding segment. Omit if continuity is unverified. */
  firstSourceFrame?: number
}

export type HybridPlaybackSnapshot = {
  status: 'unavailable' | 'loading' | 'paused' | 'playing' | 'buffering' | 'ended' | 'error'
  segmentId: string | null
  segmentIndex: number
  mediaSeconds: number
  timelineSeconds: number
  presentedFrames: number
  droppedFrames: number
  bufferedAheadSeconds: number
  transitions: number
  lastTransitionGapMs: number | null
  firstFrameMs: number | null
  message?: string
}

/** UE centimeters +X forward/+Y right/+Z up to Three meters +Y up/-Z forward. */
export function unrealToThree([x, y, z]: readonly [number, number, number]): [number, number, number] {
  return [y / 100, z / 100, -x / 100]
}

export function verticalFov(horizontalFovDeg: number, aspect: number) {
  return 2 * Math.atan(Math.tan(horizontalFovDeg * Math.PI / 360) / aspect) * 180 / Math.PI
}

export function timelineSeconds(segments: readonly HybridSegment[], index: number, mediaSeconds: number) {
  return segments.slice(0, index).reduce((sum, segment) => sum + segment.durationSeconds, 0)
    + Math.max(0, Math.min(mediaSeconds, segments[index]?.durationSeconds ?? 0))
}

export function bufferedAhead(video: Pick<HTMLVideoElement, 'buffered' | 'currentTime'>) {
  for (let i = 0; i < video.buffered.length; i++) {
    if (video.buffered.start(i) <= video.currentTime && video.buffered.end(i) >= video.currentTime)
      return video.buffered.end(i) - video.currentTime
  }
  return 0
}

/** A temporal qualification only. Adjacent frame numbers do not establish optical quality. */
export function temporalJoin(a: HybridSegment, b: HybridSegment) {
  if (a.fps !== b.fps || a.firstSourceFrame === undefined || b.firstSourceFrame === undefined) return false
  return Math.abs(a.durationSeconds * a.fps - Math.round(a.durationSeconds * a.fps)) < 1e-6
    && a.firstSourceFrame + Math.round(a.durationSeconds * a.fps) === b.firstSourceFrame
}

export function canCompositeForeground(segment: HybridSegment, verifiedCalibration: boolean) {
  return segment.content === 'environmentOnly' && !!segment.camera && verifiedCalibration
}
