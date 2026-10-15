# Experience references: NIGHTDRIVE and three useful browser comparators

Research date: October 15, 2026. Baseline: Human Radio commit `6fbffd2`. Scope: public static pages, author documentation, public source and existing Cruise evidence. No external game was executed or timed in this pass; no second WebGL browser was launched during baseline capture. Consequently the first-5/15/60-second comparison below describes documented entry mechanics and proposed evaluation, not measured competitor funnels. No accounts, purchases, paid APIs or external assets were used.

## The useful conclusion

Cruise already has the technically important listening controls. Its next improvement should be the feeling of entering an unfolding Miami drive in one gesture, with real radio arriving immediately and obvious control over the dial. Start with composition, pacing and fewer competing entry decisions inside the successful scene. Additional world size, cars and multiplayer would not establish that feeling by themselves. This is a design inference from the baseline and references, not a measured retention result.

## 1. webXOS NIGHTDRIVE

[Official public demo and description](https://webxos.itch.io/nightdrive). The author describes a one-bit, 1995-inspired Tokyo highway, changing named districts and sparse distinctive landmarks. Entry is click/Enter; A/D changes lanes, Q/E tunes, W/S adjusts volume and C changes camera. The soundtrack is oscillator-generated, with twenty station identities and a remix studio. Its Auto Play also switches channels. These are **author claims**, not verified playback/performance observations. The public page discloses AI assistance and shows no substantive user comments in the fetched page.

The valuable pattern is a coherent visual constraint plus immediate ignition, road motion and occasional place markers. Cruise should retain human radio and listener-controlled tuning. Automatic channel surfing, generated music, one-bit aesthetics and a large remix panel do not fit its stated product. Mobile gestures, FPS, first-frame latency, persistence, monetization and sharing remain unverified. No reusable NIGHTDRIVE license was established. Publicly playable does not grant asset reuse rights. [Embedded public URL](https://html-classic.itch.zone/html/19174150/index.html?v=1788999616) was not fetched by the research browser tool; cache miss is not evidence the game is broken.

A read-only [webXOS repository tree](https://github.com/webxos/webXOS) search for `night|drive` returned `apps/audiodrive.html` and its README, not NIGHTDRIVE. That is a limited path search, not proof that no public source exists elsewhere.

## 2. Slow Roads: the closest product comparison

[Official browser experience](https://slowroads.io/). Its creator's [web.dev engineering case study](https://web.dev/case-studies/slow-roads) explains why its restrained driving premise supports inexpensive rendering: detail concentrates beside the road; future chunks can be scheduled ahead; buffers/objects are reused; physics excludes unnecessary dynamic objects. The author reports deferred scene initialization after a button press and historical average environment generation of 3.2 seconds. That 2023 figure is neither our measurement nor a current-version promise. These techniques are better candidates for Cruise than replacing the renderer.

The creator's [2.0 technical discussion](https://www.reddit.com/r/threejs/comments/1iekc71/slow_roads_20_endless_procedurallygenerated/) identifies tonal/atmospheric upgrades: multicolour altitude fog, tone mapping, simplified distant trees and inexpensive ambient darkening. The creator also describes autodrive as line following, with no trained AI. This supports deliberate atmosphere and a predictable road as budget choices. Thread praise is anecdotal, not a representative usability study.

[Official Web Edition page and public discussion](https://topographinteractive.itch.io/slow-roads) describe free, ad-free browser access, optional paid offline distribution and user-controlled weather, scenery and autodrive. The listed downloadable edition costs $3 or more when inspected; the author distinguishes it from the browser build and says the download lacks touch support. Readers must not transfer that limitation to the live web version. Comments request more environments, weather and photo capture; one controller bug receives an author acknowledgement. That is useful qualitative demand for atmosphere and agency, not proof all players want more features. Future plans and relative-date comments are not release verification.

**Adapt for Cruise:** road-side fidelity, predictable generation budgets, occasional skyline/landmark reveals, a comfortable speed and user-selected moods. Retain direct radio support links as the near-term commercial relationship. Optional supporter products are a later business hypothesis; no paywall or transaction is proposed here. Do not copy proprietary world assets or assume the free site is open source.

## 3. Bruno Simon: interaction confidence and a memorable visual world

[Official portfolio](https://bruno-simon.com/?lang=en) exposes keyboard, touch and gamepad control guidance, quality controls, respawn, achievements and contextual interactions. Its author identifies Three.js/TSL with WebGL/WebGPU and explains that the client works without the private server. The fetched document includes offline-server UI strings; those alone do not prove a live outage. The portfolio also links the creator's teaching business. None of this was timed or tested on physical mobile here.

[Public 2025 source](https://github.com/brunosimon/folio-2025) documents an explicit update order and an asset compression workflow: GPU-friendly texture compression for GLBs/textures and WebP for UI. It preserves originals when producing compressed files. [MIT license](https://github.com/brunosimon/folio-2025/blob/main/license.md) permits software reuse with its notice; assess specific assets and third-party material separately before importing. This research imported nothing.

**Adapt for Cruise:** unmistakable control feedback, one confident visual language, a clear recovery action and a camera that flatters the world. The business is a portfolio, so copying its achievements, physics toys or exploration tasks would add friction to radio listening. Its useful first-minute lesson is clarity and memorable framing, not more game systems.

## 4. Butterchurn: a visual rhythm reference, not a replacement scene

[Public demo](https://butterchurnviz.com/), [author explanation](https://butterchurnviz.com/about) and [MIT source/documentation](https://github.com/jberg/butterchurn). The documented WebGL2 API connects an audio node, selects presets and blends over a chosen duration. Preset rendering is a separate cost and browser support constraint. No real-time performance or mobile run was measured here.

**Adapt for Cruise:** transitions should feel continuous; a small instrument-light envelope can give the music a physical presence. Keep the real audio independent, use analysis only where CORS permits and never fake beat detection. A full-screen preset visualizer would introduce a second demanding renderer and a different art direction. Explicit preset browsing is a possible optional later mode; automatic music taste selection is not. Library licensing does not establish rights to every external preset, audio recording or artwork. No dependency is proposed for this pass.

## First 5 / 15 / 60 seconds: what we actually know

| Experience | First 5 seconds | Around 15 seconds | Around 60 seconds |
| --- | --- | --- | --- |
| NIGHTDRIVE | Author documents one ignition gesture; no timing measured | District/camera/tuning affordances documented; no sequence observed | Endless drive/remix proposition; no retention evidence |
| Slow Roads | Creator documents affirmative start and deferred initialization; current timing unmeasured | Driving/autodrive is the core documented activity | Mood/route exploration is documented; no current-session observation |
| Bruno Simon | Clear drive/interact premise in public document; loading latency unmeasured | Controls/recovery are discoverable in public UI | Optional exploration and achievements exist; no funnel measurement |
| Butterchurn | Audio input and preset must be connected; public demo not executed | Continuous rendered response is the documented mechanism | Preset blending supplies variation; no session study |
| Cruise `6fbffd2` | Existing garage and persistent radio; not time-instrumented in old tests | Audio can start independently of scene readiness; drive still requires an action | Save/favorite/share work, but no old first-minute observation or return study |

This table must not be converted into claims that a competitor loads in five seconds, reaches a particular landmark by fifteen seconds or retains listeners for a minute.

## Cruise baseline: grounded evidence and the gap

Reviewed [Human Radio report](../../human-radio/REPORT.md), [independent review](../../human-radio/REVIEW.md), [browser results](../../human-radio/evidence/results.json), [resilience results](../../human-radio/evidence/resilience-results.json), and the garage/cockpit/mobile captures. Existing evidence supports real Jolt playback, actual NTS outage recovery, persistent presets, metadata fallback, save/export fixtures, controls across scene removal and touch emulation. It does not establish live song identification or physical mobile performance.

The authoritative old sample is approximately 32.17 average rAF FPS over 15 seconds on Intel UHD 630 at 1440x900/DPR1, development server, Auto/high, with other build activity present. That is a useful warning against adding postprocessing indiscriminately, not an isolated benchmark or evidence of current regression. Existing successful builds and audio ownership should stay intact.

The garage capture presents branding, vehicle choice, mood choice, entry and radio controls together. The cockpit capture then layers the permanent player over a physically modeled dashboard. The radio is discoverable, but the composition gives several elements similar prominence. This visual reading is subjective; the next pass should measure actual first-minute behavior.

## Highest-impact first-minute changes within the existing scene

1. **One invitation to begin.** A primary `Start cruising` action should unlock real audio and begin the existing relaxed drive with a sensible preset ride. Keep `Choose your ride` and station choice accessible as secondary actions. Preserve account-free entry, browser gesture requirements and the listener's explicit play/pause state. A restored manual preset can be honored transparently; do not infer taste.
2. **Frame Miami before explaining it.** Choose the best existing camera/road position so the first motion shows the coast, palms or a recognizable neon facade with readable depth. Compose against existing licensed assets. This costs camera/route work, not another world or asset purchase. Never claim a geographically correct landmark from a generic building.
3. **Give the horizon room.** Preserve a compact persistent station/play/volume/tune strip while minimizing duplicate dashboard labels and setup controls once driving starts. Detailed station editorial content belongs behind the existing discovery action. Do not hide volume, station identity, playback failure or credits.
4. **Teach one action at a time.** Briefly show `Tune real radio` and the available camera action after entry. Dismiss guidance on interaction and reduce movement when requested. Keep station changes user-initiated; surprise remains an explicit button, not an automatic effect.
5. **Deliver a quiet visual phrase.** Over the first minute, road curvature, a skyline opening or a restrained lighting transition should provide a beginning/middle/reveal using existing scenery. Leave the 40-minute sunset pace intact. Avoid hard cuts, a compulsory camera tour, advertising takeover or flashing beat response.
6. **Make coming back personal through ownership.** Keep manually ordered presets, finds and share links visible when requested. A small return label such as `Your presets are here` is enough; no streaks, behavior-ranked stations or fabricated social activity. Sharing should preserve the chosen station and scene destination without attaching copyrighted stream audio.

## Acceptance evidence for the next iteration

- Capture cold entry at 5/15/60 seconds with explicit viewport, network/cache state, browser, GPU, DPR and quality. Record time from gesture to advancing real audio and to moving scenery separately; do not call an unready media element playback.
- Show the initial frame and driving frame at desktop, portrait and landscape. Count visible primary actions; verify readable station identity and usable volume without opening a menu.
- Observe 60 seconds of scene motion without user steering, plus pause, manual tuning and camera recovery. Prove the same audio owner survives any intro/scene change.
- Compare sustained performance at equivalent settings against `6fbffd2`. Distinguish rAF rate, frame spikes, audio continuity and memory measures. Keep this reference research out of performance claims.
- Ask a small consenting group what the product is after the first minute, whether they knew how to tune and what made the scene feel like Miami. Treat responses as qualitative evidence, not a statistically established conversion lift.

No application code, external game assets, payments or deployments changed in this research task.
