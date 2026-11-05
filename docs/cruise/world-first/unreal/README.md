# World First: native Unreal diagnostic — visual gate FAILED

Actual Unreal output exists: twelve representative 1920×1080 stills across three rejected revisions, plus **60 actual PNG frames / two seconds / 1920×1080 / 30 fps** from Movie Render Queue. This demonstrates bounded native raster rendering on the available machine. It does not satisfy the photographic world brief. No 60-second film, linear EXR master, cockpit, traffic, or complete motion gate was delivered.

Owner: delegated agent `/root/unreal_director`, configured by the lead as `gpt-6-astra`. This records the requested agent configuration, not hidden backend provenance. Independent review is in [World Art evaluation](../world-art/EVALUATION.md). The final frame still has a detached elevated road, repeated emissive box facades, large black road areas, regular amber pools and insufficient connected urban middle ground. The next meaningful art task is an authored 150-250 m neighborhood slice connecting road, terrain, low-rise streets, detailed facades and vegetation.

## Actual deliverables

- [Final viewport opening](frames/vista-revision/frame-00s.png): revised 72 m elevated road; photographic FAIL.
- [MRQ first frame](frames/mrq-diagnostic/world-first.0000.png) and [last frame](frames/mrq-diagnostic/world-first.0059.png): actual moving-camera benchmark endpoints.
- [Camera metadata](camera.json) and [per-frame poses](camera-per-frame.json): revised native contract, including all authored sequence poses. Only frames 0–59 were rendered; frame 1800 is an authored continuation pose.
- [MRQ result](logs/20261011-230451-render-render-report.json): success true, 60 PNG, 97,481,942 bytes (92.966 MiB), 58.031 s script elapsed. Render began at 28.906 s; queue interval was 29.125 s including PIE startup/finalization. Engine separately logged 29.106 s for its job. This is not pure GPU time or a measured full-minute throughput guarantee.
- [Selected engine evidence](logs/selected-engine-evidence.txt) and individual run reports preserve failures as well as success.
- [Source snapshot](source/WorldFirst.uproject): 42 files / 5,749,580 bytes including saved scene assets, scripts, configuration and three source PNG textures. Excludes engine binaries, derived cache, runtime logs and unrelated assets. An unused engine-generated Android file-server configuration section was omitted from the archive.

The complete PNG sequence remains local at `.vercel/world-first-unreal/runs/20261011-230451/render/frames/world-first.0000.png` through `world-first.0059.png`. PNG is display-referred, not a linear archival master. Hybrid playback owns browser encoding and its measured output sizes; see its manifest. The native plate is **environmentOnly**, without a baked vehicle, hood, dashboard or hands.

## Hardware, renderer and bounds

Engine: `5.8.3-58210709+++UE5+Release-5.8`, installed at `D:/10-VENTURES/12-buena-onda/UE_5.8`. Observed hardware: GTX1060 Max-Q 6 GiB, 16 GiB system RAM, driver 582.28. Isolated project: `D:/10-VENTURES/12-buena-onda/cruise-publish-20261006/.vercel/world-first-unreal/WorldFirst.uproject`.

Tested path: DX11/SM5 deferred raster with TAA, no Lumen, hardware RT, Nanite or mesh distance fields, and a 512 MiB streaming pool. Instanced geometry has shadow casting disabled; emissive panes are not thousands of local lights or physically simulated interiors. There are 130 raster point lights. This quality reduction is a material limitation of this proof, not evidence that a photographic scene is impossible on this hardware.

The launcher preserves other editors, requires at least 4 GiB free physical RAM, starts one owned editor hidden and limits it to 15 minutes by default. Windows commit headroom also mattered: an earlier unbatched run exhausted commitment despite modest process working set. No system pagefile or power settings were changed. Parent/browser agents held heavy browser work during the successful render. PID14432 shut down cleanly at 23:08:07 EDT on 2026-10-11; resources were released for browser QA.

## Scene and actual camera

The initial [shared contract](../world-art/scene-contract.json) used a 24 m opening road, 3% descent and −1° world pitch. After review, native revision `native-vista-2` uses **72 m opening road, 4.5% descent, −3° world pitch**, still with 1.62 m local eye height, +1.75 m lateral position and 76° horizontal FOV. It is a revised contract, not a calibrated match to the original WebGL scene.

Coordinates: `UE(X,Y,Z)=(-browserZ,browserX,browserY)*100`, centimeters, X forward / Y right / Z up. The road is straight, 14 m wide and four lanes. Smooth speed phases: 0–10 s: 10→12 m/s; 10–40 s: 12; 40–50 s: 12→14; 50–60 s: 14→10. Their integral is 720 m. Native yaw and roll are zero. The two-second output samples the beginning only, so full-route speed variation and continuation have not been visually verified.

