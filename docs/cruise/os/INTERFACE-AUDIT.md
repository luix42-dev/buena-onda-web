# CruiseOS interface baseline audit

October 15, 2026. Preserved production route: `http://127.0.0.1:3077/cruise/experience`. Source inventory from the isolated CruiseOS worktree before app integration. Browser evidence is Windows Edge with desktop 1280×720 and portrait 390×844 viewport emulation, DPR 1. Emulation does not establish physical phone behavior. Automated task durations measure harness actions, not human comprehension or usability.

## Source inventory and ownership of state

| Surface / file | Functions | Existing state / interaction concerns |
| --- | --- | --- |
| `OpeningMinute.tsx` | Start; ride, time, quality, park, map, listening-only; camera menu | Own `options` and `camera` booleans; those two close each other. Focus entry and Escape restoration exist. No coordination with discovery, Cast or postcard state. |
| `DiscoveryConsole.tsx` | Persistent player; directory/search/category; tune, surprise, favorites, ordered presets, finds/export/search links; listening-only, presence, memory, sources | Own panel/tab/filter/query state. Focus moves to Close and returns on unmount. Escape closes panel. Panel is a section, not modal, so no modal focus trap is implied. Other panels may remain open. |
| `JeepNight.tsx` | Audio/world lifecycle, camera/landmark/radio focus, map, sharing, presence, quality, original physical radio | Orchestrates many independently owned surfaces. Experience hides older toolbar/brand/mood via CSS, but retains physical-radio focus and separate radio panel logic. Camera focus and discovery can expose overlapping radio functions. |
| `CastControl.tsx` | Instructions for browser tab mirroring, external help | Local open state, outside-click/Escape close, trigger restoration. It does not launch a cast-device picker. Nested placement in scrollable options can clip its absolutely positioned content. |
| `CruisePostcard.tsx` | Actual scene capture; native modal preview; PNG download/share/link | Own preview/busy state; native `dialog.showModal`, focus restore and object-URL cleanup. Appears after 65 seconds. Native modal is different from other nonmodal surfaces; integration must not leave underlying panels active after close. |
| `ExperienceMetricsControls.tsx` / `useExperienceMetrics.ts` | Optional local technical counters, report/export/delete | Nested details under options; may be far down a short mobile viewport. Local counters disclose no transmission; do not relabel as live listeners or server analytics. |

Repeated functions include playback (deck, discovery tuner, physical radio), tuning (deck Next, directory, surprise, presets, physical seek), saving (deck and program), listening-only (options and discovery), and sources (world credits and discovery). Repetition is not itself a bug, but inconsistent placement and independent open states increase navigation effort. Reuse one audio state and persistence contract; organize access without duplicating systems.

### Detailed control inventory and destination mapping

This inventories rendered control families, including repeated station/collection rows; row counts depend on real catalog and saved data. Decorative equalizer bars and tick marks are not additional controls. Visibility conditions below come from source, not an assertion that every variant was physically tested.

