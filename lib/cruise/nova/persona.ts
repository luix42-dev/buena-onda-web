/** NOVA: the Cruise radio companion. Original character (working name, configurable).
 * The radio is the protagonist; NOVA speaks rarely, never over a fresh station's first seconds,
 * never pitches advertising (sponsored content lives in Signature plots, separately disclosed),
 * and never claims to be human or to have had experiences. */
export const COMPANION_NAME = process.env.NEXT_PUBLIC_CRUISE_COMPANION_NAME || 'NOVA'
export const VOICE_BASE = '/real-miami/nova/voice/'
// portrait.png (1 MB) stays the master; the runtime loads WebP encodes of it (32 KB full size, 1.5 KB card thumbnail).
export const COMPANION_PORTRAIT = '/real-miami/nova/portrait.webp'
export const COMPANION_THUMB = '/real-miami/nova/portrait-thumb.webp'
export const COMPANION_FULL_BODY = '/real-miami/nova/nova-full-body.webp'
/** Pre-rendered talking face per line id (`<id>.webm` / `<id>.mp4`, muted, face-cropped 4:5). */
export const TALK_BASE = '/real-miami/nova/talk/'

export type Chattiness = 'off' | 'quiet' | 'occasional' | 'chatty'
export type Moment = 'first_encounter' | 'welcome_back' | 'discovery' | 'sunset' | 'late_night' | 'save_offer' | 'quiet' | 'tease'
export type Line = { id: string; moment: Moment; text: string }

/** Tone references from the brief plus originals. Ids match the pre-rendered voice manifest. */
export const LINES: readonly Line[] = [
  { id: 'first_encounter', moment: 'first_encounter', text: 'Real radio rides again. Welcome to Buena Onda.' },
  { id: 'welcome_back', moment: 'welcome_back', text: 'There you are. Real radio rides again.' },
  { id: 'discovery_1', moment: 'discovery', text: 'Wait... leave this one on.' },
  { id: 'discovery_2', moment: 'discovery', text: "Okay, I wasn't expecting that. I love it." },
  { id: 'discovery_3', moment: 'discovery', text: 'Wait... this is good. Where did you find this?' },
  { id: 'discovery_4', moment: 'discovery', text: 'Less algorithm. More soul.' },
  { id: 'discovery_5', moment: 'discovery', text: 'Let the DJ decide.' },
  { id: 'sunset', moment: 'sunset', text: 'Look at that sky. We picked the right time to drive.' },
  { id: 'late_night', moment: 'late_night', text: "It's late. The city's all ours." },
  { id: 'late_night_2', moment: 'late_night', text: 'The underground is alive.' },
  { id: 'save_offer', moment: 'save_offer', text: 'Found a good one. Want me to keep it?' },
  { id: 'quiet', moment: 'quiet', text: "You know what? Let's just drive for a while." },
  { id: 'tease_1', moment: 'tease', text: 'You keep skipping the good ones. Trust me on the next one.' },
]

/** Conversational frequency. Default is Occasional: long deliberate silences. */
export const RHYTHM: Record<Chattiness, { minGapSec: number; perHour: number; allow: readonly Moment[]; discoveryChance: number }> = {
  off: { minGapSec: Infinity, perHour: 0, allow: [], discoveryChance: 0 },
  quiet: { minGapSec: 20 * 60, perHour: 2, allow: ['first_encounter', 'welcome_back'], discoveryChance: 0 },
  occasional: { minGapSec: 6 * 60, perHour: 6, allow: ['first_encounter', 'welcome_back', 'discovery', 'sunset', 'late_night', 'save_offer', 'quiet'], discoveryChance: .4 },
  chatty: { minGapSec: 150, perHour: 14, allow: ['first_encounter', 'welcome_back', 'discovery', 'sunset', 'late_night', 'save_offer', 'quiet', 'tease'], discoveryChance: .8 },
}

/** The moments that open a session or answer something the listener just did may bypass the gap. */
const URGENT: readonly Moment[] = ['first_encounter', 'welcome_back']

export type NovaState = { mode: Chattiness; spokenAt: number[]; said: string[]; lastStationChangeAt: number; greeted: boolean }
export type Listening = { playing: boolean; stable: boolean; now: number }

export function createNovaState(mode: Chattiness = 'occasional'): NovaState {
  return { mode, spokenAt: [], said: [], lastStationChangeAt: -Infinity, greeted: false }
}

/** Pure decision: should NOVA say something for this moment right now, and which line?
 * `rnd` is injected so tests and captures are deterministic. */
export function decide(state: NovaState, moment: Moment, listening: Listening, rnd: () => number = Math.random): Line | null {
  const rhythm = RHYTHM[state.mode]
  if (!rhythm.allow.includes(moment) || !listening.playing || !listening.stable) return null
  if ((moment === 'first_encounter' || moment === 'welcome_back') && state.greeted) return null
  const last = state.spokenAt[state.spokenAt.length - 1] ?? -Infinity
  if (!URGENT.includes(moment) && listening.now - last < rhythm.minGapSec) return null
  const hour = state.spokenAt.filter(t => listening.now - t < 3600).length
  if (hour >= rhythm.perHour) return null
  if (moment === 'discovery' && rnd() > rhythm.discoveryChance) return null
  // Never repeat a line within a session; a moment with nothing fresh left stays silent.
  const fresh = LINES.filter(l => l.moment === moment && !state.said.includes(l.id))
  if (!fresh.length) return null
  return fresh[Math.floor(rnd() * fresh.length) % fresh.length]
}

/** Record that a line was actually delivered (call when playback or the caption starts). */
export function spoke(state: NovaState, line: Line, now: number): NovaState {
  return { ...state, spokenAt: [...state.spokenAt, now], said: [...state.said, line.id], greeted: state.greeted || line.moment === 'first_encounter' || line.moment === 'welcome_back' }
}

/** A fresh station needs time to settle before a reaction: 9-14 s of uninterrupted playback. */
export const DISCOVERY_DELAY_SEC = [9, 14] as const
/** First encounter: after the music has been playing for a short while, not at the first frame. */
export const FIRST_ENCOUNTER_AFTER_SEC = 12
/** "Let's just drive": once, after a long uninterrupted stretch. */
export const QUIET_AFTER_SEC = 22 * 60
