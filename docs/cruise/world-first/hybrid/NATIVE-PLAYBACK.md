# Actual native motion checkpoint

Status: **native rendering and encoding verified; photographic art quality FAIL; hybrid optical/lighting quality unverified**. This is a two-second technical checkpoint. The60-second design remains undelivered.

The engine director produced actual frames `world-first.0000.png` through `world-first.0059.png` in `.vercel/world-first-unreal/runs/20261011-230451/render/frames/`. All60PNG headers were checked as1920x1080, and their SHA256 hashes are recorded in [native-manifest.json](native-manifest.json). Total source PNG bytes:97,481,942. PNG output is display-referred; no linear EXR archival master was produced.

The native success report records58.031seconds elapsed and render start28.906seconds. Their difference is29.125seconds for render completion including warm-up. This is not a stable per-frame GPU timing or a measured60-second render cost.

## Encoded result

| Clip | Source frames | Actual decoded count | Duration | Bytes |
|---|---:|---:|---:|---:|
| native-2s-a.webm | [0,30) |30|1.000s|1,270,137|
| native-2s-b.webm | [30,60) |30|1.000s|1,260,708|

Total encoded bytes2,530,845. Both clips are actual1920x1080VP8/WebM at30fps with no audio. Encoder and validation completed in5.059seconds on the existing local tools. The frame/duration/resolution/fps/audio checks inspect actual encoded output; they do not rely only on the intended trim recipe. There are no duplicate source-frame handles at the join and no last-to-first loop approval.

The root public manifest now contains the clips in `unreal` and `hybrid`, with actual poster `native-2s-poster.png`, exact media provenance, and `qualityAccepted:false`. This preserves the separate founder diagnostic entry. `native-2s-camera.json` contains only the60rendered frame poses plus the unrendered2-second connector; the1800-frame sequence asset is not presented as a rendered movie.

## Actual camera and hybrid

The director's corrected scene records opening elevation72m, road grade4.5%, horizontal FOV76degrees, eye1.62m above road, lateral position1.75m, and world pitch−3degrees. These differ from the initial v1 intent. The camera pose sample is the authority for this film. The browser candidate adopts the actual FOV/pitch/eye and keeps `verified:false`; its nominal runtime speed is the measured first-frame station increment10.000022m/s. It does not reconstruct all per-frame lighting or vehicle suspension.

The native optical parameter contract and browser coordinate conversion are verified against those actual samples. That agreement is separate from the unverified pixel registration, lighting/reflection and perceptual foreground integration; the combined hybrid calibration flag remains false.

The native plate includes a baked road but no baked cockpit, hood or hands. Its whole image is preserved. The competing hybrid overlays the existing realtime Jeep only; the optional near-road replacement remains disabled. This directly avoids the older rearprojection's unsupported photographed-road replacement, but it does not establish material/lighting/reflection continuity.

The hybrid Canvas runs continuously only while the video reportsplaying and the user has not paused. Loading, buffering, pause, end, error and unavailable states use demand rendering, so a completed two-second diagnostic does not keep drawing at60Hz.

## Visual evidence so far

Independently inspected the initial native opening and the corrected elevated opening. The corrected image removes the terrace canyon and lets city lights spread below the road. It still has a nearly featureless black near road, regular isolated lamp pools, repeated emissive-grid architecture and little detailed street life. **Art gate remains FAIL**, matching the environment architect's assessment. Unreal feasibility is not photographic quality.

The first browser run exposed the copied shell's45-second garage vehicle timeout continuing after entering the film. Actual media requests succeeded, and no page JavaScript errors were recorded, but the timeout replaced the comparison with a drive failure state. The lead fixed the experimental shell to scope that timeout to the garage. Those failed captures are retained under `browser-2026-10-12T03-09-58-805Z/`; they are not successful visual/playback evidence.

The first corrected rerun exposed a second distinct lifecycle problem: original `CruiseScene` attaches a WebGL context-loss callback without an unmount cleanup. R3F intentionally disposes its context after the garage is removed; the stale callback marked the film as failed. This was intentional renderer disposal, not evidence of an actual device WebGL failure. The lead guarded the callback with a live garage-state ref in the copied shell. Protected original Cruise code remains unchanged. The failed second run is retained under `browser-2026-10-12T03-13-46-495Z/`.

## Final browser evidence

