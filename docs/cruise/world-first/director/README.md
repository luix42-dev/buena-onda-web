# Latest-world director cut

This is a native environmental director cut of the latest saved Unreal world, with two actual Buena Onda/Vice Nights house billboards added. It shows the existing build; the world's photographic art gate remains failed. No vehicle, cockpit, hands, real sponsor contract, revenue, or measured ad-exposure claim is included.

The source map `/Game/WorldFirst/L_NightDescent_v4` was saved under the new path `/Game/WorldFirst/L_Director_v5`. Its original map was restored byte-for-byte after the rejected save-map attempt described below. Its SHA256 is `3d2f9e5393c2740c0302adbcb497f24d37cdca13f975b1081eb1b6c861d97cd5`, matching the earlier archived map. The earlier two-second footage and archive remain intact.

## Director cameras

Four authored camera cuts, two seconds each, total 240 frames at 1920Ã—1080 / 30 fps. All camera positions, pitch/yaw/roll, horizontal FOV and height above the road plane are in [camera.json](camera.json). These are environmental director cameras, not a calibrated cockpit or locked hybrid plate.

| Frames | Shot | Horizontal FOV |
|---|---|---|
| 0â€“59 | Ridge approach | 70Â° |
| 60â€“119 | First house billboard | 58Â° |
| 120â€“179 | City and elevated boulevard | 70Â° |
| 180â€“239 | Second house billboard | 60Â° |

The four pre-render checkpoints are [approach](frames/shot-00.png), [first billboard](frames/shot-01.png), [city](frames/shot-02.png) and [second billboard](frames/shot-03.png). Both billboard checkpoints were inspected for orientation and readable existing artwork before starting the 240-frame MRQ job.

Both signs use the existing `public/cruise/campaigns/vice-nights/fallback.png`, whose campaign declaration is `lib/cruise/campaigns.ts`. Text includes VICE NIGHTS and BUENA ONDA / MIAMI. This is the same existing house campaign at two placements, not two sold campaigns. Each is 16Ã—9 m, with frame and support geometry. World centers are UE centimeters `(6500,2000,7507.5)` and `(45000,-2200,5825)`. The additions bring the scene to 190 actors from 178. No city geometry or lighting was upgraded for this cut.

## Render and provenance

Renderer: installed Unreal 5.8.3, DX11/SM5 deferred raster on GTX1060 Max-Q, using the same project/cache/settings as the [earlier native proof](../unreal/README.md). MRQ uses one spatial and two temporal samples, 24 engine warm-up and eight render warm-up frames per shot. Source PNGs are display-referred, not linear EXR. The web delivery uses VP8 with no audio; radio integration belongs to the parent application.

The first launch at 23:52:14 EDT on 2026-10-11 failed before any frame because EditorAssetLibrary map duplication left loaded World objects and triggered an engine World Memory Leaks assertion. [Failure evidence](logs/failed-duplicate-map.txt) is preserved. The retry uses the installed engine's `EditorLoadingAndSavingUtils.save_map` API after loading v4, saving v5 before modifications. The second run launched at 23:53:45, built the scene in 14.735 seconds and produced four valid review stills by 59.875 seconds. Its MRQ output was rejected: save_map copied the map but left v4 active, so the later save temporarily wrote the additions into v4 while MRQ loaded v5 without camera actors. Pixel inspection caught the default-origin camera despite a successful 240-frame job report. With the editor closed, v4 was restored byte-for-byte from the untouched archive. The corrected run explicitly loads and asserts the active v5 world before constructing or binding cameras. Both earlier failures are preserved; neither is an observed memory exhaustion.

The source additions are under [source](source/). They overlay the earlier [native project snapshot](../unreal/source/WorldFirst.uproject); the new map and Director assets use its existing WorldFirst meshes/materials. The current local project is `.vercel/world-first-unreal/WorldFirst.uproject`; the authoring/encoding scripts are `.vercel/world-first-director/director.py` and `encode.mjs`.

From the repository root, the bounded launch command is:

```powershell
.\.vercel\world-first-unreal\launch.ps1 -MaxMinutes 15 -Script ../world-first-director/director.py
```

It saves only the new map, renders four inspection stills, then waits up to four minutes for `.vercel/world-first-director/action.txt` containing `render` or `quit`. Rendering writes the actual frame sequence and exits its owned editor. The launcher uses machine-specific engine/cache paths and preserves other running editors.

The scene retains the previous art limitations: disconnected elevated roadway, repeated emissive box facades, missing urban ground detail, black asphalt areas and regularly spaced amber light pools. This eight-second presentation is not a full-minute driving route or a new photographic-quality pass.


## Verified delivery

[Browser video](../../../../public/cruise/experiments/world-first/director/director-8s.webm) is one VP8 WebM: **8.000 seconds, 1920×1080, 30 fps, 240 decoded frames, no audio, 10,317,196 bytes**. The complete PNG source is 546,870,622 bytes in `.vercel/world-first-unreal/runs/20261011-235735/frames/`. All 240 source hashes are distinct and recorded in [manifest.json](manifest.json). Encoding and decode validation took 17.407 seconds using existing local FFmpeg tools. The conversion uses an MJPEG intermediate; the original PNGs remain the higher-quality source.

Corrected native run: 82.641 seconds script total, render started at 49.172 seconds, queue interval 33.469 seconds (engine job log: 33.433 seconds). This includes job setup/finalization, not pure GPU time. Editor exited at 23:59:09 EDT on 2026-10-11. Nonfatal InputComponent/PlayerInput ensures remain disclosed in [engine evidence](logs/engine-evidence.txt).

All four actual MRQ shot starts and the final frame were visually inspected after the corrected run: the requested camera views and billboards are present. See [frame 60](frames/director.0060.png) and [frame 239](frames/director.0239.png). Source overlay: seven files / 1,098,174 bytes, including final v5 map and four new Director assets; it depends on the preserved earlier native source snapshot. [Asset provenance](assets.json) and the parent application [source entry](source-entry.json) are provided separately. The older two-second source entries were not edited.
