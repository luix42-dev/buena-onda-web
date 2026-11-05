# Nightdrive final measurements

**KEEP IMPROVING. Do not migrate the lab into Miami yet.** Continuous travel and passing work, but the simpler scenery remains visibly weaker. This final record supersedes pending notes in the initial report. Preview: http://127.0.0.1:3041/cruise/miami-test/nightdrive . No push, deployment or production writes.

## Integration and recovery

Independent integration review found corrupted button labels and keyboard access behind Start. Both fixed: readable labels, inert scene/controls until Start, and a browser keyboard assertion. Final isolated production build completed with explicit `NEXT_PROCESS_EXIT=0`: [build log](build-final.log), including type/lint validation. Existing warnings and expected dummy-service failures remain. Full suite **81/81 passed**: [test log](tests-final.log).

[Functional inspection](verified/results.json) passed **18/18**: Start keyboard isolation, Jolt live analysis, ambiance Off/resume, radio pause, three viewports, retained radio, Cast retaining the page, reduced-motion camera hold. This inspection precedes only the passing-recovery logic fix; corrected journey and endurance exercise that final build.

[Final controls check](controls/results.json) passed **16/16** on the final build: all three mood selections, side/crane/low/hood cameras retaining radio, Rinse France then Jolt actually playing, unchanged Canvas and forward distance during station switching, zero/restored ambiance gain and hidden metrics. Hood/low images were inspected; the inherited car fit and crude lighting remain evident. This confirms operation, not a convincing all-angle exterior.

The first five-minute lab run found a following deadlock: after a blocked passing opportunity the hero matched a 9 m/s leader and could never satisfy the positive-closing-speed trigger. [Pre-fix evidence](comparison-lab/results.json) retained. The corrected trigger lets an established moving follower pass once the adjacent lane clears; departure and spacing protections remain. A regression covers blocked lane, clearance, completed pass and safe spacing. Dynamics now has **12 passing CPU tests**.

The [corrected five-minute run](comparison-lab-recovery/results.json) completed **two overtakes**. Its [end snapshot](comparison-lab-recovery/at-300s.json) records **4,462 m by odometer** (road parameter 4,449 m) and **30.9 m minimum sampled same-lane longitudinal gap**. This gap excludes adjacent-lane traffic and is not all-vehicle Euclidean separation. No backward reset, page error or WebGL context loss. Radio was playing at every 30-second sample, not an all-frame or human-audible continuity assertion. This constrained two-car model is not a general collision-proof traffic system.

## Comparison and visual evidence

| Evidence | Links | Finding |
|---|---|---|
| Existing Miami | [five-minute video](comparison-miami/recording.webm), [night chase](comparison-miami/at-30s.png), [data](comparison-miami/results.json) | Richer architecture, palms and ocean; forced reset/camera cut during run |
| Corrected Nightdrive | [five-minute video](comparison-lab-recovery/recording.webm), [night chase](comparison-lab-recovery/at-30s.png), [data](comparison-lab-recovery/results.json) | Continuous travel, two passes; weaker scenery |
| Final framing | [desktop LA](verified/desktop-la.png), [portrait cockpit](verified/portrait-driver.png), [landscape LA](verified/landscape-la.png) | Radio visible; LA rear still overlaps dock |
| Sound audition | [45-second audible preview](final/generated-ambience-only.webm), [five-minute on/off capture](comparison-lab-recovery/generated-ambience-only.webm) | Longer capture is off first half, on second half; neither file contains radio audio |

Both comparison runs start at 1440 x 900, Mobile quality, night, Jolt and chase. Miami forces cockpit at its reset, so cameras cease to match. Speeds and scenery intentionally differ. Videos are silent browser captures, separate from own-generated audio. They compare the experience, not identical rendering workloads.

[Independent visual review](VISUAL-REVIEW.md) confirms improvement over the initial lab: quieter separate windows, softer pools, larger foreground car. Six unretouched pass frames show left/pass/right progression without visible intersections or off-road movement in those samples; they do not prove full-video smoothness. Coastal water/palms distinguish it from the enclosed city, but Miami remains visually stronger. Remaining failures: repetitive box buildings, weak district character, flat ocean, rectangular headlight edge, LA dock overlap and inherited car/cabin mismatch. **No main-scene migration.**

