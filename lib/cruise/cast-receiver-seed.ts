import type { CastCommand } from './google-cast'

const choices: Record<string, readonly string[]> = {
  drive: ['city', 'highway', 'retrowave'],
  car: ['coastal-coupe', 'classic-coupe', 'island-trail', 'countach', 'delorean', 'eighties', 'cadillac', 'wrangler'],
  time: ['night', 'sunset'],
  mood: ['cruise', 'night-drive', 'midnight-run'],
}

/** Seed one frame from the first complete sync, never from a probe or later update. */
export function createReceiverFrameSeed(stations: readonly string[], diagnostics = false) {
  let seeded = false
  return (command: CastCommand): string | null => {
    if (seeded || command?.version !== 1 || command.type !== 'sync'
      || !Number.isSafeInteger(command.sequence) || typeof command.playing !== 'boolean'
      || typeof command.station !== 'string' || !stations.includes(command.station)) return null
    const params = new URLSearchParams({ tv: '1', receiver: '1', quality: 'low', station: command.station })
    for (const [key, allowed] of Object.entries(choices)) {
      const value = command.scene?.[key]
      if (value === undefined) continue
      if (!allowed.includes(value)) return null
      params.set(key === 'mood' ? 'pace' : key, value)
    }
    if (diagnostics) params.set('diagnostics', '1')
    // Playback is deliberately absent: the muted receiver controller applies
    // the queued sync and confirms actual readiness before audio handoff.
    seeded = true
    return `/cruise?${params.toString()}`
  }
}
