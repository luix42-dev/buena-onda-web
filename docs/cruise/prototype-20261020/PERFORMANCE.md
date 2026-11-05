# Measured browser trial

Real elapsed duration: **1203.1seconds**, 240samples at approximately5-second intervals, with no clock acceleration or route teleport. Windows Dell G7 7588, Core i7-8750H,16GB RAM; Intel UHD630 and GTX1060 Max-Q installed. Edge 155.0.4283.62, headless,1280×720CSSpixels, device DPR1, Auto quality. The renderer adapted its actual DPR to 0.85, 0.89, 0.92, 0.97, 1. The GPU selected for this soak was not separately recorded; the capture report records its own WebGL renderer.

| Measurement | Result |
|---|---|
| Mean sampled one-second FPS | 49.2 |
| 5th percentile sampled one-second FPS | 43.9 |
| Sampled FPS range | 37.1–59.1 |
| Draw calls | 159–300 |
| Driven distance | 17.24km |
| Existing route length | 19.64km |
| Maximum sampled JS heap | 227.9MiB |
| Navigation → ride/route ready | 15.19s |
| Decoded audio progression | 1203.1s |
| Samples reporting playback | 240/240 |
| Non-advancing sampled media intervals | 0 |
| Page exceptions | 0 |

These are sampled one-second scene FPS averages, not per-frame GPU timestamps or a true frame-time percentile. Warm server/local asset conditions and adaptive resolution apply. A separate video-capture trial may report rAF intervals with recorder overhead. JS heap and geometry/texture counts do not measure GPU memory. The NVIDIA snapshot is whole-adapter state, not browser VRAM or proof of the selected renderer.

Playback was measured through media state/currentTime, not a microphone or subjective listening. It cannot rule out a brief gap between samples. NTS1, dublab and Jolt each decoded after explicit station selection before the continuous Jolt run. Camera, dialog and3D-disable/re-enable checks are in browser/results.json; physical background/lock/TV tests are not.

Countach source GLB16,243,344bytes; world JSON3,078,604bytes (uncompressed files, not total transferred bytes). The trial proves neither a locked60FPS target nor physical mobile performance. No native Unreal sustained trial, GPU-memory budget,40-minute sunset run or physical TV connection was completed. Native editor was closed during the browser soak.

See [raw samples](browser/results.json), [checks](performance.json), [capture](capture/report.json) and [hardware playtest](PLAYTEST.md).