Initial instanced build: 3,307 mesh instances in 21 batches, 540 building forms and 155 actors. Final saved scene: 178 actors, later roadside terrace batches hidden, original city forms lowered, 180 low blocks and 540 street-light dots added. Existing Unreal engine primitives supply geometry; ten procedural shaders vary emissive panes. No large city pack or original CinemaProbe map was loaded.

Asphalt uses already-local CC0 [Poly Haven Clean Asphalt](https://polyhaven.com/a/clean_asphalt), attributed to Dimitrios Savva in the World Art asset manifest. Existing WebP files under `public/cruise/materials/clean-asphalt/` were decoded with Pillow and saved as PNG without resizing or altering originals. Color, normal and roughness maps are connected in the final material; normal green is flipped, roughness linear, and world XY uses 210 cm tiling. The intermediate checkerboard was a material compilation failure, not an assessment of the scan.

## Run record

| Run (2026-10-11 EDT) | Measured result |
|---|---|
| 22:27:22 | Cold default-plugin startup approximately 8m45s; script failed after 146.36 s on unsupported direct DirectionalLight component attribute. No frame. Fixed reflected component lookup. Owned PID7604 stopped after slow requested teardown. |
| 22:40:32 | Minimal-plugin startup around 45 s, then approximately five minutes of shader caching. Unbatched scene hit Windows allocation/commit failure (logged at 22:49:59). No frame. Process peak physical about 4.26 GiB and virtual about 5.07 GiB; system commit was the bottleneck. |
| 22:51:45 | First instanced attempt failed after 37.5 s because Transform expected Rotator, not Quat. No frame; corrected argument. |
| 22:54:48 | Batched scene built in 3.7 s; four frames completed in 193.97 s including first shader compilation. Screenshot callback reentrancy error during shader wait; guard ordering corrected. Art FAIL. |
| Same editor, road refinement | Four frames in 61.69 s. Invalid ComponentMask input caused default checkerboard. New terraces obstructed vista. Art FAIL, worse than initial. |
| 23:04:51 | Final vista: four frames in 56.39 s. Checked connections replaced failed graph; checkerboard gone, broader city visible. Art FAIL. Same editor produced successful two-second MRQ in 58.031 s. |

The final run initially loaded the previous broken asphalt and logged its old compile error at 23:05:07; vista.py then rebuilt the graph before capture. No later asphalt compile error appears in that run. MRQ also logged nonfatal invalid InputComponent/PlayerInput class ensures during PIE startup with the minimal plugin set. These are preserved in the evidence. The job reported success and wrote all 60 frames; the source configuration was not silently changed after measurement. No claim of an error-free engine log is made.

## Reproduce the saved diagnostic

Use the existing local project and saved `/Game/WorldFirst/L_NightDescent_v4` map. From the repository root:

```powershell
.\.vercel\world-first-unreal\launch.ps1 -MaxMinutes 15 -Script render.py
```

This authors `/Game/WorldFirst/LS_Descent60` but renders only frames 0–59 at 1080p30, PNG, one spatial/two temporal samples, 24 engine warm-up and eight render warm-up frames. Output goes under a timestamped run directory and the editor quits after completion. A full sequence asset does not imply a full rendered film.

The tracked source snapshot includes final saved Content, so it can be copied into a fresh isolated project directory and rendered without repeating historical construction failures. The launcher contains machine-specific engine/cache paths requiring adjustment elsewhere. Do not execute the archive in place if preserving its exact snapshot matters: Unreal writes assets and generated project files.

The scoped `.gitattributes` preserves source snapshot bytes without Git line-ending conversion, so its recorded hashes remain meaningful across checkouts. Existing project configuration whitespace is retained as captured.

For construction investigation only, `build-instanced.py` rebuilds the initial scene, `refine-road.py` records the rejected intermediate step and `vista.py` applies the final revision. The latter is additive, **not idempotent**: do not apply it twice to the final map. Do not launch historical unbatched `build.py` directly. The screenshot stage allows local `next-action.txt` containing `refine`, `render` or `quit` for up to 180 s after its four frames. No further render is necessary to review the preserved evidence.

API choices were checked against installed Epic Movie Render Pipeline Python examples and engine headers, plus Epic's [MoviePipelineQueueSubsystem](https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/class/MoviePipelineQueueSubsystem?application_version=5.2) and [InstancedStaticMeshComponent](https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/class/InstancedStaticMeshComponent?application_version=5.4) references. Actual installed-engine execution and written output are the verification evidence.


