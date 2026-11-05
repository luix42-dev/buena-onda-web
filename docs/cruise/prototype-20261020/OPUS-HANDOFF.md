# Buena Onda Cruise — handoff to Opus

Prepared 21 October 2026. This is a continuation brief, not permission to deploy, purchase services or restart broad development without inspecting the current state.

## 1. What we want to achieve

**Buena Onda Cruise is a cinematic human-curated radio experience inside a beautiful Miami drive.**

**No Algorithms. Just Frequencies.**  
**Take the long way to good music.**

The intended journey is: **open → Play → automatically cruise and hear real radio → optionally continue on a TV → settle in.** The world attracts people; music, atmosphere and discovery give them reasons to stay and return. It must feel like a place, rather than a racing game, cluttered dashboard or rendering demo.

The phone must remain a complete listening product without a TV. Desktop must work independently. TV is the desired immersive format, with calm landscape composition and controls that recede. Automatic driving is the default; do not add mandatory steering, missions or accounts.

### The experience we are aiming for

- One effortless Play action, starting inside a convincing cockpit. Optional ride selection remains available without blocking entry.
- A memorable, developed Miami night stretch: Art Deco hotels, palms, storefronts, believable scale, reflective materials, depth and restrained cyan/red lighting. The identity is Buena Onda's “80s modern,” not neon overload.
- Enough route continuity and variation for a 15–20-minute listening session without an obvious short loop. Preserve the expansive world rather than replacing it with a tiny showcase.
- Night and Sunset, retaining the intended 30–45-minute transition where feasible.
- A tangible, readable radio; three dependable initial stations while retaining the broader catalog, My Finds, favorites, Surprise Me, sharing and listening without 3D.
- Accurate official metadata only. Unknown songs remain “Track information unavailable.” No personalized music recommendations or taste-based advertising.
- In-world advertising that belongs in the city: billboards, record shops, motel marquees and storefronts. Optional business inspection must not interrupt the music or cover the TV drive.

The user's recurring concerns are important: entry became confusing, Play once required browser zoom-out, the Lamborghini camera was too low, cockpit/car motion felt like a box floating above the road, tires looked transparent, and some newer experiments lost the original world's sense of scale. Recent work addresses parts of these problems, not the entire visual ambition.

## 2. Start here: actual current baseline

| Item | Current state |
| --- | --- |
| Web repository | `D:\10-VENTURES\12-buena-onda\cruise-os-20261015` |
| Branch | `experiment/cruise-cockpit-feel-20261020` |
| Implementation commit | `a51b5cb` — Add isolated Cruise prototype with cockpit feel and demo businesses |
| Current review route | **http://127.0.0.1:3097/cruise/prototype** |
| Final production-build directory | `.next-cruise-prototype-final-build` |
| Preserved long-trial build | `.next-cruise-prototype-build` |
| Previous Miami visual preview | `http://127.0.0.1:3096/cruise/os?visual=rooms` — availability must be rechecked |
| Original public reference | https://www.buenaondalifestyle.com/cruise |

Port 3097 accepted a local connection when this handoff was prepared. That does not establish phone, internet or television access. Press **Play** on the prototype. Default is Countach, Night, cockpit and automatic cruising.

Read `AGENTS.md`, inspect status/history, and open the actual route before editing. This handoff is a snapshot, not a substitute for inspection. The current web prototype is the authoritative reviewable product baseline; the native project is a separate foundation experiment, not feature parity.

Restart the existing final build if necessary:

```powershell
cd D:\10-VENTURES\12-buena-onda\cruise-os-20261015
$env:CRUISE_DIST_DIR='.next-cruise-prototype-final-build'
node node_modules/next/dist/bin/next start --hostname 0.0.0.0 --port 3097
```

If source changes require rebuilding, run `npm run build` with the same `CRUISE_DIST_DIR`. Do not overwrite frozen comparison bundles. The configuration reads **CRUISE_DIST_DIR**, not NEXT_DIST_DIR.

