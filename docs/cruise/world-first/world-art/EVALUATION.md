# Independent visual evaluation

Reviewed 2026-10-11 EDT (capture folder dated 2026-10-12 UTC). Reviewer `/root/world_art`, configured `gpt-6-astra`; did not implement these browser scenes. This is a qualitative review of the actual images linked below, not a new performance test, full-video screening or physical-device test.

**Finding:** none of the three inspected browser baselines matches the founder's combination of an intimate warm cabin, cool descending road and immense inhabited city. Original Cruise already has stronger near-world surface/palm/facade detail than Jeep Night. Miami has the strongest authored color mood of these baselines, although the inspected image is sunset and chase view. A new native scene must demonstrate a visual improvement; Unreal branding does not satisfy this gate.

## Images and limits

- [Founder frame04](../../cinema/reference/frame-04.png), previously inspected with the [full contact sheet](../../cinema/reference/contact-3s.jpg). Low resolution, compression, glow and stylization prevent a claim of physically correct or pixel-photographic surfaces. The useful reference is its emotional composition and scale.
- [Actual Original Cruise drive](../qa/baseline/2026-10-12T02-46-23-129Z/originalCruise-desktop/drive.png): nighttime chase image from the published route. It is not a matching driver-eye comparison.
- [Actual Miami SUNSET STUDY](../qa/baseline/2026-10-12T02-46-23-129Z/miamiTest-desktop/failure.png): the published scene is visibly loaded, with Cruise start control present. `failure.png` names a harness timeout. Its result records no page errors and successful model responses; the lead identified a selector mismatch. Do not call this image an application rendering failure or claim an entered-drive test passed.
- [Actual Jeep Night cockpit](../../../../../cruise-jeep-live-20261011/docs/proof-live/desktop-cockpit.png): prior live capture supplied for review; this agent did not recapture it. Its visible speed/UI are not independently verified motion or audio measurements.

## Twelve criteria

| Criterion | Founder reference | Original Cruise | Miami SUNSET STUDY | Jeep Night |
|---|---|---|---|---|
| 1. Sense of inhabited metropolitan scale | Broad dense light field extends across the horizon. | Road recedes into a sparse, hazy horizon; city scale is limited. | Several far towers suggest a district; most of the horizon is sky/sea. | Distant city field is absent; repeated roadside blocks dominate. |
| 2. Road composition and descent | Strong downhill boulevard draws the eye into the city. | Clear curving coastal road, visually near level in this frame. | Strong straight avenue perspective, visually near level. | Clear narrow center line, almost level and very dark. |
| 3. Depth separation | Near palms/traffic, middle streets and far light carpet read distinctly. | Detailed foreground and hazy distance work, but middle/far urban density is thin. | Traffic, frontage and towers create several planes; haze helps separation. | Near blocks and repeated poles recede without a rich distant layer. |
| 4. Architecture and silhouette variety | Dark framing buildings leave room for the vista. | Visible balconies, roof trim, shop glazing and several facade treatments. | Deco bands/storefronts add identity; large planar walls and repeated towers remain obvious. | Cuboid facades and regular bright rectangles are conspicuously simple. |
| 5. Night occupancy and window treatment | Many small varied light sources suggest an active city. | Most near facades are dark; little visible lit urban fabric. | Day/sunset image cannot establish nighttime window quality. | Large flat window rectangles look uniformly graphic. |
| 6. Warm cabin / cool exterior relationship | Amber instruments and hands contrast strongly with teal road and night. | Chase framing does not establish cabin warmth; exterior is subdued blue-gray. | Warm sunset saturates the whole image; no night warm/cool cabin comparison. | Warm gauges/radio contrast with violet exterior, but cabin surfaces are mostly black. |
| 7. Road material and reflected light | Glossy highlights reinforce movement and atmosphere, with stylized streaks. | Visible asphalt grain and curb tiles give tactile detail; road is mainly matte. | Broad warm reflection and fine asphalt read clearly, though highly art-directed. | Road is nearly featureless black with simple light pools and center marks. |
| 8. Palms and roadside silhouettes | Irregular dark crowns bracket the road. | Textured separated fronds/trunks read as palms. | Detailed palm crowns and varied nearby props provide character. | Thin poles and flat sparse crowns read as diagrammatic palm symbols. |
| 9. Coastal identity | Palms and broad urban vista; water is not established by this sampled frame. | Ocean and promenade are clearly visible on the right. | Ocean, low sun and promenade clearly anchor the left side. | Dark open left area has little readable water detail. |
| 10. Framing and intimacy | Driver-eye hands, wheel, hood and gauges occupy a substantial foreground. | Chase framing feels external; cabin intimacy is untested here. | Elevated chase framing displays the vehicle and street; different emotional viewpoint. | Driver-eye cabin establishes intimacy, but thick frame/mirror and dashboard obscure much of the view. |
| 11. Contrast, color and atmosphere | Warm/cool separation, dark framing and bright city produce a memorable mood. | Restrained but somewhat uniformly gray; little luminous night energy. | Strongest deliberate palette among the baselines; very saturated pink/gold and illustrative. | Violet sky is much brighter than the road; city lacks nuanced local illumination. |
| 12. Motion, continuity and long-session credibility | Contact sheet supports repeated compositions; stills cannot prove a seamless drive. | This still does not establish temporal stability or route continuity. | Pre-start frame cannot establish drive motion. | Visible25km/h is UI evidence only; this still cannot validate motion or endless continuity. |

