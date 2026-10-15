# Cockpit return QA

October 15, 2026. Isolated local CruiseOS review. Windows headless Edge 155, DPR 1. CSS viewport emulation is not physical phone testing or actual Chrome browser zoom. No user study, new FPS benchmark, paid service or deployment.

## Reference and visual review

The actual [public Cruise](https://www.buenaondalifestyle.com/cruise) was opened read-only. Its platform/grid garage, three original rides, lighting/drive controls and LET'S CRUISE entry were observed. Public playback was not started; later public radio guidance remains unverified. [BEFORE](BEFORE.md) separates that live observation from local RadioConsole tutorial source evidence.

Old local Countach cockpit screenshots were captured on desktop, portrait and short windows before replacement. The initial raised-eye candidate revealed more near road but placed too much headliner in view. That candidate and its test artifacts remain under [evidence/after](evidence/after/results.json). Four larger viewport cases passed all 18 initial assertions. Two compact cases exposed the projected radio center underneath the persistent DOM player; the original strict mesh-only harness timed out. This is retained evidence, not relabeled as a successful canvas tap.

The refined camera moves the eye forward and slightly lowers it relative to that rejected candidate. [Desktop tuning](evidence/tuning/desktop-cockpit.png) and [portrait tuning](evidence/tuning/portrait-cockpit.png) were independently viewed. Desktop has a substantially clearer road window and less dominant roof while retaining the wheel and headunit. Portrait still has a visible roof band, but more road is visible than in the old view and first candidate. This is a visual assessment, not a measured visibility percentage or proof of user preference.

Actual ready-state 3D garage screenshots were also captured: [desktop](evidence/loaded-garage/desktop-loaded-garage.png), [portrait](evidence/loaded-garage/portrait-loaded-garage.png). Both waited for vehicle readiness and absence of the loading label. Six loaded-garage assertions passed. Earlier entry images showing Preparing remain valid loading evidence rather than proof of a loaded car.

## Final production gate

Frozen build `I9B7uUgJOo8_ygFiiap3Q`, local port 3081. [Final Countach results](evidence/final/results.json): all 16 checks pass in each of six contexts, 96 total. [Wrangler smoke](evidence/wrangler/results.json): 9/9 pass in one desktop context. No page exceptions in these runs.

| Viewport | Immediate selected Countach / driver | Driver after 15 seconds | Radio focus path | Same audio advances / Back works |
| --- | --- | --- | --- | --- |
| Desktop 1366x768 | Pass | Pass | Actual physical mesh tap | Pass |
| Laptop 1280x600 | Pass | Pass | Actual physical mesh tap | Pass |
| Short 1024x480 | Pass | Pass | Actual physical mesh tap | Pass |
| Portrait 390x844 | Pass | Pass | Accessible guide | Pass |
| Reflow 683x384 | Pass | Pass | Actual physical mesh tap | Pass |
| Compact reflow 512x384 | Pass | Pass | Accessible guide | Pass |

Start and the persistent Pause control are fully inside the viewport and uncovered at their centers in all six contexts. No prestart player or document-width overflow was observed. The new radio guide is also visible and uncovered. Mode/selection are checked immediately after Start; this does not claim zero asset-loading time. Camera retention is checked 15 seconds after vehicle readiness.

Wrangler selection remains Wrangler, starts in driver mode and retains driver mode after the separate three-second smoke check. Its actual [cockpit screenshot](evidence/wrangler/wrangler-cockpit.png) was viewed; this is not a second six-size vehicle matrix.

The final harness distinguishes two valid access paths. If the projected headunit center is inside the viewport and hits CANVAS, it performs an actual mouse tap there and records a verified mesh interaction. Otherwise it uses the visible Tap the radio to tune in guide. A guide click is never counted as a canvas tap. Portrait's projected center was x422.14, outside its 390px viewport; compact reflow's center hit a DOM BUTTON rather than canvas. These are concrete limits of direct mesh access, with a verified labeled alternative. Both paths produced actual dashboard focus, advancing same-element audio and a working Back to drive action.

Final screenshots were independently reviewed: [desktop windshield](evidence/final/desktop-cockpit.png), [portrait windshield](evidence/final/portrait-cockpit.png), [short-window windshield](evidence/final/short-cockpit.png), and [portrait dashboard focus](evidence/final/portrait-radio-focus.png). The refined camera keeps the cabin recognizable and makes the near road clearer; portrait retains a roof band. No visibility percentage or user-preference improvement is claimed. The ready-state garage captures above remain applicable because the final refinement changes only driving-eye coordinates.

## Original route source preservation

Compared baseline `0307edf` with application commit `2715376`. No diff exists for original `app/(site)/cruise/page.tsx`, `LaunchExperience.tsx`, original `RadioConsole.tsx`, shared `lib/real-miami/ride-vehicles.ts`, Countach geometry, or `PhysicalRadio.tsx`.

The new `cruiseCockpitProfile` returns the input profile unchanged unless enabled for Countach; `JeepNight` passes the `cruiseOS` flag. Forced driver start and suppression of the delayed camera reveal also check `cruiseOS`. New garage/world predicates preserve their previous behavior when that flag is false. `RidePicker` adds an early OS-specific branch; its original return remains intact. These are source-review findings, not a new browser test of the legacy routes.

## Reproduction

Run `node scripts/cruise-cockpit-return-proof.mjs`. `BASE_URL` selects the complete local route URL and `PROOF_OUT` selects a fresh evidence directory. Default mode tests six Countach viewports, immediate cockpit and camera retention after 15 seconds, plus radio access/audio continuity. `--wrangler-only` runs one lightweight alternative-vehicle case. `--garage-only` captures ready-state Countach garages on desktop and portrait without starting. `--tuning` runs short desktop/portrait framing checks. `--before` performs the public read-only reference visit and old local-camera captures, and requires the corresponding preserved old build. Failed critical assertions exit 1. Script syntax passes. All QA browsers are closed; no further tests or app edits are pending from this reviewer.
