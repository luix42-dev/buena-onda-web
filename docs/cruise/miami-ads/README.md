# Countach and geographically persistent advertising

Recommendation: **PARTIAL overall; PASS for Countach/radio and companion-cue functionality.** Countach interaction checks pass on desktop and portrait. Advertising cues pass for all three cars on both viewports, including the targeted Cadillac portrait retest under the explicitly separate partial-face HUD policy. Final desktop cockpit performance improves but remains below the 50–60 FPS target.

Open [the screenshot gallery](review.html), [final raw results](after-results.json), [Countach visual results](countach/visual-results.json), [before measurements](before-results.json), and [Countach before optimization](countach-before-optimization-results.json). All captures come from the running Cruise; the garage thumbnail is a screenshot of its actual licensed model.

The first car is Randomness's [Countach 5000 QV](https://sketchfab.com/3d-models/lamborghini-countach-5000qv-2f02b54e01fc428e8b19759c5970f882), freely downloaded under CC BY 4.0: original native body and interior, 22 converted textures, 175,061 triangles, approximately 16.24 MB converted GLB. [License and attribution](../../../public/real-miami/vehicle/countach-1988/LICENSE.txt) are preserved with the asset. The Fiero and Cadillac remain selectable. The Wrangler assets remain preserved separately. This test does not demonstrate Unreal or Google imagery integration.

## Verified desktop functionality

The three cars display an authentic geographically associated cue on desktop, retain the same audio owner and playing station across selection, and suppress that cue during radio closeup. Countach native presets, seek, volume, power off/on and live FFT pass on both viewports. Dismissal persists locally for the placement, garage suppresses ads, all garage images load, and no JavaScript page errors occurred. Separate desktop and portrait Countach visual review passed: native body/interior, complete radio display, both knobs, four presets and spectrum clear of the original gear lever.

Clicking the native ad anchor opened the real local `/radio` page with HTTP 200 and actual page content. The link uses `target="_blank"` and `noopener noreferrer`; the original Cruise retained its audio owner and playing station. No purchase, form submission, production write or deployment occurred.

The final moving Ocean Drive driver passes measured **zero strict world-readable continuity** on both viewports. Desktop observed one live cue sample and 21 “Just passed” samples; portrait observed three live and 22 “Just passed” samples, with the cue expired by the end. Earlier chase-camera evidence recorded 3.516 seconds of geometrically readable continuity; that does not establish cockpit readability. These are house campaign tests, not paid impression or billing evidence. The parked final HUD points correctly recorded zero billable world exposures; a readable HUD invitation does not imply a readable world sign.

## Actual optimized measurements

Actual headless Edge with D3D11 GPU, desktop 1280 x 720 and portrait emulation 390 x 844; 20 one-second render-loop FPS samples per camera during automatic driving at the same Colony approach used for the original baseline. RAF intervals were independently collected during these windows.

| Build/car | Camera | Mean FPS | Minimum FPS | Samples below 30 | RAF mean / p95 / max ms |
| --- | --- | ---: | ---: | ---: | --- |
| Before / Wrangler | Driver | 59.97 | 59.04 | 0/20 | Not collected |
| Before / Wrangler | Chase | 60.04 | 59.97 | 0/20 | Not collected |
| Before optimization / Countach | Driver | 39.67 | 3.33 | 4/20 | 30.74 / 50.10 / 383.20 |
| Before optimization / Countach | Chase | 47.51 | 31.12 | 0/20 | 20.87 / 33.50 / 100.00 |
| Final desktop / Countach | Driver | 47.80 | 31.86 | 0/20 | 20.52 / 33.40 / 66.60 |
| Final desktop / Countach | Chase | 56.50 | 49.61 | 0/20 | 17.60 / 33.30 / 49.90 |
| Final portrait / Countach | Driver | 58.81 | 38.85 | 0/20 | 16.72 / 16.80 / 33.30 |
| Final portrait / Countach | Chase | 59.92 | 59.02 | 0/20 | 16.67 / 16.80 / 33.30 |

The primary vehicle changed from the original Wrangler, so that comparison cannot isolate advertising overhead. The two Countach runs preserve the same vehicle and viewpoint: BVH acceleration improves driver/chase performance and removes the sampled below-30 drops. Final desktop cockpit still misses the 50–60 target. These measurements precede the final HUD-only eligibility adjustment; the world, vehicle geometry, lighting, cameras and strict measurement rays remain unchanged. These short windows do not prove long-session or physical mobile performance.

Initial ready latency was 2.739 seconds desktop and 1.457 seconds portrait on an unthrottled local connection. The actual Countach GLB resource transferred 12,290,217 bytes in 866.9 ms desktop / 485.2 ms portrait, decoding to 16,243,344 bytes. Both isolated contexts recorded nonzero full transfer sizes; the local server and OS were already warm. This is a local-load observation, not a simulated cellular benchmark. Actual cumulative ad measurement CPU averages after the driver/chase windows were 3.56/3.91 ms desktop and 2.15/2.89 ms portrait; observed maximums were 65.6 ms desktop and 34.6 ms portrait, including startup. BVH build totals were 156.6 ms desktop and 69.3 ms portrait.

