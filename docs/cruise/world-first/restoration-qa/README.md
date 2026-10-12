# World First restoration browser QA

Restoration browser acceptance passes across desktop and both phone emulation profiles. Actual owned catalog metadata saves, reloads and removes correctly; unknown live tracks cannot be saved. The same playing radio owner/source/clock survives cockpit, live director, billboard and native director changes. Native billboard shots were captured and inspected. All QA browsers are closed.

Owner `/root/qa_security`, configured `gpt-6.1-sol`. Only the new restoration harness and this evidence directory were edited by this owner. The harness refuses launch with a running Unreal editor or the lead's browser-hold sentinel.

## Accepted evidence

Machine: Microsoft Edge headless on Windows. Actual WebGL2 renderer consistently identifies Intel UHD630 through ANGLE / Direct3D11. NVIDIA browser rendering is not established. Profiles are 1440x900, 390x844 and 844x390 at DPR1. Phone dimensions are desktop emulation, not physical phone validation.

The concise combined evidence is [acceptance-summary.json](acceptance-summary.json). Phase-level measurements and screenshots are retained in these folders:

| Check | Desktop | Portrait / landscape |
|---|---|---|
| Actual catalog save/reload/remove and unknown stream Save disabled | `2026-10-12T04-09-46-427Z` | Accepted song phases in `2026-10-12T04-04-04-846Z` |
| Stable owned radio across live visual modes | `2026-10-12T04-09-46-427Z` | `2026-10-12T04-11-21-641Z` |
| Native director and billboard shots2/4 | `2026-10-12T04-11-21-641Z` | `2026-10-12T04-11-21-641Z` |

Fresh desktop passed all thirteen original restoration assertions. The focused follow-up adds billboard view radio continuity and actual runtime director shot variety. All selected assertions pass on portrait/landscape; `null` in a targeted result denotes an intentionally unrun phase, not a failure or an acceptance claim.

The saved catalog label is **Nymphomaniac -  Instrumental Version 1984 2018 Spacetalk Records**, exactly as supplied by the existing owned catalog. No title/artist split, song recognition, fabricated ID or human listening is claimed. Saved entries contain only label, station ID/name, metadata source `/api/radio/tracks`, and timestamp. There is no audio URL or audio blob in the library. Saving/removing retains the current radio element, source and advancing clock. Reload persists the bookmark; removal persists after a second reload. This is local browser storage, not an account-synchronized collection or a replay feature. No fixture was used.

Selecting Jolt displays Track information unavailable and disables Save. External station names do not become songs. That eligibility assertion is independent of the stream's playback availability.

For camera continuity, the harness deliberately returns to Buena Onda Preset 1 and observes an actual playing media clock before changing modes. Each accepted observation retains the same audio ID/source, with time advancing and no radio load/pause/seek event. Live director telemetry recorded three distinct shots on desktop/portrait and two on landscape. The realtime scene and native rendered film are separate camera implementations; the film is not presented as a controllable flight camera.

## Actual visual and decode review

Independent QA inspected actual saved radio/library, cockpit, realtime billboard and director screenshots across the three profiles. The saved library and full headunit fit vertically on portrait and side by side on landscape, with presets, power, SEEK, mute, volume and removal visible. Desktop preserves the original headunit presentation. The compact comparison UI no longer covers the radio entry in the fresh capture. There is no horizontal overflow or disposed-scene failure in accepted captures.

`desktop/billboards.png` in the fresh desktop folder shows a clearly readable **BUENA ONDA** roadside house creative. Each profile's final folder has `native-billboard-shot-2.png` and `native-billboard-shot-4.png`, captured from actual playing media near 2.35 s and 6.35 s. These show **VICE NIGHTS** in the authored city camera cuts. Desktop and landscape headline text is large and readable; portrait preserves the wide frame as a smaller letterboxed image, where headline text is visible but fine print is small. These observations do not count sponsorship exposure or establish billboard reading across the entire ride.