| Existing control / information | Existing visibility | Cruise OS destination |
|---|---|---|
| Brand link, short product message, entry heading, readiness copy | Opening / header | World header and entry |
| Start cruising, optional five-car selector | Entry and options | World Start; Glovebox > Garage; optional Just listen |
| Camera opener, Cockpit / Coastal view / Cinematic, Done | Camera panel | Labeled native World selector |
| Cruise options / Choose your ride, Done | Header / options | Glovebox and visible Close / Back |
| Night / Sunset, quality Auto / High / Medium / Low | Options | Settings |
| Park / Continue, Show / Hide map, Listen without 3D | Options, repeated discovery footer | World Autodrive; Places map; Settings scenery |
| Cast icon + label, instruction close, numbered steps, help link | Nested options popup | Settings disclosure with instructions inline |
| Local diagnostics disclosure, consent, report, export, delete, storage status | Options | Settings, existing controller retained |
| Initial driving guidance, timed preset tip and Got it | Opening-minute overlays | Short contextual World guidance; permanent Save station action |
| Landmark name, Take a closer look, parked label and Back to drive | Nearby / inspection | Places and World Back to drive |
| Capture postcard, busy state, preview close, image, PNG download, share, copy link, failure feedback | After 65 seconds, separate native dialog | Glovebox > Postcards, inline preview in one modal |
| Play / Pause icon and pressed state | Deck, tuner, physical cockpit | Persistent Radio and every modal listening footer |
| Station name, tuning / signal / on-air status, show/DJ if supplied, verified song or unavailable message | Deck and program | Persistent station/show display; complete Radio program |
| Volume label / range, mute / unmute | Deck and physical cockpit | Radio deck and modal footers |
| Station-name opener and Tune & discover duplicate opener | Deck | One labeled Radio opener |
| Next station, Previous / Surprise me / Next | Deck / discovery panel | Deck Previous / Next; explicit Radio Surprise me |
| Favorite current station star, per-row favorite stars | Tuner / station list | Direct Save station; directory Save buttons |
| Save song / saved state or Bookmark broadcast | Deck / program | Verified song save or explicit broadcast bookmark; distinct semantics |
| Search, clear, category select, result count, empty state | Directory | Radio directory |
| Per-station Tune / Tuned / external site, identity, location and genres | Directory | Radio directory, original catalog order |
| Collection tabs Stations / My presets / My Finds | Radio panel | Radio; Glovebox > Saved stations / My Finds |
| Preset tune, up / down / remove | Presets | Saved stations, manual order |
| Find title, artist, station, saved date, track/bookmark type | Finds | My Finds |
| Export JSON; Bandcamp / Spotify / Apple Music / YouTube searches; copy / share / SVG card / remove | Finds | My Finds, original helpers |
| Retry station, storage error, memory error, transient copy/tuning status | Panel / status | Radio errors; world storage/status lane |
| Focus dashboard radio, share station, remember last station | Discovery footer | Radio options |
| Presence consent, real leased count | Footer / World pill | Settings consent, World count |
| Credits/sources disclosure, individual vehicle author/license links, texture and map attribution | Multiple footer disclosures | Settings and Radio credits; map attribution persists in World |
| Physical cockpit power, seek, presets, volume, mute and lights | Interactive car meshes / context | Existing meshes remain; essential radio actions also have DOM alternatives |
| Cinematic letterbox toggle / title card | Director mode; portrait bars hidden by existing CSS | Existing Director overlay retained |
| Legacy glow, time, share, fullscreen, car / pace / quality controls, speed readout, garage return, station panel, spectrum | Other variants; several CSS-hidden in experience | Original variants preserved. Glow, pace, fullscreen and ride access explicitly available in OS Settings / Garage. World speed telemetry remains diagnostic rather than a persistent OS readout. |
| Advertising cues, sign activation and geometric exposure sampling | Existing first-minute gate / world | World infrastructure retained; OS modal visibility additionally gates measurement |

### Opening through five minutes

The source-defined journey begins with one Start gesture; audio and assets load independently. In the experience baseline, an automatic cockpit reveal occurs around 12 simulation seconds unless the listener chose a camera or requests reduced motion; preset guidance appears at 45-65 seconds, ads are eligible after 60, and the postcard trigger after 65. These timings are simulation time, not guaranteed wall-clock loading targets.

The actual baseline harness starts, checks playback after five seconds, opens Radio, saves Jolt, tunes NTS, explores collections and options/Cast, changes camera, then observes 300 further wall-clock seconds. Its raw samples record continued movement/audio and actual panel states. This is a scripted journey lasting longer than five minutes, not a representative novice's first-five-minute usability result. Cruise OS retains the existing camera/scene progression, removes the timed preset prompt in favor of an always available station save, and makes postcards accessible from Glovebox without waiting for a promotional trigger.

## Fresh observed evidence

Screenshots and raw observations: [baseline evidence](evidence/baseline/results.json). Script: `scripts/cruise-os-proof.mjs --baseline`. The desktop entry capture is immediate after Start becomes available: it shows the invitation against a dark background, not an established cold-load scene failure. By five seconds after Start, the Miami scene and vehicle are visible, radio metadata is displayed and playback advances.

