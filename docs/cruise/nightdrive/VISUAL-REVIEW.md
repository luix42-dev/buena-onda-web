# Independent Nightdrive image review

Reviewer: `/root/performance`, Codex; exact model variant not exposed. This is an actual pixel review of local artifacts, not a browser interaction test. No browser was launched by this reviewer. Final interface label/start fixes were being handled separately and are excluded from this scene judgment.

## Evidence inspected

All six initial and all six final screenshots were opened and visually inspected:

| Viewport | Initial LA / cockpit | Final LA / cockpit |
|---|---|---|
| Desktop | [LA](initial/desktop-la.png), [cockpit](initial/desktop-driver.png) | [LA](final/desktop-la.png), [cockpit](final/desktop-driver.png) |
| Landscape | [LA](initial/landscape-la.png), [cockpit](initial/landscape-driver.png) | [LA](final/landscape-la.png), [cockpit](final/landscape-driver.png) |
| Portrait | [LA](initial/portrait-la.png), [cockpit](initial/portrait-driver.png) | [LA](final/portrait-la.png), [cockpit](final/portrait-driver.png) |

Also inspected: existing Miami [car-chase.png](../feedback/functional/car-chase.png), plus CPU-extracted founder video frames [2 seconds](reference/founder-2s.png), [8 seconds](reference/founder-8s.png), [14 seconds](reference/founder-14s.png). The Miami comparison is a sunset image against this night lab, so it supports observations about architecture/composition, not a controlled lighting comparison. The founder frames are a cinematic reference, not equivalent game output. The requested YouTube video remains unreviewed.

## Initial to final: genuine gains

- Large luminous facade bands became individual, dimmer windows. The initial stripes competed with the road and car; the final facade treatment is quieter.
- Hard circular street-light pools are largely absent in the final captures. The road reads less like overlapping flat disks.
- Closer LA framing increases cabin presence substantially. In portrait the car occupies roughly 55% of image width, compared with about 20% initially; these are approximate visual estimates, not instrumented measurements. It is closer to the founder's prominent foreground vehicle, though still less immersive.
- Cockpit head unit remains fully visible above the dock in desktop, landscape and portrait. Landscape fine text remains small; the main station display is present. Screenshots do not verify touch operation or audio response.

## Remaining failures and tradeoffs

1. The world still reads as a repetitive corridor of dark boxes. Miami's inspected image has recognizable hotel facades, ocean, palms and open coastal composition. Nightdrive's screenshots do not yet supply an equally distinct place. Coast/neon labels change, but these captures do not establish a convincing visual district transition.
2. LA framing is better but does not cleanly clear the dock everywhere. Landscape hides the rear behind it; desktop and portrait put the rear bumper at or behind the dock boundary. The car remains very dark, weakening the benefit of a larger silhouette.
3. The headlight decal retains a conspicuous straight near edge across the road, especially in LA views. Softer street pools do not remove that rectangular footprint.
4. The founder reference shows a broader open boulevard, sparse practical lights, an elevated view over the cabin and stronger foreground vehicle presence. The lab's constrained corridor still feels less expansive.
5. Still images cannot establish convincing acceleration, seamless chunk replacement, safe-looking overtakes, musical synchronization, frame pacing or sustained stability. Those require the lead's recordings and soak measurements.

## Recommendation

**FAIL migration acceptance — keep Nightdrive isolated.** Final looks better than initial Nightdrive, but it is not a demonstrated visual upgrade over existing Miami. Retain it as a candidate for continuous-road and driving-dynamics research while recordings and sustained tests evaluate those benefits independently. Do not transfer the simplified scene wholesale or describe it as the definitive Cruise experience.

| State | Conclusion |
|---|---|
| Implemented | LA framing trial and quieter facade/light treatment |
| Independently verified | Visible initial-to-final improvements; cockpit radio retained in six final stills |
| Failed | Clear all-viewport LA dock clearance; visual superiority sufficient for migration |
| Pending | Motion, interaction, audio-driven effects and sustained performance evidence |

## Corrected five-minute journey: sampled motion and matched night comparison

Independently opened all six unretouched extracted frames [pass-01](comparison-lab-recovery/pass-01.png), [pass-02](comparison-lab-recovery/pass-02.png), [pass-03](comparison-lab-recovery/pass-03.png), [pass-04](comparison-lab-recovery/pass-04.png), [pass-05](comparison-lab-recovery/pass-05.png), [pass-06](comparison-lab-recovery/pass-06.png), supplied from roughly 175–200 seconds of the corrected recording. Also inspected [Miami at 30 seconds](comparison-miami/at-30s.png) and [corrected lab at 30 seconds](comparison-lab-recovery/at-30s.png). Both comparison images show night/chase; the lab results identify desktop Edge 154.0.4258.62, 1440×900, Mobile quality. Roads and vehicle locations differ, so these are comparable conditions rather than identical compositions.

The pass frames show the hero initially right of the lane divider, then in the left lane with a slower car ahead to the right, and later back to the right. No sampled frame shows the hero intersecting traffic, leaving the road, or the camera entering the body. A different adjacent vehicle is visible on the left in the last frame, spatially separate from the hero. These snapshots support a recognizable passing sequence and preserved chase framing. They **cannot prove** smooth acceleration, uninterrupted clearance between samples, absence of transient clipping, seamless chunk replacement, or continuity across the full video. The full recording was not watched by this reviewer.

The sequence adds evidence absent from the earlier stationary captures: a recognizable open coastal stretch with water and palm silhouettes transitions into buildings on both sides. This qualifies the earlier district criticism: coast versus enclosed city is visibly distinguishable now. However, palms resemble flat angular crowns and buildings remain plain boxes; the transition demonstrates layout variety rather than polished district identity.

The matched night images strengthen the relative verdict. Miami has articulated shopfronts, signs, layered hotel facades, fuller palms, ocean highlights and road reflections. Nightdrive is less cluttered and shows an open coastline, but its sparse flat materials, black road and simplified silhouettes still look like a prototype. **Miami remains visually stronger; do not migrate the lab scene.** Potential advantages in long-distance continuity and passing are separate from this visual-quality judgment.

Read [corrected 300-second state](comparison-lab-recovery/at-300s.json): longitudinal parameter 4,448.80 m, odometer 4,462.15 m, speed 17.80 m/s, two completed overtakes, minimum recorded overlapping-lane center gap 30.93 m. This confirms recovery from the pre-fix speed-matched following state in the instrumented run; gap is simulation telemetry, not independently measured physical clearance. The 30-minute soak was still running at this review, so these findings do not establish its outcome. Radio playback telemetry is separate from silent third-party-radio footage and the separately generated ambience recording.
