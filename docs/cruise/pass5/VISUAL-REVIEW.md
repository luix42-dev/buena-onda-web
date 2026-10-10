# Pass 5 independent visual review

Reviewer: `/root/qa_security`, sequentially assigned Agent A Visual Director after Agent E review. Exact model identifier unavailable. Date: 2026-10-10. No browser launched or application file edited by this reviewer.

## Evidence inspected

Actual PNG pixels inspected with view_image, not inferred from code:

- before/original-portrait-chase.png
- before/original-portrait-driver.png
- before/original-landscape-chase.png
- before/original-landscape-driver.png

These are Original daytime captures. Original has day/night, not an equivalent sunset switch or user quality control. Sunset comparisons must be marked unmatched. Screenshots establish static composition only, not audio reactivity, frame pacing, touch operation or seamless looping.

## Preliminary Original findings

The Original has a readable coastal composition: pastel building frontage on one side, clear ocean on the other, and a curved road that creates more depth and anticipated movement than a straight corridor. The Jeep proportions read plausibly and its dark trim separates it from the pale city. The environment is calm and restrained.

In the two driver captures, the bottom music and camera controls are extremely faint. Whatever the cause of the fade, these frames do not show a clearly usable radio interface. The nearby-place card competes with the dashboard in landscape. The cockpit radio is physically visible in both orientations, but its labels are tiny in landscape. Portrait dedicates much of the lower image to steering wheel, seat and legs while narrowing the street. The captured street feels sparse and uninhabited.

## Scorecard status

Comparative scores are pending paired Miami evidence. No score is assigned solely because a feature exists in source. The ten dimensions to evaluate are visual appeal, Miami atmosphere, music visualization, cockpit, driving illusion, vehicles, environment, interface, performance and lean-back appeal. Music visualization, driving continuity and performance require temporal or measured evidence beyond these four stills.

## Highest visible concerns so far

1. Original bottom controls are hard to see in the driver screenshots.
2. Original landscape physical radio is small relative to its product importance.
3. Original nearby-place overlay competes with the cockpit and landscape scene.
4. Original portrait driver framing spends substantial space below the dashboard.
5. Original street population and coastal activity appear sparse.

These are not yet the top five Miami weaknesses; those require the Miami pair. Retain/adapt the Original curved-road composition and quiet building/sea balance if the experimental version loses them. Do not change the Original route.

## Live Miami mobile pair inspected

Inspected actual before/live-portrait-chase.png, live-portrait-driver.png, live-landscape-chase.png and live-landscape-driver.png. These show Miami SUNSET versus the Original DAY screenshots above. This is a default first-impression comparison, not matched lighting. No local Pass 5 after image has been inspected yet.

Miami is immediately more distinctive: warm pink sky, glowing ocean, turquoise and coral buildings, visible traffic and pedestrians, bold radio typography. The scene looks inhabited and intentionally art directed. The Original is quieter, with more breathing room and a more natural curving coastal composition. Neither looks photorealistic.

The most serious visible regression is cockpit obstruction. In Miami landscape the automatic Buena Onda Record Store card sits directly over the head unit. In portrait the same card covers most of the dashboard. A second large radio chip plus detached previous/pause/next buttons cover the bottom of the car. Clearer type than the Original does not compensate for obscuring the physical radio, the product's focal point.

### Provisional static scorecard (1–10 judgments, not scientific measures)

| Dimension | Original | Live Miami | Evidence and limits |
|---|---:|---:|---|
| Visual appeal | 6 | 7 | Miami has a stronger designed identity; Original has calmer composition. Defaults use different lighting. |
| Miami atmosphere | 6 | 7 | Miami gains sunset, Deco color and activity; Original conveys a quieter beach road. Not matched time of day. |
| Music visualization | N/A | N/A | Stills cannot establish reaction to music. |
| Cockpit | 6 | 3 | Original radio visible but small; Miami radio blocked by store card and interface. Functionality not independently tested here. |
| Driving illusion | N/A | N/A | Road composition favors Original, but continuity and smoothness require temporal evidence. |
| Vehicles | 6 | 5 | Original Jeep reads proportionately; Miami hero has personality but conspicuous flat/chunky surfaces and toy-like distant traffic. Limited views. |
| Environment | 6 | 7 | Miami has more detail and activity, offset by oversized promotional signage and a dense distant tower wall. |
| Interface | 5 | 4 | Original fades too far; Miami labels are legible but occupy far more scene area in multiple disconnected groups. |
| Performance | N/A | N/A | No measurement supplied to this reviewer yet. |
| Lean-back appeal | 6 | 5 | Static visual judgment only: Original is calmer; Miami promotional card and persistent oversized UI interrupt immersion. TV mode not shown. |

