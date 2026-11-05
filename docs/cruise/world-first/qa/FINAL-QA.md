# World First independent QA — 2026-10-12 UTC

Functional browser gates pass on the bounded diagnostic. The photographic-world gate fails. A playable two-second native/hybrid checkpoint and the nine-second founder reference do not establish the requested finished sixty-second world, a forty-minute transition, physical phone performance, or sustained FPS.

QA owner: `/root/qa_security`, configured `gpt-6.1-sol`. No child agents. Only the two QA harness scripts and `qa/` were edited by this owner. No original route/source was changed by QA, no deployment occurred, and no production mutation was performed.

## Actual browser evidence

All browser runs use Microsoft Edge headless on this Windows machine. Actual WebGL2 renderer strings consistently identify **Intel UHD Graphics 630 through ANGLE / Direct3D11**. These runs do not establish NVIDIA browser rendering. Profiles: desktop 1440x900, portrait 390x844, landscape 844x390, all DPR1. Phone sizes are desktop emulation, not physical Android validation.

| Evidence | Artifact |
|---|---|
| Full reference radio/video controls, all three profiles | `local/2026-10-12T03-22-22-408Z/results.json` |
| Fresh Original Cruise and actual Jeep Night, all three profiles | `baseline/2026-10-12T03-24-49-508Z/results.json` |
| Actual deployed Miami Test, desktop, adapted Cruise gate | `baseline/2026-10-12T03-26-51-860Z/results.json` |
| Fresh live baseline load/callback summary | `baseline/fresh-summary.json` |
| Native/hybrid focused playback, all six source/profile combinations | `../hybrid/browser-2026-10-12T03-19-49-582Z/results.json` |

Each profile folder contains actual viewport screenshots, detailed measurements and a silent page video. The earlier shader-concurrent baseline is preserved in `BASELINE-PARTIAL.md`; its load observations are excluded from the fresh comparison. Fresh browser runs started after Unreal exited. Loading measurements still include automation, recording, source selection, vehicle readiness and browser/network/cache conditions; they are not representative production startup guarantees.

## Reference functional result

All thirteen assertions passed in each of the three profiles, with zero page errors: protected source preservation, no horizontal overflow, decoded video present, world video muted, station switch preserving video clock and owner, radio pause preserving video progression, ambience toggle preserving radio state, world pause stopping video while radio time advances, four original presets, keyboard volume knob, keyboard volume slider, and page-error check.

Actual station switching changes the selected station to Jolt while video time advances, without a video load/pause/seek event in the observation window. No restart occurs inside that test. Separate intentional Replay actions reset independent checks. During the world-pause check, the live audio clock advances by about 1.0 seconds on each profile while the video clock stays fixed. This is browser media-clock evidence, not a human listening claim.

The original dashboard has presets, SEEK, power, mute and volume. It has **no adjustable EQ/DSP control**. No EQ control is fabricated or counted as verified. Jeep Night's visible spectrum is a separate project feature; it does not establish an equalizer in World First.

The reference is excluded from authored driving ambience: enabling the audition creates an independent graph but it remains suspended at target gain zero on diagnostic footage. The radio selection/state and video clock remain unaffected. This proves ownership/gating behavior, not heard driving ambience on the reference. Authored ambience's unit/lifecycle verification is separate.

| Reference profile | Final replay first-frame readiness | Observed handoff gap | Final timeline |
|---|---:|---:|---:|
| Desktop | 56.1 ms | 29.8 ms | 9.0 s / ended |
| Portrait emulation | 45.8 ms | 25.9 ms | 9.0 s / ended |
| Landscape emulation | 52.3 ms | 37.9 ms | 9.0 s / ended |

These are actual decoder readiness and event-based handoff measurements. They are not a guarantee of an invisible optical seam. Both reference segments are 4.5-second VP8 clips, 135 frames each at 30 fps, 598,522 and 586,038 bytes, with no audio. The reference is diagnostic material with unresolved final-use rights.

## Native/hybrid playback and visual inspection

