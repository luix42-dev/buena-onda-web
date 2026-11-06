import type { CastCommand, CastStatus } from './google-cast'

type ReceiverAudio = {
  stationId: string
  playing: boolean
  requested: boolean
  loading: boolean
  volume: number
  muted: boolean
  error: string | null
  selectStation: (id: string) => boolean
  start: () => void
  pause: () => void
  setVolume: (volume: number) => void
  setMuted: (muted: boolean) => void
}

export type ReceiverValue = {
  audio: ReceiverAudio
  ready: boolean
  start: () => void
  scene: (scene: Record<string, string>) => void
  sceneState?: Record<string, string>
}

const sceneChoices: Record<string, readonly string[]> = {
  drive: ['city', 'highway', 'retrowave'],
  car: ['coastal-coupe', 'classic-coupe', 'island-trail', 'countach', 'delorean', 'eighties', 'cadillac', 'wrangler'],
  time: ['night', 'sunset'],
  mood: ['cruise', 'night-drive', 'midnight-run'],
}

/** Commands survive scene warmup; acknowledgements describe observed playback, not intent. */
export function createCastReceiverController(read: () => ReceiverValue, stations: readonly string[]) {
  const pending: CastCommand[] = []
  let waitingFor: CastCommand | null = null
  let ackRequestId: string | undefined
  let appliedSequence: number | undefined
  let commandError: string | undefined
  let sceneStarted = false

  // A newly launched receiver must be silent until the sender completes the handoff.
  read().audio.setMuted(true)

  function receive(command: CastCommand) {
    if (command?.version !== 1 || !Number.isSafeInteger(command.sequence)) return
    if (command.type === 'status') return
    if (!['sync', 'play', 'pause', 'station', 'volume'].includes(command.type)) return
    if (command.station && !stations.includes(command.station)) {
      commandError = 'Station not validated for this receiver'
      return
    }
    const scene: Record<string, string> = {}
    if (command.scene) {
      for (const [key, choices] of Object.entries(sceneChoices)) {
        const value = command.scene[key]
        if (value === undefined) continue
        if (!choices.includes(value)) {
          commandError = 'This Cruise scene is not available on TV'
          return
        }
        scene[key] = value
      }
    }
    commandError = undefined
    pending.push({ ...command, scene: command.scene ? scene : undefined })
  }

  function tick(): CastStatus {
    const before = read()
    let appliedThisTick = false
    if (before.ready || sceneStarted) {
      // Status probes never enter this queue or replace a pending launch sync.
      for (const command of pending.splice(0)) {
        const value = read(), audio = value.audio
        // Muting precedes selection/start, including an already-playing receiver.
        if (command.muted !== undefined) audio.setMuted(command.muted)
        if (command.volume !== undefined && Number.isFinite(command.volume)) {
          audio.setVolume(Math.max(0, Math.min(1, command.volume)))
        }
        if (command.scene) value.scene(command.scene)
        if (command.station && !audio.selectStation(command.station)) {
          commandError = 'This station is not available on TV'
          continue
        }
        if (command.type === 'sync' && command.playing !== undefined) {
          value.start()
          sceneStarted = true
          command.playing ? audio.start() : audio.pause()
        } else if (command.type === 'play') audio.start()
        else if (command.type === 'pause') audio.pause()
        appliedSequence = command.sequence
        appliedThisTick = true
        if (command.requestId) waitingFor = command
      }
    }

    const value = read(), audio = value.audio
    const desiredPlaying = waitingFor?.type === 'play' ? true
      : waitingFor?.type === 'pause' ? false : waitingFor?.playing
    const sceneMatches = !waitingFor?.scene || Object.entries(waitingFor.scene)
      .every(([key, expected]) => value.sceneState?.[key] === expected)
    // React setters are asynchronous. Observe a later render/tick before acknowledging,
    // especially when a paused launch starts scene warmup without changing audio state.
    if (waitingFor && !appliedThisTick && value.ready && !audio.error && !commandError
      && (!waitingFor.station || audio.stationId === waitingFor.station)
      && (desiredPlaying === undefined || (audio.playing === desiredPlaying
        && audio.requested === desiredPlaying && (!desiredPlaying || !audio.loading)))
      && (waitingFor.muted === undefined || audio.muted === waitingFor.muted)
      && (waitingFor.volume === undefined || Math.abs(audio.volume - Math.max(0, Math.min(1, waitingFor.volume))) < .0001)
      && sceneMatches) {
      ackRequestId = waitingFor.requestId
      waitingFor = null
    }
    return {
      version: 1, type: 'state', station: audio.stationId, playing: audio.playing,
      requested: audio.requested, loading: audio.loading, volume: audio.volume,
      muted: audio.muted, ready: value.ready, scene: value.sceneState,
      ackRequestId, appliedSequence, error: commandError || audio.error || undefined,
    }
  }

  return { receive, tick }
}