### Five most noticeable Live Miami weaknesses, ranked

1. Store card blocks the head unit in landscape and the dashboard in portrait. Highest confidence, highest impact fix: prevent unsolicited expansion during cruising.
2. Separate top camera/time/TV controls, bottom radio chip and transport buttons split attention and reduce the view. Consolidate into a compact responsive dock.
3. Giant billboard, bridge banner and repeated flags compete with the atmosphere even while commerce is hidden. Reduce visual competition before adding any monetization affordances.
4. Oversized floating vinyl chip duplicates the physical radio and overlaps the car. Preserve clear station/track information in the consolidated dock.
5. Strong pink/orange wash flattens car/building materials; traffic silhouettes look toy-like. Keep sunset identity but seek material separation and simpler, better vehicles.

Retain Miami's warm ocean, recognizably tropical street, local color and visible music identity. Adapt Original's breathing room and coastal framing. The live experimental screenshots do not establish overall superiority as a music visualizer.

## Local integrated Pass 5 inspected, before final targeted refinements

Inspected before/local-portrait-driver.png, before/local-landscape-driver.png and before/local-desktop-chase.png. These are actual local Next.js frames, not the old Vite harness. They are still default sunset and therefore not lighting-matched to Original day.

The difference from live Miami is substantial. The physical head unit is clearly in frame in both mobile orientations. A single bottom dock replaces the separate chip and transport controls; camera, atmosphere, volume and cast are grouped with the music. No store card obscures these particular captures (absence in one frame is not proof it cannot appear later). Desktop retains much more space for the ocean and street, with a shallow dock that reads as a music player. The work moves the experience toward the stated music-first product.

Provisional local static scores: visual appeal **7**, Miami atmosphere **7**, cockpit **7**, vehicles **5**, environment **7**, interface **7**, lean-back visual appeal **7**. Music visualization, driving illusion and performance remain **N/A** for this screenshot reviewer. This is an improvement over live Miami's cockpit **3** and interface **4**, and stronger than Original's cockpit **6** and interface **5** in the captured states. Functionality, sustained motion, touch accuracy and receiver playback need separate evidence.

Remaining visible priorities are now: compact the tall portrait dock (roughly one-sixth of the captured view), ensure a place card cannot automatically cover the radio later, reduce the visual dominance of promotional street signs, soften the uniform warm material wash, and improve vehicle surface detail without adding geometry indiscriminately. Original retains a calmer, less promotional coastal composition. Final refinement screenshots remain to be reviewed.

## Final mobile refinement review

Independently inspected after/local-portrait-chase.png, after/local-portrait-driver.png, after/local-landscape-chase.png and after/local-landscape-driver.png. Relative to the first local integration, the portrait dock is visibly reduced from three rows to two and the redundant vinyl icon is gone. It occupies approximately 13% rather than 17% of screenshot height; these are visual estimates, not DOM measurements. Physical radio framing is preserved. Landscape presents the entire head unit above the compact dock, without the live version's obstructing shop card.

The live-to-final improvement is clear in the actual pixels: visitors can see the radio and control music from one coherent place. Sunset warmth, ocean glow and scene density remain. This set contains no nighttime pair, so it cannot establish that the cheaper Mobile lighting preserves the nighttime look. Lead-reported 30/30 functional checks are supporting evidence from a separate check, not interactions personally verified by this screenshot reviewer.

Final mobile static judgments remain visual appeal **7**, Miami atmosphere **7**, cockpit **7**, vehicles **5**, environment **7**, interface **7**, lean-back visual appeal **7**. The smaller dock improves an already improved layout without justifying artificial score inflation. Original still has calmer road composition; final Miami wins radio prominence, legible controls and intentional visual identity in these frames. Matched daytime comparison remains pending.

### Remaining five visible deficiencies

