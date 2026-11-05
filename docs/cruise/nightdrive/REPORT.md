# Project Nightdrive — isolated experience lab

Base `6a5c366`, branch `experiment/cruise-miami-master`, October10,2026. Local-only route `/cruise/miami-test/nightdrive`. Original `/cruise` and existing Miami Test are unchanged. No deployment,push,production writes,paid assets or new dependencies. Supabase key-retirement gate remains unresolved.

**Final measurements and verdict:** [RESULTS.md](RESULTS.md). The initial milestones and pending notes below are retained as development history; the final record supersedes them.

## Scope and decision

The founder's Nightdrive brief authorizes this new prototype and supersedes the earlier stop for this bounded direction. It does not authorize migration of the main scene or deployment. Build a working comparison first, then request founder judgment about driving and sound.

Use one deterministic road sampler plus a fixed pool of13 chunks,96m each. Keep four behind/eight ahead; fog ends at340m. Geometry,hero,traffic and camera agree on the same continuous road. Logical distance never resets; chunk-local coordinates are translated relative to the current sampled origin. The two curated vocabularies are coastal boulevard and neon quarter, with192m transitions. This combines streaming approach A with authored art direction from approach B. It is deliberately not a general open-world city or runtime WFC solver.

[Architecture comparison and primary sources](WORLD-RESEARCH.md), [dynamics and actual founder reference](DYNAMICS-CAMERA.md), [audio design and source/licensing review](AUDIO-RESEARCH.md).

## Implemented

- Fixed geometry/instance capacities, deterministic curves/elevation, continuous road/texture coordinates, gentle grade and seed-dependent buildings. Owned instance buffers/materials/textures explicitly disposed. Existing cached GLTF/texture assets remain shared.
- Three driving moods with bounded acceleration,braking and jerk,curvature limit and a guarded five-second lane transition. Two existing classic traffic assets; no new pedestrians or collision gameplay. Traffic recycles only far behind to beyond fog ahead.
- Existing cockpit/radio and six camera modes,plus an LA rear view informed by actual local founder frames. Director uses longer district-sensitive sequences and waits through maneuvers. Reduced motion disables new overtakes and Director cuts.
- Procedural wind,road,quiet engine harmonics and passing-traffic pan in a separate WebAudio graph. Start gesture required; independent Off/level control; radio Pause/Mute and hidden tabs silence it. It never enters the music analyser or records radio.
- Existing eight-station experimental catalog preserved; Jolt is the lab default. Twelve-station roadmap remains,with remaining candidates not claimed implemented. Mirroring guidance is available; separate remote mode remains in existing Miami,not the lab.
- Avenue has no commercial UI or claim/analytics writes in this isolated lab. Existing Miami analytics/authorization remain unchanged; lab miles are not advertising impressions.

## Initial failures and bounded corrections

Initial browser run passed17 functional checks and showed an actual overtake beyond630m,without a backward reset. Independent pixel review nevertheless found it **visually worse than Miami**: repetitive building slabs,huge luminous bands,hard circular pools and a very small LA-view hero. Radio framing stayed intact in all three viewports.

The bounded correction splits/dims windows,adds sparse muted neon trims,uses the existing licensed asphalt texture and a shared soft-alpha pool texture,and moves only the LA camera closer. Portrait dock was reduced from three rows to two. These changes require final pixel verification; a code change is not proof of improved experience.

Own-generated audio capture measured44.81s,mean-53.4dBFS,max-39.4dBFS using installed CapCut FFmpeg. The master cap was raised0.08→0.25,approximately+9.9dB at equal settings. No radio loudness was measured or recorded; no human listening verdict is claimed. Pure sine/noise layers remain an audition draft,not a verified realistic engine recording.

Initial evidence: [functional JSON](initial/results.json), [recording](initial/recording.webm), [generated ambience only](initial/generated-ambience-only.webm), [initial LA view](initial/desktop-la.png). Its45-second performance sample was video-recorded and mixed-camera; it is not the final benchmark.

## Research and licenses

No reference application code was copied. Marian WFC's MIT license was verified; Slow Roads' site is restrictive; no reuse grant was verified for Turbo Racer,StarKnightt/nightdrive or San Verde. Those informed concepts only. Existing RX-7 remains the documented CC BY3.0 adaptation; traffic/asphalt retain existing provenance. Freesound452756 listsCC0 but requires login to download; it was neither downloaded nor auditioned. All new ambience is authored synthesis.

Founder `cli-1.mp4` frames at2/8/14s were actually inspected. The additional YouTube video `ulQYuZxOIFs` is **UNREVIEWED** after failed access; source footage or screenshots are needed for specific analysis. No observations are attributed to it.

## Verification states

**Planned:** fuller districts,landmarks,expressway merges,tunnels,authored signature segments and any main-scene migration. The current two palettes will still repeat stylistically.

**Implemented:** bounded streaming,dynamics,cameras and ambiance described above. The inherited car cabin/body mismatch remains; this pass does not finish that vehicle workstream.

**Independently reviewed:** actual founder frames; initial six lab screenshots; source licensing; audio ownership; installed Three instance-buffer disposal behavior. Final browser and endurance results are appended after measurement. CPU30-minute simulations are explicitly distinct from real-time browser soaks.

## Milestone ledger

| Owner | Files | Status | Evidence | Blockers |
|---|---|---|---|---|
| `/root` lead | NightLab,state,CSS,child route,proof script,report | Integrated local lab | Production build,initial17checks | Final pixels/performance/endurance pending |
| `/root/ux_music` | road,NightWorld,road tests,WORLD-RESEARCH | Built; road tests3/3 | Determinism,derivatives,seams; primary sources | Artistic variety; browser streaming evidence |
| `/root/performance` | dynamics,NightDrive,tests,DYNAMICS-CAMERA,reference frames | Built;11CPUtests pass | Nine simulated30min mood/seed/rate cases; pixel review | Actual driving sensation/final camera judgment |
| `/root/qa_security` | NightAmbience,audio tests,AUDIO-RESEARCH | Built;2targeted tests pass | Unlock/silence/gain design; graph audit | Founder listening; physical audio/casting |

Actual agent IDs above,all inherited session models; exact runtime model variants unavailable. No invented model identity or physical-device participation. Four available agent slots covered the six requested disciplines through combined workstreams.

## Release and approval gates

No main-scene migration until this prototype clearly improves the experience and Luis reviews the evidence. Physical phones,Chromecast,AirPlay and TV browser remain **BLOCKED — PHYSICAL DEVICE REQUIRED**. StripeTEST remains blocked on an isolated environment. Key retirement confirmation and explicit deployment authorization remain mandatory before production work.
