# Pass 5 UX and music review

Reviewer: agent `/root/ux_music`, combining Agent C (UX/mobile) and Agent D (music/interaction). Exact model identifier is not exposed to this agent; unknown. Date: 2026-10-10.

## Scope and evidence limits

Read-only inspection of the pending Pass 5 application and its existing audio dependencies. No original-route edits, production writes, browser launches, dependencies, paid calls or deployments. Security rotation is **not completed**, as confirmed by Luis. Browser evidence will be added after the lead schedules capture. Findings below are code observations, not claims of successful visitor experience or physical-device validation.

## Highest-value findings

| Priority | Finding | Evidence | Suggested action |
|---|---|---|---|
| 1 | Touch visitors can become stranded in a stopped car. | `MiamiStreet.tsx` visibility handler, `explore` and `openPlot` pause driving. Closing cards does not resume. The new dock play button controls radio only; Restart calls `reset()` with its default `resume=false`. | Resume the automatic ride after tab return and card dismissal; make Restart retain the running state after Start. Verify radio keeps playing through those transitions. |
| 2 | Manual steering and acceleration remain despite automatic-only requirement. | `DriveController.tsx` accepts arrows/WASD and applies lateral and speed changes; Garage instructions advertise them. | Remove manual driving key handlers and instructions, retaining camera shortcuts if useful. Do not replace the established automatic drive implementation. |
| 3 | Loop is a visible restart, not a seamless street. | Distance caps at 210 m, driving pauses, `onFinish` fades to black for 900 ms then resets distance and lateral position. | Label as an automatic loop until visual continuity is proven. A continuous road requires matched repeated geometry; removing the fade alone exposes a jump. Do not claim seamless based on automatic reset. |
| 4 | Reduced-motion implementation is incomplete. | CSS disables animations, but `MiniEq` writes inline transforms in RAF; pulse spectrum and VU remain unsuppressed, banner EQ reads spectrum; palm/flag wind, camera director and cockpit marquee continue. | Freeze the dock EQ under reduced motion, smooth/cap spectrum responses, disable discretionary auto-camera motion by default under that preference, and reduce decorative sway. Preserve the essential ride and audio. |
| 5 | Mobile dock may obscure the head unit, and its portrait layout is more than the promised two rows. | Portrait volume explicitly gets a full row between station and control row; landscape still has a bottom dock spanning almost full width. | Decide from actual 390×844 and 844×390 screenshots and projected radio bounds. Do not assume the camera math proves visibility or usable controls. |

## Existing implementation worth retaining

- Start calls audio unlock directly from the user gesture; `useCruiseAudio` handles delayed manifest loading using the same unlocked audio element.
- Audio owner remains outside the Canvas and vehicle component lifecycle, so camera changes need not interrupt playback.
- Station revisions prevent stale play promises from winning after source changes. Loading timeouts and fallback playback are present.
- `MusicAudio` captures an analyser tap without connecting a second audible destination. `pulse.source` distinguishes live FFT, synthetic groove and idle; the read-only `__cruise()` probe makes that distinction inspectable.
- Cockpit radio shares controls with the HTML radio and uses cheaper distant-screen updates. Its glow follows energy gradually rather than strobing.
- Dock controls have accessible names and 44 px minimum size on desktop/portrait. Landscape reduces minimum targets to 40 px, so it falls short of a 44 px comfort target; verify spacing in screenshots.
- Reduced motion already removes kick/snare pulses and tape-reel motion. Build on it rather than inventing another motion system.

## Additional inexpensive improvements

- The station pill says “tap to retry” on error but only opens the radio panel. Change the copy or make that action retry when errored.
- Use playback intent (`requested`) for Play/Pause label/action during buffering, so a user can understand that a pending stream is being cancelled.
- CSS transition disabling does not stop JS-driven animations. Verify reduced motion with sampled inline EQ transforms, camera state and environment animation, not a stylesheet match alone.
- Radio and Garage panels are sections rather than modal dialogs and do not manage focus. Keep keyboard focus visible and test Escape/return focus. Existing business dialogs also lack a focus trap.
- `captureStream` is not available in every browser. On such browsers the fallback is a synthetic 112 BPM rhythm, not music-synchronized visualization. Report this honestly, particularly for Safari/AirPlay.
- TV receiver auto-start occurs outside a user gesture. Receiver autoplay/audio cannot be validated from source inspection; hardware remains required.

## Planned verification ledger