The independent QA owner inspected actual saved native/hybrid desktop screenshots, fresh Original interior/chase screenshots, actual Jeep desktop/portrait screenshots, Miami's loaded driving screenshot, reference portrait/landscape screenshots and an extracted frame of the actual reference browser recording.

The native checkpoint has a wide field of dotted building lights and illuminated road edges. The actual frame still reads as a straight, dark procedural road with sparse material detail and a relatively thin skyline. It fails photographic quality. The hybrid adds a large dark authored dashboard over that same plate; calibration remains a candidate and the framing/occlusion is unverified. A temporal handoff pass does not establish matching cockpit optics or believable photographic materials.

Original Cruise preserves its garage, cockpit and radio presentation but shows a sparse coastal corridor. Actual Jeep Night has a legible warm dashboard and visible spectrum, yet its scenery remains repeated simple facades, few bright window rectangles and a narrow boulevard. Actual deployed Miami Test is **Ocean Drive / Sunset Study**, with a convertible, advertising, traffic and stylized coastal frontage; it differs from the newer local MiamiStreet source. Its adapted `▶ Cruise` gate starts correctly. The saved Miami scene remains sunset; no night comparison is claimed for it.

The native/hybrid specialist's final actual six browser combinations have muted 1920x1080 video, one observed transition, a 2.0-second ended timeline, no overflow/page errors and released detached decoder elements. Actual native handoff gaps are 27.9/36.9/28.0 ms; hybrid gaps are 40.6/31.7/31.8 ms, ordered desktop/portrait/landscape. Connected decode slots report 60 total frames and one dropped frame per source/profile; that short counter is not sustained performance certification. Actual native VP8 segments are 1,270,137 and 1,260,708 bytes, one second and 30 frames each. No source is marked visually accepted.

## Performance and recording limits

Fresh live ready measurements were Original 10.56/4.24/3.44 s and Jeep 5.75/1.97/1.97 s, ordered desktop/portrait/landscape. Miami desktop measured 7.85 s. The retained short animation-callback observations are about Original 15.9/60.0/60.0 Hz, Jeep 36.0/58.7/58.7 Hz and Miami desktop 30.6 Hz. These are **rAF callbacks**, include screenshot/camera/recording overhead, and are not measured sustained engine render FPS. JS heap is not GPU memory; VRAM usage was not measured.

Playwright recordings intentionally capture page pixels only, with no radio, microphone or system audio capture. FFmpeg demux inspection independently confirmed that representative reference and Jeep recordings contain one VP8 video stream and no audio stream. These recordings are 25 fps capture artifacts; the source clips' 30 fps is separate. The reference recording is 23.72 s because it includes interface interaction and separate replays; Jeep's desktop recording is 19.48 s. The extracted and inspected reference frame is `local/2026-10-12T03-22-22-408Z/desktop/recording-frame.png`.

## Preservation, safety and validation

All six protected Git blob hashes matched at initial preflight and again after browser testing. Staged paths were empty before the lead's selective staging. The browser guard blocks non-GET/HEAD/OPTIONS requests, analytics and Avenue API requests; service workers are disabled. Artifacts include sanitized blocked requests without query strings, request/response bodies, headers or credentials. No claims, payment actions, store navigation, production writes, key inspection or key changes occurred. There is no bulk staging by QA.

Lead-reported final `npm run typecheck` exit code: 0 after owned decoder cleanup and garage lifecycle fixes. Lead-reported combined contract/audio validation: `node --import tsx --test scripts/world-first-hybrid-contract.test.ts docs/cruise/world-first/audio/verification.test.ts tests/nightdrive-audio.test.ts`, nine passed, zero failed, duration 1.562 s. QA did not repeat these already passing unit checks. QA harness syntax and request guard/redaction checks passed locally.

**Release remains blocked:** historical Supabase service-role key retirement is unverified; photographic art acceptance fails; final sixty-second authored world, optical hybrid calibration, physical phone validation, longer continuity and forty-minute lighting transition are not complete. No deployment or production-readiness claim follows from the passing bounded browser gates. All QA browsers are closed.