The [desktop radio](evidence/baseline/desktop-radio.png) uses a substantial right-side panel while the bottom player remains visible. Station-published show information is distinguished from unavailable song metadata. The directory and collection tabs require scrolling within that panel. The [Cast-in-options capture](evidence/baseline/desktop-options-cast.png) shows the Cast button at the bottom edge of a scrollable options surface; its expanded instructions are outside the visible area. This is a concrete baseline discoverability problem, not a claim that browser casting is broken.

Completed baseline: nine assertions passed in each viewport, including audio advancement, station selection, favorite state, Escape closure and no document overflow. Both Cast and its enclosing options disappeared on one Escape, with focus returning to Cruise options: this verifies the independent-handler interaction. Portrait radio uses nearly the whole viewport; its station search begins below the initially visible section, and the persistent player remains visible. Portrait Cast instructions are visibly clipped by the enclosing scroller.

Desktop's 300-second journey ended around 4.54 km with the original audio element still playing NTS at 307 seconds, in cockpit view. No page exceptions occurred. Console logs contain missing-resource 404s and NTS CORS errors; successful subsequent playback does not make the console clean. Desktop automated click durations: Start 531 ms, Radio 155 ms, favorite 76 ms, tune selection 127 ms. Portrait Start took 4875 ms, demonstrating why a single harness action duration is not a reliable human-task or product-speed comparison. No FPS benchmark is part of this interface audit. The journey is one route segment and network condition, not a full-loop, thermal or background-tab certification.

## CruiseOS acceptance priorities

1. One clear entry action; preserve gesture-based radio startup while the vehicle/map loads independently.
2. One coherent surface manager for Radio and Glovebox; Escape closes the active surface and restores its own trigger. Popovers must not become clipped by a parent scroller.
3. Keep essential station/play/volume/tuning visible in every view, including listening-only, with direct touch and keyboard alternatives to physical cockpit controls.
4. Consolidate collections/settings/sources/share into understandable destinations; preserve existing local favorites/finds and truthful metadata fallback.
5. Verify audio-element continuity while opening panels, tuning, changing camera, and exiting 3D. A selected station is not proof of successful network playback.
6. Inspect portrait/landscape layouts, focus order, offscreen controls, reduced motion and actual console errors. Do not infer accessibility compliance from screenshot fit alone.

The baseline harness has separate old/new control contracts. Screen-reader, physical gamepad, real-phone and representative-user validation remain outstanding.

## First integrated CruiseOS inspection

[First run](evidence/current/results.json), desktop and portrait: Start, playback, station selection, saving a station, radio search, collection transitions, single native dialog, Radio Escape focus restoration, viewport fit and panel audio continuity passed. No page exceptions. Two failed assertions per viewport expected one Escape from Settings to close everything; source intentionally returns Settings to Glovebox first. The test is corrected to verify that transition, followed by a second Escape to close and restore focus. The failed artifacts remain available; they are not relabeled as a passing run.

Actual screenshots show the Radio dialog pinned to the viewport's upper-left while Glovebox centers. This was reported for correction. Portrait's modal footer remains usable while long content scrolls above; radio station search/category is lower in the document than the initial program information. Modal headings and uncluttered Glovebox destinations provide a clearer hierarchy than baseline. Cold development rendering remained dark at the five-second checkpoint while audio played and truthful preparation copy remained visible; compare production loading separately before treating this as a regression. No performance or full accessibility conclusion follows from these interface captures.

## Final audit status

Radio centering and narrow volume layout were corrected and independently checked on frozen production3081: desktop31/31 and narrow30/30 assertions pass. Six viewport/motion contexts passed the earlier extended gate. Native dialogs prevent overlapping collection/Glovebox surfaces, Escape follows the intended back/close hierarchy, focus returns to the trigger, and playing audio survives panel navigation and listening-only mode. Actual postcard output was downloaded and viewed. Synthetic metadata/outage/controller tests and a corrected diagnostic-arrival probe are documented separately; they are not live content or physical-hardware proof.

The requested [final UI comparison](UI-COMPARISON.md) includes raw union-bound screen-footprint measurements, screenshots, exact automated durations, preserved failed artifacts and limitations. Selected DOM coverage increased in the sampled desktop/portrait states; no reduction in opaque visual obstruction or improvement in human usability is claimed. No further QA browser remained open after the final union capture, allowing the lead to run isolated performance measurement.
