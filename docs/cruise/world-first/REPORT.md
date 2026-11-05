# World First milestone report

Local experimental work, October11,2026 EDT. **Photographic quality has not passed. The requested finished60-second cockpit film is not delivered.** Original `/cruise` remains unchanged. No deployment, purchase, paid rendering or production data mutation was performed.

Local preview: http://127.0.0.1:3060/cruise/world-test. Enter through the preserved garage, then use the experimental visual-source selector. Availability of a frame or decoded video is separate from acceptance of its visual quality.

| Owner | Files | Status | Evidence | Blockers |
|---|---|---|---|---|
| Lead `/root` | `app/cruise/world-test/`, `components/cruise/world-test/WorldExperience.tsx`, `WorldVisual.tsx` | Isolated shell built and browser verified | Original garage, branding and radio owner retained; independent world controls | Cinematic world art and finished minute remain incomplete |
| A/C `/root/world_art` | `world-art/` | Reference, contract and asset audit complete; initial native art gate failed | Actual founder frames and baseline captures; `EVALUATION.md`, `asset-manifest.json` | Dense inhabited urban carpet, detailed materials and convincing near/middle/far depth missing |
| B `/root/unreal_director` | `unreal/`, local `.vercel/world-first-unreal/` | Native DX11 stills and2-second1080p motion diagnostic produced; art gate failed | Actual60 PNGs,97.48MB;29.125-second queue interval including warm-up | No accepted cockpit, traffic or finished minute; PNG output is not linearEXR mastering |
| D/E `/root/hybrid_playback` | `components/cruise/world-test/hybrid/`, `hybrid/` | Native VP8 delivery and matched candidate pass focused playback checks in3layouts; visual FAIL | Actual2x30-frame1080p clips,2.53MB; camera metadata; five contract checks | Lighting, reflections and pixel registration unverified |
| F `/root/audio_music` | `WorldAmbience.tsx`, `audio/` | Independent generated ambience implemented | Four lifecycle/mix checks; default Off; original radio untouched | Human listening, physical-device audio and remaining station integrations unverified |
| G `/root/qa_security` | `qa/`, `scripts/world-first-{baseline,proof}.mjs` | Local controls pass13checks in each of3layouts; all7fresh live baseline captures pass | Protected-source hashes; actual screenshots and silent recordings | Physical phones, Safari, TVs and human listening unverified |

Agent identities above are actual session agents. A/C and B were configured as `gpt-6-astra`; D/E, F and G as `gpt-6.1-sol`. Four concurrent slots required grouping/sequencing the seven workstreams. The lead is the session Codex model; no hidden backend model identity or unavailable GPU is asserted.

## Architecture and quality decision

Jeep Night is a separate Three.js/R3F project, not a video world or the production baseline. Its custom realtime cabin improves controls and radio presentation, but sparse recycled scenery is not photographic. Original Cruise retains materially stronger asphalt/palm/facade detail in the reviewed baseline. [Inspection](INSPECTION.md) records the actual source and before-construction assessment.

Unreal successfully renders a wider lit skyline on the installed GTX1060Max-Q via DX11/SM5. The first actual frame nevertheless has a flat tower band, black roadway and empty shoulders. Adding near cuboid terraces worsened the vista. Engine choice and object counts do not establish realism. No Lumen, hardware ray tracing or path tracing success is claimed. [Independent art evaluation](world-art/EVALUATION.md) governs the quality verdict.

Hybrid keeps the complete environment plate and overlays the existing browser Jeep at the same source aspect and nominal optical settings; replacement-road geometry is disabled. It requires environment-only media and measured camera metadata. Its lighting, reflections and depth occlusion are unverified; candidate mode explicitly reports that limitation. Founder footage with a baked cabin is played intact as a diagnostic and is never given a second cockpit.

**No winning architecture has passed the photographic gate.** Full-frame authored cinematic video with independent live radio is the preferred next production hypothesis, because it avoids the unresolved realtime cabin/plate seams. This is a recommendation to test, not an evidence-based declaration that Unreal won. Retain the hybrid only if an actual calibrated motion comparison approaches the full-frame result.