The corrected native clip is one eight-second, 1920x1080 VP8 file, 10,317,196 bytes, with 240 source frames at 30 fps and no audio. All three final browser profiles reach an actual 8.0 s ended timeline and report 240 presented frames with zero drops. There are zero segment transitions because the four authored camera cuts are inside one file. Actual first-frame readiness in the final runs is 147.2/102.0/94.3 ms, ordered desktop/portrait/landscape. This short decoder check is not a sustained performance benchmark.

The native director uses corrected actual Unreal camera output, not the earlier rejected default-origin render. Actual early, later and billboard shots differ as authored. The requested controls and billboard restoration pass; native photographic art acceptance and hybrid optical calibration remain unaccepted. An eight-second director preview does not establish a finished sixty-second world or forty-minute lighting transition.

## Contaminated attempts retained honestly

The first desktop run overlapped encoding/HMR correction while still in the original garage. It timed out with the drive-failure overlay and is excluded from acceptance. Its real catalog response loaded successfully, so the song API was not its entry blocker.

The first mobile camera observations initially selected Jolt before its clock advanced, leaving no playing baseline for the cockpit assertion. During landscape Live Director observation, HMR edits also coincided with old audio ID 2 pause/load and a new ID 7. That owner reset is retained in the original result, not converted to a pass or attributed conclusively to a camera regression. The accepted mobile camera rerun uses frozen code and a stable owned track, with no reset. Initial mobile metadata save/reload/remove phases succeeded before those contaminated camera observations and remain valid evidence.

## Safety, preservation and checks

All six protected original Git blob hashes match in the run preflights. The read-only staged-path audit contains the isolated restoration components/docs/media/scripts; none of those six protected files or unrelated cinema changes is staged. QA did not stage anything. Lead reported final TypeScript exit 0 after integration. Harness syntax checks passed.

The browser request guard blocks writes, analytics and Avenue API requests, and logs no credentials, headers, bodies or URL queries. No external Listen link, payment, claim or ownership action was clicked. No production data or keys were changed. Recorded videos contain page pixels only. FFmpeg inspection of the fresh desktop recording independently confirms one VP8 video stream and no audio stream; its 55.16 s at 25 fps includes interactions and is not the native source duration/fps.

Historical Supabase key retirement remains an unverified release blocker. No deployment, production readiness, physical phone certification, sustained FPS or GPU-memory claim follows from this restoration pass.

## Harness

```powershell
node scripts/world-first-restoration-proof.mjs
node scripts/world-first-restoration-proof.mjs --run --url=http://127.0.0.1:3060/cruise/world-test
```

The default invocation performs source-preservation preflight without launching a browser. After the lead releases native production, `--run` captures actual desktop 1440x900, portrait 390x844 and landscape 844x390 at DPR1, sequentially. Phones are desktop emulation. Original analytics/write protection and sanitized media/renderer evidence are imported from the existing QA harness. Videos capture page pixels silently; no radio/system/microphone audio is recorded.

Expected checks: persistent cockpit/radio/director/billboard controls; real available Buena Onda catalog label save/reload/remove in browser localStorage; metadata-only saved fields; external live station unknown-label Save disabled; existing radio owner identity/source/time preserved across saves and visual modes; runtime director shot changes; actual screenshots of the headunit, saved library, cockpit, director and billboards; correct native eight-second decode/end/transition measurements and no disposed-scene failure after switching.

`--fixture` is an optional explicitly labeled local catalog fixture. It intercepts the local playlist and supplies synthetic silence in memory, with a label saying **LOCAL QA FIXTURE — saved-label persistence only**. It proves browser UI/storage behavior if real owned metadata is unavailable. It cannot establish a heard or recognized song. The fixture creates no files, recording, production write or external song lookup. The default uses the existing actual playlist.

`--phases=persistent-controls,cockpit,live-director,billboards,native-director-cut` narrows a follow-up to unresolved camera checks. `--desktop-native-only` limits the desktop part of that follow-up to the missing native billboard captures. These options retain skipped assertions as `null`. Existing passing song checks need not be repeated to resolve a camera precondition. No EQ/DSP interface is fabricated or claimed as verified.