| Owner | Files | Status | Evidence | Blockers |
|---|---|---|---|---|
| `/root/ux_music` | This report; reviewed MiamiStreet, DriveController, master.css, CockpitRadio, pulse and audio dependencies | Code inspection complete | Specific code paths above | Browser capture scheduled by lead |
| Lead browser runner | Screenshot/recording artifacts | Planned | Original vs local candidate at all three required viewports | No browser artifacts reviewed by this agent yet |
| Lead browser runner | Runtime audio probes | Planned | Start, station switching, camera lifecycle, tab return, reduced motion | Actual audible output and Safari hardware unverified |
| Physical-device owner | Cast/device evidence | BLOCKED — PHYSICAL DEVICE REQUIRED | None | Chromecast, Android, iPhone/AirPlay and TV hardware |

No comparative visual scores are assigned from source code. No implementation in this report has been independently verified as an improved user experience.

## Implemented integration corrections (pending lead verification)

Owned changes in `MiamiStreet.tsx` and `DriveController.tsx` preserve the pending Pass 5 work. Automatic-only driving removes manual steering, acceleration and keyboard driving pause. One resume policy now requires Start, loaded assets, a visible page, no open detail/plot card, and no cast-remote session. Card dismissal and tab return resume the ride; Restart respects that policy. The loop still uses the existing fade/reset, with timeout cleanup on restart and unmount. The underlying scene and controls become inert while the Start gate is present; the C shortcut and automatic camera director also wait for Start. The read-only probe exposes `running` and `paused`. Receiver auto-start is guarded against repeated calls after the gate closes. Audio ownership is unchanged.

Additional owned correction in `pulse.ts`:

- Reduced-motion bands, overall energy and spectrum approach half-amplitude targets with frame-time-based exponential smoothing at rate 1.4/second (about 0.71-second time constant), rather than multiplying an already animated value every frame.
- Kick, snare and beat are zero immediately under reduced motion for live, fallback and idle sources.
- VU levels use the same slower response and spectrum peak dots decay at 0.12/second instead of 0.35/second.
- The shared decorative/fallback clock advances at 18% speed under reduced motion. This slows consumers of `pulse.time`, such as lamp flags, without changing audio playback, analysis sampling, route speed or the source label.
- The existing cached media query still responds to its current `matches` value; no media-query objects are allocated per frame.
- Normal-motion response remains unchanged. Unsupported capture still reports `groove`; slowed synthetic rhythm is never relabeled `live`.

The lead separately owns dock EQ and automatic-camera preference handling. Palms/ocean/sky using their own clocks and cockpit marquee are outside this bounded patch; this is **not a claim that every decorative animation is stopped**. No tests or browser were launched by this agent during concurrent browser work. Lead integration and browser checks must establish runtime behavior and actual visual improvement.

## Original versus Miami: bounded source comparison

The Original is designed as a continuously recycled world. `components/cruise/performance/Runtime.tsx:47` advances distance each visible frame using `(distance + CRUISE_SPEED * step) % WORLD_LENGTH`, with no endpoint pause or fade. `lib/cruise/constants.ts:48` wraps the 64 m modules; `components/cruise/world/CruiseWorld.tsx:1181` repositions and culls those modules each frame. The wrap is intended to occur behind the cameras and return beyond forward fog.

Miami instead caps distance at 210 m and pauses in `components/cruise/master/DriveController.tsx:67`. Its `onFinish` schedules a reset after 900 ms in `components/cruise/master/MiamiStreet.tsx:114`; `components/cruise/master/master.css:112` defines an 800 ms opacity fade. The integration correction makes that loop resume safely but does not change its architecture. Describe it as **automatic fade/reset**, not seamless. Source establishes the architectural distinction, not invisible seams in the Original: a full-lap visual recording must still check route geometry, textures and camera behavior across its wrap.

The public Original LaunchExperience does not supply live environmental audio analysis:

- `app/(site)/cruise/CruiseClient.tsx:3` imports `LaunchExperience`.
- `components/cruise/LaunchExperience.tsx:59` calls `useCruiseAudio()` without a `MusicAudio` owner.
- `components/cruise/LaunchExperience.tsx:108` renders `CruiseScene` without its optional `music` prop.
- `components/cruise/CruiseScene.tsx:101` conditionally mounts choreography only when `music` exists, and line 107 passes the optional value into the world.
- `components/cruise/world/CruiseWorld.tsx:1099` skips music material installation when that value is absent.
- `components/cruise/audio/useCruiseAudio.ts:277` and line 393 conditionally unlock and attach analysis through that optional owner.

Original still plays radio and includes ordinary animation. Its reusable scene supports environmental audio analysis, but this public launch path does not wire it. This is a source-level finding about the checked-out implementation, not a measurement of production deployment contents or audible/browser behavior. Miami's `live` versus `groove` source must still be established at runtime before claiming actual synchronization. Line references describe the reviewed working tree and can move during integration.

## Independently reviewed local functional evidence

