# Independent evidence reconciliation

Reviewer: `/root/qa_security`; exact runtime model variant unavailable. 2026-10-10. Read-only source/evidence review; this report is the only file created. No browser, benchmark or test rerun.

## Verified against artifacts

| Claim | Evidence | Finding |
|---|---|---|
| Final production build | `build-final.log` | Explicit `NEXT_PROCESS_EXIT=0` present |
| Full tests | `tests-final.log` | 81 tests,81 pass,0 fail;25,183.1435ms |
| Functional checks | `verified/results.json` | 18 checks, all pass; no page errors; report passed |
| Recording-free performance | `performance/results.json` | Six samples of60seconds, `recording:false`; all displayed FPS, p5, p95, worst-frame and buffer values agree after rounding |
| Performance resources | Same six samples |126 geometries,19 textures;141–165 calls;65,915–84,410 triangles;23.6288–33.2125MB JS heap match the stated rounded ranges |
| Corrected journey | `comparison-lab-recovery/results.json` |300.34seconds total, ten approximately30second samples,2 passes, no resets/context loss/page errors; all sampled radio states playing |
| Final journey distance | `comparison-lab-recovery/at-300s.json` | Odometer4462.1502m, road parameter4448.8006m support rounded4462/4449 in RESULTS |
| Ambience capture levels | `final/audio-levels.log` |44.99seconds output duration; mean-43.6dBFS, maximum-30.0dBFS match |

The last journey performance sample was captured slightly before its final screenshot: its odometer4461.2549m and parameter4447.9129m differ by less than1m. The report's distance is correct for the final screenshot JSON; linking that artifact makes the precise source clear.

## Concrete wording correction

`RESULTS.md` initially describes30.9m as minimum traffic-centre separation. `dynamics.ts` updates `minTrafficGap` only when lateral difference is less than1.9m, and stores absolute longitudinal route distance. It is therefore **minimum same-lane longitudinal centre gap**, not minimum Euclidean separation across all traffic. Adjacent-lane overtaking cars may pass closer. The raw30.9264 value is correct; the metric description needs this qualification. It is accumulated by simulation steps, not merely calculated from browser samples.

## Limitations preserved

- At review time `soak/results.json` was partial: no final `passed` or actual-duration field. Do not label the30minute real-time endurance run complete until its final artifact exists and is checked.
- Functional inspection precedes the final passing-recovery change; corrected journey validates that change. Retain this sequencing disclosure.
- CPU dynamics simulations are not real browser endurance. Browser playback state is not continuous human-audible verification. Audio capture contains generated ambience only; no radio-relative loudness was measured.
- Visual-quality judgments depend on the separate visual review. This reconciliation did not rewatch recordings or independently listen to the sound.
- Phone viewports are desktop emulation; casting/physical phone claims remain blocked. Key retirement and isolated Stripe environment remain unresolved, so no deployment readiness claim is supported.

## Credential check and isolation

A filename-only pattern scan covered `components/cruise/nightdrive`, `app/cruise/miami-test/nightdrive`, the three Nightdrive test files, `scripts/nightdrive-proof.mjs` and text source/documentation extensions under `docs/cruise/nightdrive`. Patterns targeted plausible Supabase secret keys, Stripe live/test keys, AWS access IDs, private-key headers and JWT-shaped strings. **No matching filenames** were returned. No credential values were displayed; environment files were not read. This bounded heuristic is not a full forensic secret audit or proof that a previously exposed credential was retired.

Source review found no new production-write client or advertising analytics integration in the lab. Radio is reused through the optional catalog interface; ambience owns an independent generated graph and optional generated-only recording destination. The original route and existing Miami scene are outside the new lab route.

## Final endurance and controls reconciliation

This follow-up supersedes the earlier partial-soak status above. Independently read the completed artifacts; no browser or test rerun. Updated `RESULTS.md` accurately reflects the following:

- `soak/results.json`: `passed:true`, actual wall-clock duration1800.320seconds,60 samples, no reported page errors. Final odometer27736.5244m, road parameter27650.5301m,13 overtakes,301 chunk fills and minimum same-lane longitudinal gap30.81898m. All60 samples report radio playing; the wording correctly does not claim continuous human-audible monitoring.
- Recomputed from all samples: FPS range59.0874–60.0491; lowest window p5 rate53.1391FPS; maximum p95 frame time16.8ms. Largest frame116.6ms occurred in the window ending1050.01seconds. Rounded report figures agree; cause remains unisolated.
- Geometry126 from the60second sample onward, textures19 throughout, ambience nodes15 throughout. These stable counters do not establish absence of JavaScript or GPU leaks.
- Heap minimum17.89699MB, maximum/final46.03252MB. First ten samples (first five minutes) mean24.42059MB; last ten mean35.75058MB. The report correctly acknowledges the rising baseline and does not claim leak-free operation.
- `controls/results.json`:16 checks, all passed, no page errors. Covers three moods, side/aerial/low/hood cameras, Rinse/Jolt switching without replacing Canvas or resetting travel, ambience zero/restore and hidden default metrics. This is the enumerated control coverage, not a blanket verification of every browser/device/interaction.
- Its CPU sample is10.003seconds over8 processes present at both boundaries:5.429587 CPU seconds /10.003 =0.542796 core equivalents; divided by12 logical processors =4.52330%. The reported0.543 cores/4.52% is correct. It includes GPU-process CPU, not GPU hardware utilization, and is neither a peak nor full-soak measurement.

The prior traffic-gap wording issue is now corrected in RESULTS. No further numerical discrepancy found in the reviewed endurance/CPU/control claims. Security status is unchanged: key retirement remains unconfirmed, deployment is not authorized, and the local isolated server's outbound-service restrictions do not prove the exposed production key was revoked. Founder listening, stronger scenery, retained-heap investigation and physical casting remain outside this successful functional evidence.