Own-generated final-framing audio capture: **44.99 seconds**, mean **-43.6 dBFS**, peak **-30.0 dBFS**: [FFmpeg log](final/audio-levels.log). Radio loudness was not measured. Founder listening remains necessary for engine realism and the preferred mix. Sound is authored synthesis, not a verified realistic engine recording.

### Experience comparison

These are evidence-backed judgments and limits, not scientific quality measurements or a user study.

| Dimension | Current finding |
|---|---|
| Driving sensation | Lab adds curves, acceleration and actual passing; Miami's forced reset interrupts its journey. Founder motion preference remains untested. |
| Perceived speed | Lab travels much farther during the same five minutes and has moving traffic references. Numerical speed and sampled frames alone do not prove an exciting sensation. |
| Environmental variety | Lab alternates two layouts continuously, but Miami has better authored detail and stronger coastal identity. Neither establishes the desired full district library. |
| Camera quality | Existing cockpit is preserved; closer LA view improves cabin presence. Dock overlap still fails clean framing. |
| Sound immersion | Independent on/off graph and own-generated audition work. Human listening verdict unavailable; no invented score. |
| Visual quality | Miami wins the matched night image review. Lab's boxes, palms and ocean are visibly simpler. |
| Performance | Lab passes the measured desktop/emulation cases; lower scene complexity confounds a direct optimization claim. Physical phones untested. |
| Desire to keep watching | Not established by an automated run. Repeated two-palette art gives a concrete reason to withhold acceptance. |

## Recording-free performance

Windows desktop, Edge **154.0.4258.62**, ANGLE/D3D11 **Intel UHD Graphics 630**. Mobile preset, night, Jolt, ambiance on. **60 seconds per fixed camera**, one browser, no video capture. Phone sizes are desktop emulation, not physical devices. [Raw results](performance/results.json).

| CSS viewport | Camera | Renderer DPR / buffer | Mean FPS | p5 one-second FPS | p95 frame ms | Worst frame ms |
|---|---|---|---:|---:|---:|---:|
| 1440 x 900 | LA | 0.85 / 1224 x 765 | 60.03 | 60.02 | 16.8 | 17.1 |
| 1440 x 900 | Cockpit | 0.85 / 1224 x 765 | 59.97 | 59.99 | 16.8 | 33.4 |
| 844 x 390 | LA | 1 / 844 x 390 | 60.03 | 60.02 | 16.8 | 17.5 |
| 844 x 390 | Cockpit | 1 / 844 x 390 | 60.03 | 60.02 | 16.8 | 17.7 |
| 390 x 844 | LA | 1 / 390 x 844 | 60.03 | 60.02 | 16.8 | 18.5 |
| 390 x 844 | Cockpit | 1 / 390 x 844 | 60.03 | 60.02 | 16.8 | 19.4 |

Sampled resources: **126 geometries, 19 textures**, 141-165 draw calls, 65,915-84,410 triangles; JS heap 23.6-33.2 MB. Samples are not maxima or GPU-memory measurements. Near-60 FPS is refresh-limited. Simpler scenery is a major confound against Miami; no isolated causal optimization claim. GPU elapsed time and VRAM were not measured. Individual chunk generation timing excludes combined startup, shader compilation and GPU upload.

One final **10.003-second CPU sample** used Chrome DevTools `SystemInfo.getProcessInfo`: eight reported browser processes present at both boundaries consumed 5.430 CPU seconds, averaging **0.543 CPU cores**, or **4.52% of 12 logical processors**. This is a short post-controls desktop LA-view sample, not peak CPU or the whole soak. GPU-process CPU is included; GPU utilization is not. A Windows process lookup could not uniquely identify the automation root, so no OS-derived CPU figure was fabricated.

## Real-time endurance

The final [Director soak](soak/results.json) completed **1,800.320 real seconds** on the same desktop, Mobile/night/Jolt, ambiance on, 1440 x 900 CSS / 1224 x 765 buffer, DPR0.85. No video recording; screenshots every five minutes plus the first 30-second sample.