The founder suggested [AnyPS5](https://github.com/boykopovar/AnyPS5). Its current README describes PS5 executable porting to Windows/Linux, with a relinker and system-library implementations. It does not supply the authored environment or web playback pipeline needed here. Based on that scope, it does not address the current art/lighting gap and was not installed or integrated.

## Evidence and practical limits

- [Native project, source and render evidence](unreal/README.md).
- [Twelve-criterion comparison and representative screenshots](COMPARISON.md).
- [Independent final browser QA and recordings](qa/FINAL-QA.md): fresh Original/Jeep in all3layouts and actual Miami desktop pass; actual browser renderer is Intel UHD630.
- [Hybrid source, media validation and repro](hybrid/README.md).
- [Audio and station coverage](audio/README.md): existing metadata only; no invented live track identification. The12-station target remains a backlog rather than a fabricated completed catalog.
- [Asset/license manifest](world-art/asset-manifest.json): existing cleared asphalt and engine primitives; no ripped assets or purchases. Unresolved inherited assets and reference reuse rights are recorded.
- [Continuity and production implications](CONTINUITY-AND-PRODUCTION.md): actual diagnostic sizes, frame counts, extension constraints and future sunset/ad design.

Nine targeted contract/audio checks pass. These cover lens/coordinate conversion, source qualification, timeline ordering and lifecycle silence; they do not certify photographic quality. Physical phones, Safari, television playback and human mix approval remain unverified.

TypeScript passes after the final player cleanup. [Local radio proof](qa/local/2026-10-12T03-22-22-408Z/results.json) reports13checks true for each requested viewport: preserved sources, no overflow/errors, muted world video, station changes without video restart, radio pause with continuing world, world pause with continuing radio, ambience toggle without radio changes, four presets and both volume controls. Reference ambience deliberately stays silent; this verifies state isolation rather than an audible mix. The Original foundation has no adjustable DSP equalizer, so none is claimed as completed.

Selective staging was reviewed against the experiment's explicit path list. All42staged Unreal source files match their captured byte lengths and SHA256 inventory; the scoped Git attributes retain those bytes across line-ending settings. Original protected hashes still match. No unrelated work is included in the local commit.

[Native/hybrid playback evidence](hybrid/NATIVE-PLAYBACK.md) records the focused comparison and cleanup checks. These are desktop Edge runs; portrait and landscape are viewport emulation.

| Viewport | Native handoff | Hybrid handoff | Reference handoff |
|---|---:|---:|---:|
|1440x900|27.9ms|40.6ms|29.8ms|
|390x844|36.9ms|31.7ms|25.9ms|
|844x390|28.0ms|31.8ms|37.9ms|

Native/hybrid runs reported one dropped video frame each in the two-second comparison. Handoff timings measure decoder preparation, not spatial continuity or a certified long-session frame rate. Source splitting proves adjacent frames in an existing continuous shot; independent authored scenes and branching remain unproven.

Browser testing exposed two experimental garage-disposal bugs: an inherited vehicle-loading timeout survived departure, and intentional R3F context disposal triggered an old failure listener. The isolated wrapper now gates those callbacks to the live garage. Original code was preserved. The player also captures owned video elements for cleanup, so detached decoders are paused and their sources cleared after React removes DOM refs. Final captures include these corrections.

The previously exposed Supabase service-role key's revocation remains unverified and is a release blocker. The Avenue remains hidden; no live Stripe or Supabase data was touched. Unrelated unfinished working-tree changes are preserved.

Highest-priority next action: build the [connected200m neighborhood slice](world-art/production-neighborhood-spec.md) with textured licensed facades, terrain, palms and selective local shadows, using the revised camera contract. The final vista has a broader light carpet but its road remains detached from the middle ground. Establish one accepted frame, then prove short motion and a matching cabin, followed by the requested60-second sequence. Do not scale a failed frame into40minutes.
