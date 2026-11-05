# World First audio review

Owner: `/root/audio_music`, configured model `gpt-6.1-sol`. Review performed October 11, 2026 (America/New_York). Bounded isolated route work; production audio, stream registry and `useCruiseAudio` were not edited.

Status: **WRAPPER IMPLEMENTED / CPU VERIFIED / BROWSER AND HUMAN AUDITION PENDING**. The founding 32.70-second reference has no audio. These sounds are an authored audition, with no claimed reference sound characteristics or realism pass.

## Mix and controls

`components/cruise/world-test/WorldAmbience.tsx` reuses the existing separate `NightAmbience` graph: filtered generated wind/road noise, two restrained sine engine harmonics, and no sampled recordings. World Test supplies no traffic cars, so the traffic channel stays silent; no phantom passing vehicle is invented. No network sound, microphone, radio capture, music analyser connection or new asset is introduced.

Ambience defaults **Off**. Enabling creates/resumes the graph in the button gesture. The independent level starts at 0.12, with slider maximum 0.4. Existing cockpit attenuation makes the target master 0.0216 at the initial level and 0.072 at maximum, before layer weights. These are digital gain settings, not measured loudness or a demonstrated ratio to the radio. Music remains the primary listening source by design; vocals/quiet-passage listening approval remains pending.

The wrapper now requests the graph's existing smooth fade immediately on world status changes, radio loading, radio pause/mute/zero volume, document visibility changes and Off. The graph uses an 80 ms exponential time constant, reaches exact zero and suspends after 400 ms. The parameter poll remains 200 ms; state transitions no longer wait for it. Radio `playing` alone was insufficient: its existing `waiting` handler can leave `playing:true` while `loading:true`, so this wrapper reads the existing cockpit context's loading and volume fields. It never controls radio playback.

Gesture completion has a revision guard for rapid toggling and unmount. Reported unlock faults return the control to Off. Teardown removes the poll, visibility/preference listeners and diagnostic dataset, then stops/disconnects all generated sources and closes the independent context. No context or node is constructed before enabling.

`authoredMotion()` integrates the scene-contract speed phases rather than substituting `12*time`. Stations at 10/40/50/60 seconds are 110/470/600/720 m. Speed is authored longitudinal station speed, not sampled physics. Time is clamped to the 60-second contract. Reference diagnostics and non-environment sources remain silent. Future footage with another motion contract must provide matching motion before this sampler is reused.

## Existing station and metadata coverage

This is verification of current local code and recorded evidence, **not fresh station playback, live metadata, permission or website validation**. Authoritative code: `lib/cruise/stations.ts` and `components/cruise/audio/useCruiseAudio.ts`. Previous direct-stream/browser evidence: [experimental radio report](../../feedback/RADIO.md). The twelve-target backlog is recorded in [cinema playback plan](../../cinema/PLAYBACK.md).

The actual World Test shell calls the default `useCruiseAudio()` catalog: **four playable entries**, plus external-only Poolsuite. The separate Miami catalog contains **eight playable entries**, plus Poolsuite. It is not currently passed into World Test. The twelve requested playable targets are those eight plus the four absent candidates below; Poolsuite is an additional external listening option.

| Target | Code coverage | Existing official listening link | Track metadata coverage |
|---|---|---|---|
| Buena Onda Radio | Default and Miami; owned playlist API | No external URL in registry; internal `/api/radio/tracks` | API track title/artist supported; library contents not fetched in this review |
| Jolt Radio | Default and Miami; enabled stream | [Jolt](https://www.joltradio.org/) | Station label only |
| NTS 1 | Default and Miami; enabled stream | [NTS radio](https://www.nts.live/radio) | Station label only |
| NTS 2 | Default and Miami; enabled stream | [NTS radio](https://www.nts.live/radio) | Station label only |
| Rinse France | Miami only; public stream | [Rinse France](https://www.rinse.fm/channels/france) | Station label only |
| The Lot Radio | Miami only; public HLS | [The Lot](https://www.thelotradio.com/) | Station label only |
| Kiosk Radio | Miami only; public HLS | [Kiosk](https://www.kioskradio.com/) | Station label only |
| dublab | Miami only; public stream | [dublab](https://www.dublab.com/) | Station label only |
| Depa.Radio | Absent | No verified registry link | None |
| Sucker Free Radio | Absent | No verified registry link | None |
| WDNA | Absent | No verified registry link | None |
| Radio FG | Absent | No verified registry link | None |
| Poolsuite (additional option) | Disabled external-only entry in both catalogs | [Poolsuite](https://poolsuite.net/) | No integrated metadata |

The registry therefore contains official link fields for all seven enabled external stations and Poolsuite. It lacks entries and verified link fields for the four backlog candidates. Existing code constructs an external stream track from station name with an empty artist; `trackTitle` is not live song discovery. No current artist/title API, recognition or now-playing service is integrated for external stations. Spectrum analysis does not establish song metadata. Do not present these labels as identified songs, or save/share inferred artists. No additional streams or metadata service are required for this world proof.

## Verification and remaining gates

Command: `node --import tsx --test docs/cruise/world-first/audio/verification.test.ts tests/nightdrive-audio.test.ts` — **4 passed, 0 failed**, duration 3.735 seconds.

- The audio sampler agrees with the authoritative scene phases at 241 quarter-second samples, reaches 720 m, and safely bounds negative/nonfinite/overrun time.
- A mocked Web Audio lifecycle verifies one graph across repeated unlock, silence gates, exact zero/suspension after Off, full disconnect/close and repeated disposal. This is a CPU lifecycle test, not real browser policy or audio-device evidence.
- Existing tests cover pre-gesture node absence, gain bounds, cockpit attenuation and traffic/reduced-motion behavior.

No browser or recording was launched while native Unreal was cold-building shaders. No third-party radio was recorded. Real browser gesture failure, rapid-toggle/unmount behavior, hidden-tab suspension, sustained resource use, physical phones/TV casting and human listening comparison remain pending. The wrapper error path and event listeners have static review only; the class mock does not prove React lifecycle behavior. Full repository typecheck is owned by lead integration.

For browser QA, inspect `document.documentElement.dataset.worldAmbience`: default Off must show `state:"locked"`, `nodeCount:0`; enabled authored playback with audible radio has a positive target; any silence gate has target zero and then a suspended context; unmount deletes the dataset. Check radio element identity and playback independently. Unavailable rendered footage and reference diagnostic footage cannot supply the positive authored-driving case.