## 3. What we already had and preserved

- Next 14.2.15, React 18, Three.js 0.170, R3F 8 and Drei 9. No framework or engine migration was performed.
- An OSM-derived Miami route of **19,642.96 m**, with chunked scenery and roughly 5 km world extent. This is not a claim that every block is finished or unique.
- Existing vehicles/cameras, radio/audio owner, Human Radio station adapters, metadata provenance, local My Finds and station presets, discovery controls, postcards and settings.
- Existing campaign/placement systems and geometric ad measurement. The Avenue's numbered inventory, business cards and claim/buyout direction remain separate and preserved.
- Sunset timing defaults to 2,400 seconds. A full physical 40-minute sunset validation has not been performed.
- Original `/cruise`, `/cruise/os`, `/cruise/human-radio`, `/cruise/experience` and historical experiment bundles.

The Countach GLB is about 16.24 MB and retains source CC BY 4.0 attribution to Randomness / Sketchfab. Preserve attribution and verify actual asset terms before commercial launch; this is not blanket trademark or commercial clearance.

## 4. What the latest prototype actually adds

Changes are scoped through the new route and optional prototype/feel flags; legacy defaults remain available.

| Area | Implemented | Important limit |
| --- | --- | --- |
| Entry | One Play action, optional collapsed ride/lighting settings, cockpit/autodrive default | No real-user first-minute study yet |
| Cockpit | Steering geometry pivot, route-based wheel steering/rolling, small heave/pitch/roll, partial camera motion | Kinematic spring-damper presentation over an authored road profile, **not a full tire/contact physics simulator** |
| Tires | Opaque clone-owned materials and subtle contact decal | No replacement high-detail vehicle or new hands |
| Radio | Existing audio owner retained through camera, quality and 3D changes; prototype shares return to prototype | Broad station lineup is not fully reliability-tested or commercially cleared |
| Interface | Duplicate site navigation/global player removed; contextual guidance fades; secondary features retained | Physical phone and TV usability remain unverified |
| Advertising | Existing house/demo surfaces enabled immediately, directory/cards, local observation export | Demo observations are not production impressions or attributed conversions |
| TV | Mirroring instructions, optional presentation mode, six-second idle controls; `?tv=1` | No receiver, device picker, pairing, phone remote or demonstrated hardware handoff |

No Gran Turismo physics repository was imported. The implementation uses original small vehicle-presentation math, conceptually informed by the public cannon-es vehicle implementation, without introducing that dependency.

## 5. Evidence: what was tested and what was not

The strongest available evidence is the actual moving browser trial:

- **1,203.112 seconds**, 240 samples, **17.24094 km traveled**. This is not a complete 19.64 km route loop.
- Windows headless Edge 155.0.4283.62; Dell G7 7588, i7-8750H, 16 GB RAM, installed Intel UHD 630 and GTX 1060 Max-Q 6 GB.
- Viewport **1280×720**, device DPR 1; Auto quality adapted renderer DPR between **0.85 and 1.0**.
- Mean sampled one-second FPS **49.20**; p5 **43.89**; range **37.14–59.10**. This is not locked 60 FPS or GPU frame-time percentiles.
- Draw calls **159–300**; maximum sampled JS heap **227.9 MiB**, not GPU memory.
- Navigation-to-ready **15.188 seconds**, not time to first audible music.
- Jolt media time progressed throughout the saved samples; zero sampled non-advancing intervals and zero page exceptions. This proves decoded playback progression, not speaker audibility or absence of gaps shorter than the sample interval.

A separate capture identifies Intel UHD 630 / ANGLE D3D11 as its WebGL renderer. The selected GPU was not directly recorded for the long trial; do not infer it solely from installed hardware. Unreal was closed during performance testing.

The long-trial bundle and final bundle are separate. Final follow-up changes corrected the generic share destination and auto-hid the guide; separate smoke tests cover those changes. Do not describe the final bundle as independently subjected to another 20-minute trial.