## Native world gate

The first actual native [opening frame](../unreal/frames/initial/frame-00s.png) was subsequently supplied and directly inspected. **Native art gate: FAIL; raster feasibility is demonstrated, the requested visual quality is not. No60-second film approval.**

The image has a wider lit skyline than Jeep Night, a coherent central road and visible warm lamp pools. However, the city reads as an isolated band of cuboid towers on a flat horizon. The road is predominantly featureless black, shoulders are empty, and much of the upper image is uniform dark sky. The reference's illuminated urban carpet, intervening neighborhood depth and close dark palm/building framing are absent. Existing Original Cruise has more convincing visible asphalt/palm/facade detail than this first native frame. The native lamp bloom is already strong; increasing it would not solve the composition.

Three refinements were sent directly to the native director, in priority order:

1. **Create the elevated city vista.** Test an opening road elevation around72m and4.5%descent, with camera world pitch around−3°. Elevate road, curbs and fixtures consistently while keeping the city below. Lower most nearby/middle buildings to6–25m and retain a few40–90m landmarks; populate intervening ground with low-rise neighborhoods and cross-street light traces. These are proposed trial values derived from the image, not measured reference geometry. Record any adoption in a revised contract and render metadata; it would not match v1.
2. **Give the road a readable material response.** Apply the existing cleared asphalt color/normal/roughness maps, restrained cool fill and patchy dampness. Recover lane surface detail and grazing reflections without turning the road into a glowing plane. Retain the useful warm fixture pools.
3. **Frame the vista with near objects.** Add a sparse6–12palms and2–4low facade masses within20–100m, keeping the center open. This should establish near scale and motion cues while avoiding the previous canyon of tall boxes.

Review actual opening/middle/late frames for a broad inhabited horizon, consistent downhill perspective, coherent near/middle/far depth, recognizable varied architecture and restrained road-light response. A wall of boxes with equally spaced emissive squares fails the intended art improvement even if frame rate is acceptable. The world-only proof cannot yet establish the final cabin/world emotional balance; that needs a separately calibrated cabin composition later.

After stills pass, inspect the short motion sample for near/far motion agreement, aliasing, sliding reflections, abrupt exposure and boundary discontinuities. Only then consider the60-second film. Report renderer feasibility, visual quality and continuity as separate outcomes.

## First refinement review

Directly inspected [refined opening frame](../../../../.vercel/world-first-unreal/runs/20261011-225448/refine/frame-00s.png). **Art gate remains FAIL.** New bright terrace rows form a close box canyon and occlude more of the broad city view than the initial image. Their large uniformly graphic windows compete with the road. Road detail in the lamp pools appears as a checkerboard.

A narrow read of the actual run log established a concrete road implementation error: `UnrealEditor.log:1805` reports `M_Asphalt` failed compilation for `PCD3D_SM5` and falls back to the default material; the compiler says `(Node ComponentMask) Missing ComponentMask input`. Therefore the visible checkerboard is not a valid judgment of the cleared asphalt texture. The director was sent the failed WorldPosition-to-ComponentMask connection in `refine.py` and asked to verify material connection success and fresh compile errors before capture.

For the next bounded correction, hide the new terrace batches, elevate the complete road group consistently to approximately72m opening altitude, retain the lower city, and pitch the camera−3°. If near framing is added again, start with at most2–4dark forms4–8m high and at least15m from the centerline, with much weaker window emission. Inspect one opening image before generating a new full set. These are recommendations pending actual corrected imagery, not evidence of an improved result.

## Final bounded vista review

Directly inspected the actual [vista opening](../unreal/frames/vista-revision/frame-00s.png), originally supplied from `.vercel/world-first-unreal/runs/20261011-230451/frame-00s.png`. The raised roadway and removed terrace canyon improve the composition: the city is now visibly below the roadway, spread across more of the lower horizon. **Final visual gate remains FAIL.** This is a useful direction/renderer proof, not a near-photographic scene or accepted60-second film.

The largest structural art blocker is the missing continuous inhabited middle ground. The roadway feels detached above a field of emissive windows; there is no clearly readable terrain, neighborhood/block layout or crossing street network connecting it to the city. Roofs and facades remain simple shapes largely lost in darkness. The foreground is still mostly black, with repeated amber lamp pools and little convincing cool road response. The image does not yet convey the founder's descent through a vast inhabited landscape. Removing the canyon helped; it did not supply that landscape.

Recommended next production step: author one150–250m environment slice connecting road, terrain and low-rise neighborhood, using a small set of suitably textured facades, recognizable irregular palms, curbs and varied street/interior illumination. Place this slice against the broader city field, then review its foreground-to-distance relationship at the locked camera. Prioritize material/light variation and connected urban structure over additional generic towers or stronger bloom. This requires an environment-art pass, not another camera-height adjustment. No additional look iteration was requested in this bounded review.

The requested two-second MRQ sample may test render/export/browser feasibility and reveal temporal defects. It must be labeled a diagnostic. Its successful completion would not overturn the still-image art failure, validate a60-second film, or prove a40-minute unique journey.