The [actual before/after ray comparison](ray-comparison-results.json) matches all 11 comparable parked desktop samples, including seven genuinely blocked samples: unchanged occlusion, visibility, viewability, readability and first-hit mesh/material/probe identities, with zero measured first-hit distance differences. Private BVHs accelerate exact intersections rather than replacing occlusion with invented visibility. The [MIT notice](../../../public/real-miami/miami/advertising-bvh-LICENSE.txt) is included for `three-mesh-bvh`.

## Caught issues and limits

The first five-ray occlusion check incorrectly qualified a headline partly hidden behind a Wrangler pillar. [The negative screenshot](first-pass-occluded-wrangler.png) and [initial raw results](after-first-pass-results.json) remain available. Ten probes through the headline band replaced that check. Actual opaque pillars and foliage still block qualification.

Fiero native transparent glass incorrectly behaved as an opaque obstruction. [Actual hit diagnostics](probe-results.json) identified its untextured `Glass` material with opacity 0.709 and disabled depth writing. The correction excludes that narrow transparent-glass case while preserving opaque cabin geometry. [The corrected screenshot](glass-fixed-fiero-cockpit.png) is retained.

World exposure requires strict current visibility/readability and two seconds of continuous qualification. The discreet HUD uses a distinct actual-presence threshold: visible clipped face, at least 64 x 24 pixels, facing at least 0.35, projected area at least 0.003, and at least half the geometric headline probes unobstructed. It requires 750 ms of continuous presence, then retains only an actually observed placement for six seconds with “Just passed.” This permits a legible companion link for a partly visible world sign, while its strict world exposure remains unqualified. HUD clicks and world clicks remain distinct. Dismissal is component-local and creates no tracking identifier.

The [full combined run under the earlier HUD policy](after-bvh-original-hud-results.json) exits **1** for Cadillac portrait cue absence: fifty approaches produced genuine opaque native blockers (`Object_3` / `Meshescaddy1Mtl`, and `Object_5` / `Meshescadillacbasea0041Mtl`) or clipped framing. [The no-cue screenshot](after-390-cadillac-no-cue.png) and raw candidates are preserved. The native camera/geometry and strict billing thresholds were retained. The final HUD-only policy explicitly distinguishes partly visible face presence from world readability. [The targeted Cadillac portrait retest](cadillac-portrait-retest.json) exits **0**: actual partial face and readable HUD, strict world `viewable=false` / `readable=false`, no added world exposures, preserved radio and genuine destination popup. [Its screenshot](after-390-cadillac-cockpit-ad.png) visibly shows the clipped world sign and separate readable companion cue.

[The final-policy actual expiry test](expiry-results.json) exits **0** on both viewports: 6,187.0 ms desktop and 6,118.3 ms portrait, truthful “Just passed,” no cue remaining, and preserved playing radio. This paused diagnostic relocation test is separate from the natural moving pass.

Hidden exposure suppression is **UNVERIFIED** in this automation environment. [The final actual visibility test](hidden-results.json) observed a genuinely readable chase-camera sign and active cue, then minimized only its own headed Edge window and tried an actual foreground/background tab transition. `document.hidden` remained false, so the required hidden condition never occurred. Its suppression checks exit **1** for an unmet test prerequisite; that does not establish an application exposure defect, and it is not claimed as a PASS. [The earlier attempt](hidden-first-attempt.json) is retained too. Browser emulation cannot establish physical mobile performance, TV performance, or human legibility in every scene.

The native La Sala Chromecast session remained untouched. Picture and radio on the actual TV were confirmed by the user; this advertising test does not independently measure its latency or frame rate.

## Reproduce

Set `CRUISE_TEST_URL=http://127.0.0.1:3066` and run `node scripts/real-miami-route-proof.mjs --ads --performance`. The isolated automated Edge context does not operate the user's native casting browser. Separate `--expiry` and `--hidden` modes test real expiry and actual document visibility; neither substitutes mocked visibility for a hardware observation.

The focused final-policy regression is `node scripts/real-miami-route-proof.mjs --ads --cadillac-portrait`. The original combined run's historical exit **1** is preserved independently of this targeted final-policy exit **0**. Optimized production build and TypeScript checks passed in the orchestrator; no production deployment occurred.

## Orchestration

The existing team handled this experiment: /root integrated and made final decisions; /root/cruise_visual_review acquired and adapted the exact licensed Countach and reviewed its cameras; /root/miami_hero_depth implemented geographic advertising and exact occlusion acceleration; /root/miami_depth_baseline measured browser behavior and performance. No distinct model overrides were used.