Other verified behavior:

- Jolt, NTS 1 and dublab each decoded after deliberate selection; Jolt ran through the long trial.
- Media clock progressed through camera/quality changes and disabling/re-enabling 3D.
- Controlled stream/metadata failure displayed fallback/error behavior; switching back to Jolt recovered.
- Favorite persisted after reload. No fabricated track or DJ names were introduced.
- Build completed with existing configuration/lint warnings; focused tests, final smoke 5/5 and controlled recovery 5/5 passed. See logs for exact test groups rather than assuming all repository tests were run.
- Clipboard share fallback was tested; native OS share sheet was not.

Not validated: physical phone background/lock behavior, actual phone-to-TV scene plus radio audio, TV reconnection, physical mobile performance, native moving-session performance, actual listener retention, commercial permissions or advertiser willingness to pay.

### Open these proof artifacts

- [Current report and opening instructions](README.md)
- [Performance report](PERFORMANCE.md), [sample data](performance.json)
- [18-second actual interactive browser capture](capture/cruise-drive-18s.webm) — no broadcast audio; staged route position, not the long trial
- [Visual comparison](COMPARE.html)
- [Current cockpit](capture/prototype-matching-cockpit.png), [previous cockpit](capture/before-matching-cockpit.png) — matching selected route/night/camera, minor pose differences
- [World advertisement](capture/qualified-world-ad.png), [business card](capture/business-card.png)
- [Final smoke](final-smoke.json), [recovery tests](recovery/results.json)
- [Exact changed-file manifest](FILES.md), [planned user/advertiser test](PLAYTEST.md)

## 6. Advertising: preserve the commercial direction honestly

House/demo examples include Buena Onda, Branches Vintage House, Tideway Motel, Vice Nights, Onda Tropical and Natsu Service. Existing inventory and the proposed **1.5× buyout** direction are preserved; no real payment or property transfer was enabled.

The prototype keeps opportunities-to-see separate from deliberate business activation. Export is explicitly DEMO/TEST, bounded to the latest 100 local events, without listener taste identifiers. The captured Onda Tropical opportunity and Branches directory activation are different campaigns and **are not an attributed conversion**.

Current approximate qualification contract:

- Sampling around 250 ms; full frame, facing > 0.35, viewport area ≥ 0.003, sampled occlusion ≤ 0.2.
- Internal “readable” heuristic: facing ≥ 0.55, sampled occlusion 0, billboard ≥ 150×62 CSS pixels (other signs ≥ 140×58), sustained two seconds.
- Hidden document, radio/modal focus and invalid viewing state interrupt qualification. Continuous qualifying periods are deduplicated; activations have a 600 ms guard.

These are geometric heuristics, **not proven attention, unique reach or billable impressions**. Independent review found a thin pole crossing a sign despite sampled occlusion zero; small supporting copy was not readable. Profile the measurement pipeline before scaling: one warm-up capture reached 215.5 ms, despite much lower later samples. Do not present average FPS as proof of no stutters.

## 7. Unreal: what exists, what Epic's tools did, and the blocker

Project:
`D:\10-VENTURES\12-buena-onda\cruise-publish-20261006\.vercel\cinema-probe\CinemaProbe.uproject`

Engine:
`D:\10-VENTURES\12-buena-onda\UE_5.8` — actual **5.8.3, CL 58210709**.

This is a native waterfront foundation: low-poly daytime Kenney CC0 environment, 28 buildings/48 palms, existing native vehicle/cockpit/radio scripts. Its scripted circular cruise is roughly **77 seconds**, not the web route or a varied 20-minute native world. Chaos is disabled in that script. DX11/SM5, original 30 FPS cap, no Lumen/Nanite/ray tracing and SSR disabled are configuration facts, not measured native performance.

