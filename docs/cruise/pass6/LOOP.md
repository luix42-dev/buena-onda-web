# Pass 6 loop transition

Owner: `/root/ux_music`. Exact model identity unavailable to this agent. No original-route edits, dependencies, production access or deployment.

## Built

The 210 m Miami street remains an automatic fade/reset, not a seamless continuous world. Previously the reset removed the cover in the same callback that teleported the vehicle; chase cameras then interpolated across the entire street. Under reduced motion, the CSS transition disappeared, exposing that move immediately.

The revised transition has three stages:

1. Pause movement and cover the scene. A cancellable animation-frame check waits until computed cover opacity reaches 0.999 or greater. No fixed delay assumes that CSS has finished. A hidden document cannot begin the teleport.
2. Reset distance under the opaque cover, increment a camera reset revision and keep driving paused. Normal motion deliberately changes the shot: Cockpit becomes Chase; other shots become Cockpit. Every camera snaps to its new desired position on that revision, rather than interpolating from the far end of the route. A remounted scene also handles the revision. The automatic director and manual camera shortcuts cannot replace that shot while the covered cut is pending; the automatic director also waits until the cover fades away.
3. DriveController acknowledges on the following R3F frame, after one frame has rendered at the reset position. Only then does the cover clear and the normal visible/no-dialog/started resume policy take over.

Reduced motion preserves the selected angle and uses an immediate opaque cut without a CSS fade or a camera sweep, but still waits for the rendered-frame acknowledgement before uncovering. Audio is untouched throughout. The cover polling callback cancels on effect cleanup/unmount; no loop timeout remains. Hidden/suspended scenes can keep the cover until rendering resumes instead of uncovering an unrendered reset.

Desktop quality Canvas DPR is capped at 1.25 (previously 1.5). The lead's subsequent measured quality policy uses DPR 0.85 for large Mobile-quality canvases at night; phone-sized night canvases and daylight retain DPR 1. Desktop shadows and lights remain selected by existing quality behavior. These pixel-count changes should be assessed with the separate performance and visual evidence, not inferred from the cap alone.

## Independently reviewed verification

Final evidence: [62-check result](loop/results.json), [video-extracted transition contact sheet](loop/transition-contact-sheet.png), and [recording](loop/loop-check.webm). The result is dated 2026-10-10T17:59:43.994Z and reports **62/62 passed, no captured page errors**. This agent independently inspected the result and the actual 12-frame contact sheet; it did not rerun the browser or listen to the audio.

The lead ran the expanded `scripts/cruise-pass6-loop-check.mjs` against the local Next production build on port 3041 using headless Edge 154.0.4258.62, an 844×390 mobile/touch-emulated viewport, window DPR 3 and Mobile quality for loop scenarios. All six normal-motion camera starts, Chase and Cockpit reduced-motion starts, and one simulated hidden-document scenario passed. The intervals run from artificially positioned endpoint setup through resumed movement: approximately 1.62–1.70 seconds for normal transitions and 0.71 seconds for reduced-motion intervals. These are boundary-test durations, not complete-lap or sustained-performance measurements.

| Owner | Files | Status | Evidence | Remaining limits |
|---|---|---|---|---|
| `/root/ux_music` implementation; lead browser run; `/root/ux_music` artifact review | MiamiStreet, DriveController, scoped fade CSS | Implemented and locally verified | Sampled distance reset and large camera displacement occur only at cover opacity ≥0.999; expected new camera rendered before uncover; all nine boundary scenarios resume | RAF samples are not every presented GPU frame; no full-lap soak |
| Same | Loop transition | Visual review complete for extracted normal Chase→Cockpit segment | At 12.98 s the Chase scene is visible; it darkens through 13.58 s; at 13.78 s the world is covered while radio dock remains visible; the new Cockpit shot appears from 13.98 s and continues through 15.18 s. No long camera sweep or exposed start-position flash appears in these 12 frames | Other scenarios have runtime evidence; this contact sheet does not independently show each one |
| Lead run; independent artifact review | Radio lifecycle | Browser-state verified | Playing remains true throughout each sampled interval; Jolt live analysis present at completion | No audible-output recording/listening or buffer-gap measurement |
| Lead integration/run; independent artifact review | DPR, headlights and mirror policy | Runtime verified | Window DPR 3 → Desktop renderer DPR 1.25; two active shadowless headlights; night mirror 0 reflection passes/132 main passes, sunset 39/118 (0.331); large Mobile night DPR 0.85, phone night and large daylight DPR 1 | Object/pass counts and DPR do not establish visual quality or FPS by themselves |

