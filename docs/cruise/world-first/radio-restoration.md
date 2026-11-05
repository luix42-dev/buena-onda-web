# World Test radio and saved songs

Owner: `/root/audio_music`, configured model `gpt-6.1-sol`. Local isolated work on October 11, 2026 (America/New_York). Original Cruise, `useCruiseAudio`, station registry, APIs, production data and radio streams were not edited by this workstream.

Status: **SONG LIBRARY COMPONENT BUILT / DATA BEHAVIOR VERIFIED / SHELL INTEGRATION AND BROWSER VERIFICATION OWNED BY LEAD**.

## Audit finding

Read the current shared audio hook, `RadioPanel`, `PersistentPlayer`, `/api/radio/tracks`, `lib/radio.ts`, `lib/radio-metadata.ts`, and earlier radio/playback documentation. Repository searches for listener favorites, song saving, bookmarks and discovery found no existing listener song library. Existing saves edit Studio track titles/order; Cruise's localStorage entries persist garage selections and tutorial completion. Radio discovery currently selects stations; `MusicDirector` analyzes signal characteristics and does not recognize songs. This audit establishes this checkout's implementation, not what might exist in an unrelated historical project.

The owned playlist API provides title/artist and optional key/status, with existing catalog/filename metadata handling. `useCruiseAudio` consumes title/artist, combines them as `trackTitle`, and does not expose structured current metadata, a current source URL or a stable track key. External streams instead populate `trackTitle` with the station name and an empty artist. Splitting that string at ` - ` would be ambiguous; a track may contain that separator. No title/artist/ID is inferred or generated here.

Prior [playback guidance](../cinema/PLAYBACK.md) requires station/source/time attribution and official listening links for unresolved identification. The [existing coverage review](audio/README.md) lists the twelve target stations and metadata gaps. No recognition service, metadata API integration, recording, relay or stream download is introduced.

## Isolated implementation

`components/cruise/world-test/SongLibrary.tsx` takes the existing audio object. `saved-songs.ts` owns the local format and eligibility checks. A label can be saved only for the owned Buena Onda playlist source `/api/radio/tracks`, while the hook reports available, not loading and no error, with a nonempty label distinct from the station name. A previously loaded paused track may still be saved; this does not start playback. The saved entry preserves the exact catalog label, station name/ID, metadata source and save timestamp. It does not store an audio URL, separate guessed artist/title or a fabricated song ID.

The control displays `Track information unavailable` when no eligible owned label exists. It disables Save and offers the selected external station's existing official catalog link. Existing live station labels never become saved songs. Unknown tracks do not trigger recognition or server requests.

Entries persist under **`buena-onda-world-test-songs-v1`** on the current origin/browser. Save re-reads storage to retain changes made by another tab; storage events refresh the list. Remove affects only the selected entry. Browser storage failures produce a status message rather than a false success. Initial reads never overwrite existing storage. Invalid JSON/version produces a read failure; malformed individual entries are ignored and unsupported stored fields are discarded. The library caps at 200 entries without automatically dropping older saves.

Repeated saves deduplicate by the exact station-scoped label. This is a local bookmark identity, not a song identity: different owned recordings with identical labels cannot be distinguished until the audio interface exposes a real catalog key. Saved entries do not offer replay because this interface does not expose a reliable source/key. No audio player/context is created; saving/removing/listing does not pause, reload or seek the radio/world. Local browser persistence is not an account-synchronized music collection.

## Integration contract

Lead owns `WorldExperience.tsx`, `WorldVisual.tsx` and CSS. Mount the new component within the persistent radio panel/controls using the existing object:

```tsx
import SongLibrary from './SongLibrary'

<SongLibrary audio={audio} />
```

Required fields: `station`, `trackTitle`, `available`, `loading`, `error`. The unchanged `ReturnType<typeof useCruiseAudio>` satisfies this shape. No additional API call or hook instance is needed. Styling hooks are `.world-song-library`, `.world-song-current`, and `#world-saved-songs`. The Saved songs button exposes its count and opens a removable list. Preserve radio visibility and touch accessibility when positioning these controls.

## Evidence and pending verification

October 12 integration update: actual desktop and phone-emulated browser flows now verify real catalog label save/reload/remove and disabled unknown-live saving, with radio ownership preserved across visual changes. See the [restoration QA report](restoration-qa/README.md) for accepted runs and contaminated first-attempt evidence. No fixture was needed. The paragraphs below describe the earlier component-only verification stage.

`node --import tsx --test docs/cruise/world-first/radio-restoration.test.ts` — **2 passed, 0 failed**, duration 1.309 seconds. Checks cover all original external stations rejected as saveable songs, loading/error/unknown states, exact labels containing multiple separators, save/reload/remove, duplicates, malformed/unsupported storage versions, and stripping fabricated artist/ID/audio fields.

These are data-behavior tests, not a browser localStorage or React lifecycle pass. Lead integration must run typecheck and actual local browser verification: save a supplied owned label, reload and see it retained, remove/reload, switch to an external station and see disabled Save plus the official link, and confirm radio/video identity and time remain independent. A clearly labeled local fixture may test persistence if the owned library is unavailable; it must not be described as an actually heard/identified song. No browser was launched by this workstream while Unreal resource limits remained in effect.