Official Epic plugin documentation and relevant engine skills were read. Installed engine ModelContextProtocol and AllToolsets components were verified. After backup, AllToolsets was enabled for the correct project. Genuine live MCP calls inspected actors/assets and agent skills, duplicated, explicitly saved and loaded a review map, and captured a real rendered viewport. Map check reported zero errors/warnings.

- Preserved original: `/Game/CruiseWorld/Lvl_BuenaOndaWaterfront`.
- Saved isolated copy: `/Game/BuenaOndaPrototype20261020/Lvl_WaterfrontReview`.
- Recovery directory: `...\cinema-probe\recovery\prototype-20261020-231440`.
- Original map SHA256 remained `DA6586C477F9BBF9918D7896781C14A9717E8A6E63E7123A93F13B8CCBCB1CB0`.
- [Actual native baseline](unreal-baseline.png): 755×467 daytime viewport, not a cinematic night upgrade or moving-session proof.

**No upgraded native night street, facade, billboard or material was delivered.** A rendered restart approached system commit exhaustion: about 94 MB commit headroom remained. The owned editor was stopped before further mutation. This is a blocker in that machine/session state, not proof that Unreal is universally impossible on the laptop.

The editor endpoint was local `http://127.0.0.1:8000/mcp`; it is not expected to be online after that stop. Project-local generated Codex configuration preserves that URL. A fresh editor startup must be followed by a successful live read; a proxy or cached catalog is insufficient.

**Critical next-owner traps:**

1. Native Python guards test for `'BuenaOndaWaterfront'` in the world path. The review-copy name does not contain it. Inspect and deliberately accommodate these guards before expecting automatic driving/presentation on a duplicate.
2. `drive_presentation.py` defaults to `self.set_night(False)`. Editor night lighting alone will not prove runtime Night.
3. Existing launcher is NoSound; successful baseline was not native driving/audio validation.
4. Save explicit assets before closing/switching. Do not bulk-save unrelated content or export UE-only assets into the browser.
5. `scripts/start-native-prototype.ps1` now guards available physical/commit memory; `scripts/native-mcp-probe.mjs` was syntax-checked, not run successfully after the blocked restart.

Use one live-editor integration owner. Serialize native edits and heavy browser performance/build work. For Claude Code, consult the current official setup before installation; installing a client plugin does not supply missing engine components.

## 8. REA, Ghidra and reference limitations

Resources requested:

- https://github.com/EpicGames/unreal-engine-skills-for-claude-code-plugin
- https://github.com/morluto/rea
- https://github.com/NationalSecurityAgency/ghidra

REA installation/workflow documentation was read. Setup dry-run failed with npm ENOTCACHED under restricted networking. The elevated retrieval retry was **aborted by the user**, not an automatic approval rejection. No working REA/Ghidra installation or executable analysis was established. Do not silently bypass that aborted retrieval or claim reverse-engineering results.

Direct source inspection of our existing audio hook answered the immediate lifecycle question: audio ownership is separate from camera state and stale play rejections are revision-guarded. Browser tests supplied runtime evidence. This was **source analysis, not REA execution**. See [REA readiness](REA-READINESS.md) and `rea/ATTEMPTS.md`.

The requested `retrovideonet.mp4` was not found in the inspected locations. Four supplied YouTube references were inspected as metadata only, not watched footage. No rendering method, frame rate or Gaussian-splat claim was established from them. No scene-matched multiview capture/splat asset is available for a valid comparison. No Higgsfield/Seedance generation occurred in this milestone.

## 9. Code map for the next owner