The **full recording contains intentional profile-probe prepositioning between scenarios, outside assertion windows**. Those setup teleports are not visitor-flow behavior and must not be mistaken for failed loop transitions. The extracted contact sheet deliberately excludes the following scenario's artificial setup and shows only the reviewed transition interval.

Reduced motion retains its angle and uses a covered cut. It is not a seamless road. Hidden-document analysis may temporarily use fallback by design; playback state must remain active. The hidden case overrides `document.hidden` and dispatches `visibilitychange`; **physical tab switching, OS suspension, Android, Chromecast, AirPlay and TV hardware are not verified here**. No repeated full-lap soak, exhaustive Restart/vehicle-switch race test or production verification is claimed. All non-GET/HEAD requests and analytics are intercepted during this local harness run.

## What true continuous wrapping would cost

This is a separate scene-coordinate change, not a timer adjustment. The Original already uses recycled 64 m world modules; Miami currently moves its camera and car through a fixed, authored 210 m environment with absolute plot stations and billboard exposure measurements.

A bounded future implementation should first prototype one repeated street tile and its seam before moving the entire scene. It must then:

- Match road centerline, building edges, palms, water/horizon treatment, traffic and people across both tile ends. The current sinusoidal street center and its tangent do not simply repeat at 210 m.
- Recycle nearby geometry relative to the camera or rebase world coordinates, keeping all six camera modes and cockpit anchors consistent. Avoid loading duplicate full scenes just to disguise the seam.
- Preserve plot IDs and placement/exposure coordinates while separating total traveled distance, local tile distance and lap number. Drive-by deduplication must remain correct across repeated tiles.
- Recheck world-space shaders, shadows, headlight targets, billboard occlusion and traffic placement against the new coordinate convention.
- Record multiple complete laps at all required viewports, then measure frame pacing and memory for repeated recycles.

### Rough planning estimate — not measured, quoted or committed

Assuming one engineer familiar with this scene, reuse of existing assets, and one repeating street section rather than a new city, reserve approximately **4–9 engineering days** (roughly 28–64 focused engineering hours). This is a judgment-based planning range, not observed task duration, a delivery promise or a monetary quote. Waiting for founder feedback and physical-device access is additional calendar time.

| Stage | Rough focused effort | Deliverable and reason for uncertainty |
|---|---|---|
| Bounded wrap prototype | 0.5–1.5 days / 4–12 hours | One repeated section with matched road position/tangent and all six cameras. Establish whether current authored building ends can join convincingly or need repositioning. |
| Scene and measurement integration | 2–4 days / 16–32 hours | Recycle environment, traffic and people; separate local distance from lap/total distance; preserve plot identity, exposure measurement and drive-by deduplication; reconcile world-space shader/light coordinates. More systems change if authored geometry cannot be tiled cleanly. |
| Visual and performance regression | 1–3 days / 8–20 hours | Multiple recorded laps across required viewports, normal/reduced motion and night quality settings; check occlusion, radio framing, frame pacing and memory. Physical-device availability and failures can extend calendar time. |

**Re-estimate after the prototype before committing to integration.** If the first section cannot join convincingly without rebuilding large parts of the environment, stop and compare a smaller repeated route against a broader world-coordinate refactor. The upper end is not a cap for that broader scope. No new services, paid calls, purchased assets or fees are assumed; any such need requires a separate decision.

The current covered camera cut is the inexpensive interim treatment. True wrapping affects several rendering and measurement components and should not be presented as a cosmetic one-file fix. Keep the explicit fade/reset terminology until a recorded wrapping implementation demonstrates continuity.