Reviewed final `functional/results.json` dated 2026-10-10T16:44:13.007Z against `scripts/cruise-pass5-functional.mjs`. All 31 recorded checks pass with no captured page errors. This final run supersedes the earlier result and includes the portrait camera correction. This agent reviewed its artifacts and assertions independently; it did not rerun the browser or listen to audio.

Environment: headless Microsoft Edge 154.0.4258.62 on desktop with mobile/touch emulation, initial 844×390 viewport at DPR 3, later resized to 390×844, local Next application at port 3040. The test selects Mobile quality initially and Desktop quality for the headlight check. This is not a physical phone. Script intercepts non-GET/HEAD network requests and analytics traffic.

| Behavior | Evidence reviewed | What is verified |
|---|---|---|
| Start and playback | Playing=true, running=true after Start; no radio error | Browser playback state and automatic movement start together |
| Live analysis | Jolt source=live, analysis status active, energy range 0.037–0.196 across 20 samples | Actual captured radio analysis varies in this browser |
| Visible-scene data path | 24 banner instance Y-scale values averaged over eight playing samples substantially exceed settled paused values; paused source=idle and energy=0 | Music analysis reaches actual banner geometry; pause settles its response |
| Camera lifecycle | Six captured camera states all retain Jolt playing=true and source=live | Audio/analysis survive the tested complete camera cycle |
| Cockpit interaction | Projected preset clicked at approximately (640,309), station changes Jolt → NTS 1 | One physical 3D preset accepts a real browser mouse click in landscape |
| Portrait cockpit interaction | Fourth/rightmost preset clicked at approximately (221,541.7), station changes NTS 1 → NTS 2 | The rightmost 3D preset is within the 390×844 viewport and accepts a browser mouse click after the portrait camera correction |
| Ride recovery | Detail pause/close, simulated hide/show and Restart pass | Those tested state transitions resume the automatic ride |
| Automatic loop | Distance advanced to 209.8 through local profile probe, then returns to 4.7 with running=true | Endpoint reset/resume works; not a seamless or full-lap visual proof |
| Portrait dock | 370×112 px bounds at (10,722); no document overflow | Compact dock dimensions in the tested 390×844 layout |
| Reduced-motion dock | Both snapshots contain five identical `scaleY(0.35)` values | Dock EQ remains static over the sampled 700 ms interval |
| Night lighting | Two active SpotLights in Desktop quality/night state | Both desktop light objects are active, not their visual quality or real-device performance |
| Hidden commercial UI | No unsolicited cards at tested distance; unauthenticated preview shows no drawer/ticker/Avenue button | Tested public DOM stays commercially hidden |
| TV mode | Enter removes gate and yields playing=true, running=true | TV-mode browser flow works locally; no receiver/casting hardware validated |

### Important limits and weaker assertions

- **Default Buena Onda, NTS 1 and NTS 2 reported `groove` with “Capture restricted; radio playback unaffected.”** Only Jolt is independently supported as live analysis by this run. Do not generalize that pass to R2/default-radio or every station.
- The screenshot/video can support visual assessment, but this JSON does not measure audible continuity, speaker output, latency, perceived beat alignment, head-unit legibility or every environmental effect. A live analyser and animated geometry alone do not establish musical quality.
- “Physical cockpit preset” refers to the 3D object, **not a physical device**. Both landscape and portrait checks use `mouse.click`, so finger-target usability, exhaustive preset coverage and knobs remain unverified.
- Hidden-tab checks override `document.hidden` and dispatch the event; they validate the visibility handler, not browser background throttling or real OS suspension. `running` assertions generally inspect pause flags rather than tracking several subsequent distance samples.
- The gate isolation test checks a single Tab move does not focus inside `[inert]`. It supports basic isolation, not a complete keyboard/screen-reader audit or focus trap.
- Weapon verification searches visible mesh names against the exclusion pattern. It does not independently identify unlabelled weapon geometry by appearance.
- The manual input assertion checks speed while ArrowUp and A are held. It verifies acceleration removal, not lateral steering behavior by itself; removal of steering listeners is separately supported by code inspection.
- The mobile camera checks exercise one vehicle. Compact bounds do not establish radio readability or touch accuracy in every orientation/vehicle combination.
- The reduced-motion assertion covers the HTML dock EQ only. Broader smoothing/beat suppression is implemented but this browser script does not directly sample pulse bands, decorative sway or camera preference changes.
- No authorization, API enforcement, payment fulfillment, receiver audio, AirPlay, Chromecast, TV hardware or physical Android behavior is established by these checks. Casting/device status remains **BLOCKED — PHYSICAL DEVICE REQUIRED**.

Source concerns documented earlier are historical findings; the ride-resume, automatic-input and dock-layout corrections now have the bounded evidence above. Seamless looping, complete reduced-motion coverage and default-station live analysis remain limitations.