| Concern | Start with |
| --- | --- |
| Route and entry | `app/(site)/cruise/prototype/`, `components/experience/PrototypeOpening.tsx` |
| Main scene/audio integration | `components/real-miami/jeep/JeepNight.tsx` |
| Existing audio owner, reused unchanged | `components/real-miami/audio/useCruiseAudio.ts` |
| Cockpit motion and geometry | `lib/cruise-os/vehicle-feel.ts`, `components/real-miami/vehicle/countachSteering.ts`, `Countach.tsx`, `rollingWheels.tsx` |
| UI and discovery | `components/cruise-os/CruiseOS.tsx`, `components/human-radio/DiscoveryConsole.tsx` |
| TV presentation/help | `components/experience/PrototypeTV.tsx` |
| Demo business integration | `components/experience/PrototypeBusinessBridge.tsx`, `prototype-business.ts`, `components/real-miami/CampaignBridge.tsx` |
| Existing ads | `components/real-miami/miami/MiamiAds.tsx`, `lib/real-miami/advertising.ts`, `lib/cruise/campaigns.ts` |
| Tests/evidence | `tests/cruise/vehicle-feel.test.ts`, `tests/cruise/countach-steering.test.ts`, `tests/prototype-business.test.ts`, this documentation directory |

The exact implementation file list is in [FILES.md](FILES.md). Native asset/config changes are outside the web repository and are documented separately there; the web commit alone does not back them all up.

## 10. Recommended next assignment to Opus

Do not begin with another broad rebuild. Inspect this baseline and the proof, then choose one bounded improvement with a measurable before/after.

1. **Protect the baseline.** Read AGENTS/status/history; preserve unrelated changes and frozen bundles. Work on an isolated continuation branch. Confirm which preview is actually running.
2. **Validate the intended use.** Run real phone playback/orientation/background tests and one supported phone-to-TV mirroring path with actual scene and radio audio. Without hardware, provide the reproducible test and mark it unverified. Mirroring does not add rendering power; a cast receiver, remote rendering and on-device 3D are different architectures.
3. **Remove measurable friction.** Profile initial readiness and ad-measurement spikes; improve thin-occluder handling and large-screen sign readability without resetting audio. Keep the user able to reach Play at normal browser zoom.
4. **Prove one visual improvement.** If continuing Unreal, first restore safe authoring memory, verify the correct project/live MCP read, resolve copied-map guards, then improve one building and one short night stretch. Match camera/time/position and measure runtime. Do not confuse a saved daytime duplicate with completion of this work.
5. **Test whether people want the experience.** Use the prepared 8–12-person listener/business protocol when authorized. Assess unaided start, voluntary listening, return intent/behavior, TV friction and advertiser comprehension. Automated playback is not retention evidence.

The latest brief preserves Unreal as a high-quality direction while reusing the working web product. Earlier requests favored Three.js accessibility. **Do not silently force either engine decision.** Compare the same scoped visual target with actual loading, hardware and delivery constraints. Remote Unreal rendering needs GPU hosting and measured network behavior; it is not automatically free or phone-accessible. Keep the working browser experience while gathering evidence.

Current recommendation: **limited browser review/playtest**, not a finished cinematic Unreal experience, TV-ready product or commercial launch. Prioritize phone/TV evidence, loading/frame stability and advertiser validation before world expansion, multiplayer, splats or a remote GPU service.

## 11. Non-negotiable boundaries

- Preserve radio/discovery/listening-only mode, cameras, legacy routes, advertising infrastructure and working experiments. No unrelated refactor or new engine/framework by default.
- No public deployment, asset purchase, paid API/cloud service, live commerce, property transfer or outside outreach without authorization. Earlier paid-generation conversations are not blanket permission for new charges.
- Keep keys out of source and logs. Do not inspect or reproduce credential contents in a handoff.
- Delegate bounded independent tasks only when authorized; keep one integration owner for shared systems and the live editor. Record actual tools/models, not assumed participation.
- Do not fabricate tracks, station permissions, listener counts, usability results, hardware tests, FPS or licensing clearance.
- Preserve attribution. Review station playback/embedding and asset rights before commercial launch.
- Deliver a reviewable change with exact opening instructions, changed files/assets, screenshots/capture, measurements and honest limitations. An attractive prerecorded reference is not proof of interactive rendering.

**The next milestone is not “more features.” It is a drive people want to return to, with effortless music, a convincing cockpit and world, and advertising that fits naturally.**
