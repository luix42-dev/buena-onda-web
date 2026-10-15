# Phase Three: bounded radio integration plan

Prepared October 15, 2026 after reading `COMPETITOR-RESEARCH.md`, `MASTER-PLAN.md`, `PHASE-RESULTS.md`, current `DiscoveryConsole`, metadata hook/adapters, discoveries hook, sharing helpers and Jeep integration. Phase One passed; Phase Two's browser gate is running. This document proposes work only. No future-phase application code changed in this task.

## Outcome

Make choosing and returning to real radio effortless in `/cruise/experience`, while retaining Human Radio's working playback, source attribution, manual favorites and validated collection. Do not create another player, playlist engine, station stream proxy or metadata provider. The scene and camera changes remain owned by the lead.

## What already works and what actually needs work

| Area | Current source behavior | Bounded next change |
| --- | --- | --- |
| Station discovery | Editorial category select and explicit station list; no search input | Client-only name/place/genre search combined with categories; preserve catalog ordering |
| Random tuning | Explicit Surprise Me excludes current station and uses eligible direct streams | Preserve; cover empty/single station edge cases |
| Presets | Manual favorites/order, cross-tab local sync, storage warnings | Reuse unchanged |
| Song discoveries | Provider-provenance and expiry validation; separate broadcast bookmarks, export and searches | Reuse; strengthen render-boundary metadata validation if needed |
| Share links | Console calls a helper hardcoded to `/cruise/human-radio` | Optional allowlisted destination; old default remains identical |
| Return station | No explicit last-station setting in console | Experience-only opt-in remembering of one manually chosen station, restored without playback |
| Metadata | Fixed providers, expiry timer, abort/revision isolation, visibility refresh, unavailable fallback | Validate incoming response shape/freshness/source before display; preserve no-audio-interception design |
| Keyboard | Discovery close autofocus, Escape close and opener focus restoration | Preserve and test with search; maintain ordinary nonmodal panel semantics |
| Compact player | Persistent play/volume/mute and station identity; full seek in panel | Keep intact; only small contextual notices needed |

Current `PHASE-RESULTS.md` can lag running work; it says Phase Two not started while the lead reports that gate running. This plan uses the lead's phase state and does not declare a gate passed.

## Proposed ownership and interfaces

Radio worker may own the following after the gate authorizes implementation:

- `components/human-radio/DiscoveryConsole.tsx`: optional `sharePath?: '/cruise/human-radio' | '/cruise/experience'`, `rememberStation?: boolean` and `searchable?: boolean`; defaults preserve old-route behavior. Search UI, clear control, count/empty state and return preference are bounded additions.
- `lib/human-radio/explore.ts`: optional third share-helper argument `path` restricted to the two internal destinations. Construct with `URL`/`URLSearchParams`; never accept arbitrary redirect targets.
- New `lib/human-radio/station-memory.ts`: strict bounded versioned station preference parser and selection precedence helpers; existing stream eligibility contracts remain authoritative.
- New `components/human-radio/useStationMemory.ts`: optional restoration/persistence at the console boundary, with storage errors and no playback calls.
- `components/human-radio/useHumanMetadata.ts`, and a small exported pure validator in the metadata module if necessary: validate displayed data with deterministic tests rather than trusting a TypeScript cast of `response.json()`.
- `components/human-radio/human-radio.css`: narrowly scoped styles for the new input/status/control, with no layout redesign.
- New `tests/experience-radio.test.ts` plus focused extensions to existing exploration/metadata tests when directly relevant.

Lead owns `JeepNight.tsx`: pass `sharePath="/cruise/experience" rememberStation searchable` only for the new mode. No worker changes to the shared scene, original route, audio hook or existing playback state machine. A separate new browser script can be assigned once the unit/type gate passes; only one heavy browser at a time.

If the lead prefers fewer surface flags, use a single optional `experienceMode?: boolean` with explicit defaults. Do not infer behavior from a loose pathname substring or automatically change other Cruise routes.

## Search behavior

Use a labeled `type="search"` input, maximum 120 characters. Match case-insensitively against station name, city, country, genres and editorial description using a small pure helper. Treat text as text, never as a regex or HTML. Collapse surrounding whitespace; no remote search calls, profiles, relevance ranking or learning. Results follow the existing editorial catalog order and intersect the chosen category.

Provide a visible result count and a useful zero-result message with a clear-search action. The category remains selected when the query is cleared. Escape should first close the panel consistently with existing behavior; do not add conflicting global keyboard shortcuts. Input typing must never steer the car, tune a station or invoke scene shortcuts.

External-only stations remain searchable and retain their official-site links; their presence must not imply in-app playback works. No automatic station selection occurs from search text.

## Last station: explicit local preference, no autoplay

