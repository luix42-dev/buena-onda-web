import type { CastCommand } from './google-cast'
import type { CastPlaylistPosition } from './cast-playlist'

type CastSource = {
  command: Omit<CastCommand, 'version' | 'sequence'>
  playlist: () => CastPlaylistPosition | undefined
}

let source: (() => CastSource) | null = null

/** The scene supplies current state; its lifetime never owns the TV session. */
export function registerCastSource(read: () => CastSource) {
  source = read
  return () => { if (source === read) source = null }
}

export function readCastSource() { return source?.() ?? null }
