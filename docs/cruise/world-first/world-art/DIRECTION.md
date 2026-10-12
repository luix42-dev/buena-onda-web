# Scene direction and handoff

Canonical intent: `scene-contract.json` (`world-first-1.0.0`). `sample-contract.mjs` integrates the specified speed profile and returns matching Three/Unreal eye poses. Both rendering and playback owners received the same contract. This is a new fictional coastal city, Bahia Clara; it is not a geography claim about Miami.

## Composition

The opening image must already communicate a large inhabited city. Do not make the viewer wait for the skyline. An elevated road descending 21.6m supplies the long view. Preserve a clear central cone approximately the middle 28% on each side of screen center. Near storefronts can frame the road but remain mostly 6–15m high; set taller facades back. Space palms irregularly rather than as identical pairs. Their silhouette should taper and show separated leaves at 720p.

Use four separate depth responsibilities: tactile road and lamps within120m; a readable street grid and neighborhood mass to750m; distinct tower clusters to2.4km; lower-contrast city terraces to5.5km. The horizon field should occupy at least three quarters of the width at the opening and remain recognizable through the bay reveal. Three memorable landmarks are enough: stepped hotel crown at left, slender split tower near center-right, long low port facade at far right. A hundred equally tall isolated towers will read as a repeated kit rather than a city.

Window variation must reflect rooms and floors: coherent bands of occupied offices, mostly dark apartments, occasional warmer interiors, small roof/service lights. Avoid uniformly spaced, uniformly bright yellow squares across every facade. At long distances combine windows into a few emissive atlases instead of thousands of lights. Lock their randomness to building identity so they cannot shuffle when a segment loads.

## Materials and light

The road needs one consistent metric texture phase, patched roughness and restrained damp streaks. Preserve coarse asphalt detail near the eye. Lane paint should be slightly irregular and brighter under actual lamps, rather than self-lit white ribbons. Use existing Clean Asphalt color/normal/roughness maps and respect their color spaces. Give curbs a shallow bevel so grazing light describes their edge.

Warm fixture pools and shop interiors should coexist with dark facades and cooler sky fill. Light falls off across the road; it should not appear as a circular translucent sticker floating above the slope. Raster reflection captures or broad authored streaks can support the proof, but must be described as approximations. Keep bloom restrained enough that separate lamps and windows remain distinct. Fog separates depth without erasing the city after a few hundred meters. Exposure stays locked across both30-second halves.

On the recorded GTX1060MaxQ6GB laptop, start at1280×720 with raster, at most two local shadow lights and twelve visible actual local lights. Window light is emissive geometry/texture. Limit high-resolution textures to selected near surfaces. These are proposed budgets; render timing, peak memory and quality still require measurements. Do not start a second heavy editor alongside native rendering.

## Camera and media

Horizontal FOV76° becomes vertical47.4484003654° at16:9. Set the correct axis on each renderer: Three PerspectiveCamera uses vertical FOV, while the selected Unreal camera is specified horizontally. Eye position is1.62m above the road, in the first lane to the right of center(+1.75m). World pitch is−1°, yaw and roll zero. Its intention is stable forward driving; no free-look or shake is implied.

The world plate contains the complete roadway but no car, hood, glass or cabin. A hybrid renderer must not draw a second foreground roadway over it by default. A future live cockpit is a separately calibrated compositing layer. Preserve full16:9 content on portrait screens with letterboxing. A raw plate proves scene composition only; the final cabin will occlude its lower portion and must receive another review.

Output samples are frame0 through1799 at30fps. Time60 is an endpoint pose, not a duplicate frame to encode. Split A=[0,30), B=[30,60). Both use one global scene, camera, random seed, traffic and exposure state. Render handles around the30-second split if temporal effects need warmup, then trim by exact frame index. Decoder continuity is measured separately from render continuity.

## Route continuation

The present descent cannot loop: its end is720m ahead and21.6m lower than its beginning. The next segment begins at elevation2.4m, speed10m/s, grade−3%, zero horizontal curvature. Ease grade to zero over120m using the specified cubic grade profile; elevation ends0.6m, above sea−3m. This ensures elevation, slope and grade derivative agree across the join. It does not make the first and last pictures interchangeable.

For a40-minute future journey, author a graph of compatible boulevard, waterfront, neighborhood and elevated connectors. Track persistent landmarks in a common coordinate frame. Reusing facade modules is reasonable; replaying a whole60-second shot forty times is repetition. A 40-minute decoder soak may prove buffer stability while route diversity and spatial continuity still fail. Keep those claims separate.

## Review gate

Review direct images at0/20/40/59 seconds plus adjacent frames around the30-second split. Record whether the central road remains legible, the broad city field persists, near/far motion agrees, facade/window repetition distracts, road-light reflections slide, palms alias, or exposure shifts. Review the two-second movement sample before committing to1800frames. If primitive buildings still look like toy blocks, mark the result as composition/feasibility only; changing the renderer or adding bloom is not evidence of a photographic world.