Offer an unchecked-by-default `Remember my station on this browser` setting. It stores only `{version:1, enabled:true, stationId}` in a separate bounded local key, for example `buena-onda:experience:station:v1`. This is a requested preference, not a listening history. Clearing it removes that key only; presets and My Finds remain untouched.

Precedence: valid explicit URL station selection first, then remembered playable direct station, then existing default. Honor recognized explicit station parameters even if they require the existing error/fallback UI; do not silently substitute a stored station for a friend's link. Ignore unknown IDs and malformed/oversized data. A disabled station cannot be restored as if available. Keep manual choice for an owned playlist with an outage, but do not auto-restore known-failing/disabled playback without explaining the limitation.

Initialization must read preference before any persistence effect can overwrite it with the default station. Mark hydration/restoration explicitly; React Strict Mode's duplicate effects must remain idempotent. Use the latest audio ref for selection, with a one-time per-mount restoration guard. Restoration calls `selectStation` only; never `start`, `toggle`, `play`, or a synthetic gesture. The default audio owner starts paused and the first actual listening gesture remains required. Existing query-state initialization in the parent must be coordinated rather than raced.

Persist subsequent explicit user station changes once enabled. A change received through restoration or a cross-tab preference update must not start playback. Prefer adopting external preference changes on the next visit; do not retune an active listener unexpectedly. Browser storage failures produce a small honest status; the current session/player remains functional. There is no remote synchronization or analytics event in this phase.

## Metadata correctness and outage behavior

The existing server adapter already avoids splitting Jolt/NTS combined broadcast text into invented tracks. Dublab tracks require separate artist/title fields and a valid provider time window. Keep those rules, response body limits, fixed origins and no redirects. Never loosen confidence to make the save button more often available.

Before rendering a response, verify station identity, legal kind, boolean availability, bounded nullable text, legal confidence, exact allowed provider URL, matching provenance type/URL, valid observed/verified/expiry times, no future/stale observation and expiry no later than the provider TTL. Reject malformed values as unavailable. A station unsupported by metadata may play normally without titles. Source links must be fixed/validated HTTPS provider destinations.

Use a single validation contract for display and save eligibility where practical so a title cannot appear confidently while saving rejects it for a different source rule. A track needs artist and title; a broadcast uses the `show` field and stays explicitly labeled. Never borrow a prior station's metadata or let an aborted old request overwrite the selected station.

Failures should show `Track information unavailable` while station identity, audio, volume, retry/retune controls and official support link stay usable. A stale label disappears by its expiry, even while the next request hangs or the tab resumes. Save/broadcast bookmark is disabled once its evidence expires. Keep polling bounded; do not retry per animation frame. User-initiated recognition remains deferred.

## Accessibility and visual constraints

- Search, category, return setting, retry, presets and external links need explicit labels and readable focus styles.
- Keep 44px intended touch targets, portrait/landscape volume access and the lower permanent player unobscured.
- Preserve close-button focus on panel open, Escape handling and focus return to the actual opener; do not announce every keystroke through an unnecessarily assertive live region.
- Empty results and storage/metadata failures must be understandable without color alone. No live-track announcement is invented when the API publishes only a broadcast.
- Preserve reduced motion, attribution and source/support access. Search is an optional detail inside the panel, not another opening-minute overlay.

## Acceptance tests before declaring Phase Three passed

1. Unit: search name/place/genre case/whitespace/category intersection; zero results; catalog order; hostile strings treated as text.
2. Unit: old share-helper default unchanged, experience destination preserved, station parameter encoded, unsupported destination refused/falls back safely.
3. Unit: station preference unknown/disabled ID, malformed/oversized JSON, disabled toggle, explicit-link precedence, storage read/write errors and no legacy-key overwrite.
4. Unit: metadata wrong station/source, unsafe URL, missing artist/title, broadcast distinction, future/stale/expired times, oversized/malformed fields and the supported valid-provider fixture.
5. Browser: manual Jolt/NTS tuning with actual advancing audio; search/filter and Surprise Me remain usable without changing the stream unless explicitly requested.
6. Browser: enable station memory, select NTS, reload, observe NTS identity **and paused audio before any gesture**; explicit Jolt link overrides NTS; disable memory then reload returns to default. Test read/write denial without losing radio controls.
7. Browser: labeled track fixture saves and exports; real metadata outages show fallback without stopping actual playback; stale/wrong-source fixture does not become a saveable live title.
8. Browser: verify share URL points to `/cruise/experience`; original Human Radio keeps its destination. Inspect portrait and landscape search/results with touch taps, keyboard focus and no deck overlap.
9. Run focused tests and project typecheck; preserve the original Human Radio baseline and publish honest environment/fixture limitations. No physical-device, station-permission, continuous-uptime or real song-identification claim follows from synthetic fixtures.

No analytics, screenshot capture, payments, new dependencies or deployment is part of this phase proposal.