1. Large billboards and the overhead event banner still dominate a commercially dormant experience.
2. Landscape branding occupies substantial upper-left space, competing with the coast.
3. Vehicle material/detail reads as simple stylization; the hero's almost blank rear face is particularly toy-like.
4. The warm light wash reduces material separation across peach road edges, cars and architecture.
5. Long music titles truncate; icon-only mobile controls have less immediate discoverability than text labels. Accessibility labels and touch operation require separate functional evidence.

## Night lighting A/B and final desktop

Inspected night-profile/baseline-1440x900-0-lights.png versus baseline-1440x900-1-decal.png at the same framing, plus functional/desktop-quality-night.png and after/local-desktop-driver.png. Decal-only lighting retains the forward road patch, horizon direction, blue coastal palette and glowing cockpit radio. It makes the right-side facades and palms dramatically darker. This is a genuine visual compromise, not equal quality. It is reasonable for Mobile only if the measured performance gain warrants it; Desktop's full illumination should remain. The Desktop-quality screenshot shows the brighter facade and beam appearance retained.

A visible minor inconsistency remains: the rear-view mirror displays an orange sunset gradient at night (and later in the matched daytime captures). This is a stylized texture rather than a believable reflection.

The final Desktop sunset cockpit has balanced dashboard/street coverage, a shallow dock and an unobstructed head unit. Clarification on previous mobile wording: portrait exposes the head-unit display clearly, but its right enclosure and knob are cropped at the viewport edge. Landscape shows the complete unit. A small rightward portrait-only reframe is justified; do not describe the current portrait assembly as fully in frame.

## Matched daytime review

Inspected all six matched-day/local-{portrait,landscape,desktop}-{chase,driver}.png images and Original Desktop chase/driver frames in before/, together with previously inspected Original mobile daytime frames. Both routes are now Day, with corresponding chase/cockpit views and the requested viewport classes. Route geometry, vehicle model and quality controls differ, so this is matched intent rather than identical rendering configuration.

Matching time of day narrows the visual lead. Original has stronger asphalt texture and material contrast, a more convincing Jeep exterior, and a quiet curving beach road. Local Miami's daylight is brighter but sometimes washed out; its blank hero rear and large signs are conspicuous without sunset color. Miami still has more street life and a much clearer music interface. The local UI/cockpit improvement is real independently of the sunset option.

| Dimension, matched daytime stills | Original | Final local Miami | Judgment |
|---|---:|---:|---|
| Visual appeal | 6 | 6 | Original texture/composition offsets Miami detail and identity. |
| Miami atmosphere | 6 | 6 | Original calm coast versus Miami populated Deco street; sunset unavailable on Original is a separate feature advantage. |
| Music visualization | N/A | N/A | Requires temporal evidence. |
| Cockpit | 6 | 7 | Miami radio has prominence and legibility; portrait right knob still clipped in these captures. |
| Driving illusion | N/A | N/A | Motion not scored from stills. |
| Vehicles | 6 | 5 | Jeep reads more convincingly than simple convertible rear. |
| Environment | 6 | 7 | Miami has activity/detail; promotional signage remains too dominant. |
| Interface | 5 | 7 | Final coherent music dock is clearer and less fragmented. |
| Performance | N/A | N/A | Use separately measured report. |
| Lean-back visual appeal | 6 | 6 | Music UI advantage versus Original's calmer view; real TV use not tested. |

Recommendation from visual evidence alone: **KEEP IMPROVING**. Final local Miami is clearly better than live Miami in cockpit/UI and is more deliberately music-centered, but matched daytime visuals do not establish unmistakable overall superiority over Original. Retain the final dock and radio emphasis; improve materials/vehicle detail and reduce promotional visual dominance before adding features. Security and performance gates belong to the lead's combined verdict.

## Portrait framing correction verified

Reopened the refreshed after/local-portrait-driver.png after the lead's lateral camera adjustment. **PASS:** the complete head unit, both knobs and all four preset buttons are now inside the viewport with room at the right edge, clear of the dock. The steering wheel is now mostly cropped at the left edge; that is an explicit and appropriate tradeoff for the music-first product. The road remains readable. This supersedes the earlier portrait clipping finding; the earlier image did not show the full assembly. Actual pointer interaction with the rightmost preset remains the lead's functional check, not a claim from this still.