Final output: [browser-2026-10-12T03-19-49-582Z/results.json](browser-2026-10-12T03-19-49-582Z/results.json). Native and hybrid images, raw media/frame snapshots and silent page recordings exist for all three profiles. Completed after the engine's clean shutdown; no concurrent heavy browser test. Headless Edge155 on Windows10, WebGL2 renderer Intel UHD630 / ANGLE D3D11, warm Next development server, loopback media, no CPU/network throttling. DPR1. Portrait/landscape are touch emulation, **not physical phones**. Safari and production-build performance remain unverified.

| Profile | Native first-decodable ms | Hybrid first-decodable ms | Native join preparation ms | Hybrid join preparation ms |
|---|---:|---:|---:|---:|
| Desktop1440x900 |132.8|903.3|27.9|40.6|
| Portrait390x844 |98.2|337.8|36.9|31.7|
| Landscape844x390 |111.2|306.6|28.0|31.8|

All six source/profile runs show1920x1080video, muted media, one actual segment transition, end at2.000s, no horizontal overflow and no page JavaScript errors. Initial paused-playhead buffer ahead was0.935–0.958seconds of the first one-second segment. The actual hybrid fitted source ratio remains16:9; landscape DOM rounding is1.777764 instead of1.777778. No stretching or unrequested portrait lens change is introduced.

Each completed run's two **currently connected** video elements reported60total video frames and1dropped frame. Do not sum historical detached elements when comparing approaches. The image pause and replay sequence is included in these counters; this is not a sustained uninterrupted30fps or zero-drop claim. `firstFrameMs` is loadeddata/decodable readiness, not screen display latency. The measured join interval is ended-to-next-presented-callback preparation. Some observations exceed one33.3ms source frame, so **frame-perfect/seamless playback is not established**. No GPU or decoder memory number was measured.

The mode-switch capture exposed and corrected a player cleanup bug: React clears callback DOM refs before passive unmount cleanup, so a live ref array could lose its original video elements. The player now captures its two owned elements by value when the effect starts. Final browser checks confirm every detached decoder is paused and has its source removed. Decoder ownership stays bounded to the active two-slot player. End/pause/error states use demand rendering for the foreground; audio remains separate.

Five temporal contract tests passed again after the cleanup change, and the broad TypeScript check completed with exit0 and no diagnostics.

## Final visual review

Directly inspected the final [desktop hybrid](browser-2026-10-12T03-19-49-582Z/desktop/hybrid-ended.png), [portrait hybrid](browser-2026-10-12T03-19-49-582Z/portrait/hybrid-ended.png) and [landscape hybrid](browser-2026-10-12T03-19-49-582Z/landscape/hybrid-ended.png), plus native-only screenshots. The proof panel is collapsed for a fair view. Preserving the photographed/rendered road removes the older rearprojection's obvious synthetic near-road replacement join. That narrower improvement does not produce the requested scene quality.

The realtime cabin is predominantly black, very close to the eye and visually heavy. Its mirror is a black rectangle without a corresponding scene reflection; gauge/radio geometry falls below much of the visible image. Cabin highlights do not respond to passing native lamps. The native city still consists of repeated lit-grid forms with an almost featureless road. The desktop shot therefore lacks the founder's tactile warm cabin and coherent moving illumination. Portrait correctly contains the world in a390x219source rectangle, but that small window and large letterbox areas reduce immersion; landscape UI covers part of the cabin. Both are visible product/art limitations, not overflow failures.

**Competing B hybrid visual gate: FAIL / uncalibrated. Native world art gate: FAIL.** Playback and bounded-resource behavior are demonstrated for this two-second local test. Neither near-photographic realism, a60-second journey, a40-minute diverse route, physical-phone performance nor final delivery is established. Keep both public-manifest experimental sources `qualityAccepted:false`.

## Reproduce

```powershell
node scripts/world-first-hybrid-native-media.mjs --frames=.vercel/world-first-unreal/runs/20261011-230451/render/frames --poses=.vercel/world-first-unreal/camera-per-frame.json --report=.vercel/world-first-unreal/runs/20261011-230451/render/render-report.json --integrate
node scripts/world-first-hybrid-compare.mjs
```

The encoder requires actual successful60-frame output and rejects padding, missing frames, inconsistent optics, repeated identical stills and upscaled source resolutions. The browser script checks for an active Unreal process and a lead browser hold before opening a local page. It blocks application mutations/analytics using the existing QA policy and records only silent page video. No deployment, external rendering service, installation or payment is part of these commands.