- **27,736.5 m odometer**, road parameter 27,650.5 m; **13 completed overtakes**, **301 chunk fills** using the same 13-slot pool.
- Zero backward resets, page errors or WebGL context losses. Radio playing at all 60 samples, taken every 30 seconds. Minimum measured same-lane longitudinal gap **30.82 m**. No claim of all-frame audible-radio monitoring.
- Thirty-second mean FPS **59.09-60.05**; lowest p5 one-second rate across windows **53.14 FPS**; maximum p95 frame time **16.8 ms**. Worst individual frame **116.6 ms**, in the window ending at 1,050 seconds. Its cause was not isolated; do not claim zero frame spikes.
- Geometry count warmed from 117 to **126 by 60 seconds**, then remained there; **19 textures** throughout. Own audio reports 15 retained nodes. Maximum individual CPU chunk fill **2.5 ms**, excluding GPU upload/whole-frame cost.
- JS heap **17.90-46.03 MB**, ending at 46.03 MB. First-five-minute mean **24.42 MB**, last-five-minute mean **35.75 MB**. Later samples have a higher baseline despite repeated falls. **No growing geometry/texture counts after warm-up, but leak-free JavaScript operation is not established.** A retained-heap investigation remains before any long-running release claim.

The JSON's functional `passed` flag checks continuity, playback samples and constrained traffic; it does not certify aesthetics, absence of frame spikes or leak-free memory. The five-, ten-, fifteen-, twenty-, twenty-five- and thirty-minute snapshots remain available in `soak/`. This is actual wall-clock operation, not accelerated simulation.

## Founder recommendation

1. **Does it feel endless?** Continuous travel is verified for 30 minutes without a reset. Two recurring art palettes still limit perceived variety.
2. **Is speed more expressive without becoming a racing game?** Acceleration and repeated guarded passes work with no manual-driving/gameplay systems. Founder preference for the sensation still needs review.
3. **Does sound improve immersion?** The controllable layers and demo work; no independent human listening verdict is claimed. Listen locally with ambiance on/off.
4. **Does it stay interesting after 15-30 minutes?** Not established. The repeated boxes/coast are insufficient to call the experience compelling, even though motion continues.
5. **Simplest architecture?** Keep the bounded shared-road/pool approach and replace the placeholder palettes with a small authored segment library. Avoid a general WFC city solver. Measure again as detail is restored.

**KEEP IMPROVING.** Review this isolated motion/audio direction before approving main-scene migration; preserve Miami's stronger art. Memory retention, the isolated long frame, vehicle fit and camera overlap remain engineering/visual follow-ups.

## Limits and approval boundary

Reproduce with the existing local tools; run one GPU browser at a time:

```text
node scripts/cruise-pass5-isolated-build.mjs build 3041
node scripts/cruise-pass5-isolated-build.mjs start 3041
node --import tsx --test --test-concurrency=1 "tests/**/*.test.ts"
node scripts/nightdrive-proof.mjs --mode inspect --phase verified
node scripts/nightdrive-proof.mjs --mode controls --phase controls
node scripts/nightdrive-proof.mjs --mode perf --seconds 60 --phase performance
node scripts/nightdrive-proof.mjs --mode journey --target miami --seconds 300 --phase comparison-miami
node scripts/nightdrive-proof.mjs --mode journey --target lab --seconds 300 --phase comparison-lab-recovery
node scripts/nightdrive-proof.mjs --mode soak --seconds 1800 --phase soak
```

The proof script reuses Playwright installed in sibling `cruise-master-20261005` and the installed Edge browser; it is not a standalone dependency bundle. Existing CapCut FFmpeg extracted reference/pass frames and measured the own-generated audio. No package or tool was installed for this pass. Re-running an evidence phase overwrites that phase's files; use a new `--phase` name to preserve a comparison.

The lab preserves the existing eight-station catalog; remaining four candidates are not claimed implemented. Jolt live playback/analysis is verified here; no new commercial integration permission is inferred. Original route, main Miami scene, hidden Avenue guards and production analytics are unchanged. Lab travel generates no advertising impressions.

**Hard stop after this local evidence packet and commit:** Luis reviews driving and sound before any main-scene migration or broader art build. No paid assets, dependencies or services without approval. Supabase key retirement remains unconfirmed; deployment still requires separate explicit authorization. Stripe TEST remains blocked without confirmed isolated non-production settings. Physical Android/iPhone, Chromecast, AirPlay and TV browser: **BLOCKED - PHYSICAL DEVICE REQUIRED**.

Research licenses, actual founder footage, implementation details and agent ledger: [initial report](REPORT.md). Four actual participants: `/root`, `/root/ux_music`, `/root/performance`, `/root/qa_security`; inherited session models, exact runtime variants unavailable. No specific Astra/Opus identity invented.
