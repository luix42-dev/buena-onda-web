# Hybrid rendering and web playback proof

Status: **IMPLEMENTED / TEMPORAL CONTRACT VERIFIED / VISUAL QUALITY UNACCEPTED**.
Agents D and E work was performed by one bounded agent, `/root/hybrid_playback`, configured model `gpt-6.1-sol`. No additional subagents, service purchases, installations, original Cruise edits or deployments were made.

Latest evidence: an actual two-second native 1920x1080 film is integrated as two silent 30fps clips, each with 30 decoded frames. Its measured camera uses pitch−3°, eye1.62m and initial speed10.000022m/s from the corrected 72m/4.5% scene; these replace the earlier pitch−1°/nominal12m/s assumptions. The camera parameters and coordinate conversion match the actual render contract. Lighting, reflections and pixel-level compositing remain unverified; `calibration.verified` and `qualityAccepted` stay false.

The final native and realtime-hybrid browser comparison completed on desktop, portrait and landscape, with one handoff and no JavaScript errors. Final artifacts are `browser-2026-10-12T03-19-49-582Z/`; observed handoff preparation ranges27.9–40.6ms, and each two-slot run reports60total frames/1drop. Native and hybrid art gates remain FAIL. See [NATIVE-PLAYBACK.md](NATIVE-PLAYBACK.md) for complete current evidence. The initial diagnostic-only handoff below is historical: its no-browser, missing-native and preliminary-camera statements are superseded by this update.

## Finding before implementation

Inspected the actual previous `docs/cruise/projection/desktop-projection.png`, its evaluation, and founder `docs/cruise/cinema/reference/frame-16.png`. The prior projection substituted a uniformly flat road for photographed asphalt. Its seam was exposed in the windshield, while the source had a baked hood and unknown lens. Curving a plate did not recover parallax. That proof already recorded a visual failure; improved decoder performance did not correct it.

The founder frame has a coherent downhill perspective, dense city lights across the horizon, localized highlights, dark framing and a visible cabin. The supplied 368x496 film is a low-resolution composition reference, not a fictional final city asset. It is not composited with a second car or road in this experiment.

## Built

- `components/cruise/world-test/hybrid/HybridWorldPlayer.tsx`: full-aspect muted inline video, two preloaded decoder slots, actual frame callback before reveal, explicit waiting/error/unavailable states, pause/resume, visibility pause, restart key and non-looping default. No crossfade conceals a discontinuity. No audio element or player is created.
- `CalibratedHybridWorld.tsx`: competing B candidate, combining an intact environment-only plate with the original realtime Jeep, fixed measured eye/pitch/FOV, and an optional short near-road seam test. Mount within the shell's existing `CockpitProvider`; existing radio controls remain owned by that provider. Unknown optics, diagnostic footage and baked cabin footage cannot qualify. `candidateMode` permits inspection of a matching environment-only source while labeling its calibration unverified. The optional road stays off unless explicitly supplied.
- `contract.ts`: timeline clamps, buffer-range gap handling, UE-to-Three conversion, aspect-aware lens conversion and adjacent-frame join qualification. Adjacent frame numbers qualify temporal ordering only, not optics or realism.
- Two silent founder-reference diagnostic segments; actual validation in `diagnostic-manifest.json`. They are for local decoding comparisons only.

## Source and camera contract

Authoritative intent: `../world-art/scene-contract.json`, version `world-first-1.0.0`. World meters +Y up / -Z forward / +X right; Unreal centimeters map `(X,Y,Z)=(-z*100,x*100,y*100)`. Horizontal FOV76 degrees, vertical FOV47.4484003654 degrees at16:9, eye1.62m, pitch−1 degree, zero head sway. Authored source has no baked cabin/hood but **does have a baked road**, so road replacement is off.

Target native footage: frame0..899 then900..1799,30fps, two30-second segments, no duplicate connector frame. The 720m downhill route changes elevation/speed and is **not loopable**. Actual rendered per-frame poses must supersede nominal12m/s intent before a foreground optical pass can be claimed. The current browser Jeep candidate uses nominal clock distance only; it is not calibrated to variable native route speed, reflections or local lighting. No convincing seamless hybrid result is claimed.

The player always preserves source aspect using contain. The calibrated candidate fits both the plate and transparent foreground to the same measured source rectangle even in portrait. It does not change the lens to fill a phone screen.

## Diagnostic media evidence

Source: founder-supplied `D:/10-VENTURES/12-buena-onda/33secref.mp4`,32.7s,981frames,368x496,30fps, no audio. Source SHA256 in the manifest agrees with the prior reference analysis.

| Segment | Source frames | Actual decoded frames | Actual duration | Bytes |
|---|---:|---:|---:|---:|
| founder-diagnostic-a.webm | [0,135) |135|4.500s|598522|
| founder-diagnostic-b.webm | [135,270) |135|4.500s|586038|

Total1184560bytes; VP8/WebM, no audio. Actual decoding counters and demuxer durations were checked after encoding. The initial intermediate encoder incorrectly used25fps; explicit30fps corrected that discrepancy before the current verified manifest was handed off. There is no last-to-first join approval. The complete reference repeats content near9s according to the prior analysis, and an arbitrary loop must not be represented as a longer authored drive.

Existing CapCut FFmpeg decodes source MP4 and writes a temporary MJPEG stream; existing Playwright FFmpeg encodes/validates VP8. Both are constrained to one thread. The Playwright binary lacks MP4/rawvideo demuxers and CapCut software H264 MF did not provide a usable file, so neither was silently assumed to work. Temporary intermediates are removed. Existing portable Blender was discovered at `D:/10-VENTURES/12-buena-onda/Buena Onda_1780506618159/cruise-phase1/.dream-loop/tools/blender-4.5.0-windows-x64/blender.exe`; it was not launched or installed.

## Verification and limits

`node --import tsx --test scripts/world-first-hybrid-contract.test.ts`: **5 passed,0 failed**. Meaningful checks cover duplicate/missing boundary frames, non-loopable last join, timeline overshoot, buffering gaps, lens/coordinate conversion and rejection of incompatible foreground sources.

The agent did not launch a browser during Unreal startup because of the shared memory constraint. Browser/device measurements, decoder handoff recording, actual peak transfer, physical Android/iPhone tests, Safari, sustained FPS and GPU/decoder memory are **not verified by this handoff**. The lead's browser specialist must record them separately. After an earlier check was interrupted during startup pressure, `node node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false` completed with exit0 and no diagnostics.

Player `firstFrameMs` measures initial loadeddata/first-decodable readiness, not actual display latency. `lastTransitionGapMs` measures ended-to-next-first-presented-callback preparation; it does not measure frame-content motion continuity. `presentedFrames` is browser totalVideoFrames−droppedVideoFrames for the active element, resets between slots, and is not a cumulative 60-second count. The parent should sample both elements for an overall drop total. `timelineSeconds` uses the media element clock, never radio audio or synthesized wall time. Buffer ranges report only the contiguous range containing the playhead.

No ad tracking, exposure counting or paid media source is introduced. Native stills or motion may be supplied later with provenance; until then the authored source stays unavailable. The B hybrid visual quality gate remains **REJECTED / UNPROVEN**, based on the prior seam failure and missing reviewed matching environment plates. This is not a claim that the current authored world or a seamless two-minute ride is complete.

## Integration and reproduction

Use the `clips` array from `diagnostic-manifest.json` only in the root's diagnostic source. Supply final render segments separately with `content:'environmentOnly'`, exact measured camera metadata, actual fps/duration and provenance.

```tsx
<HybridWorldPlayer segments={source.segments} paused={paused}
  posterUrl={source.posterUrl} restartKey={restart} loop={false}
  onReady={setReady} onPlayback={setPlayback} />
```

Recreate diagnostic media: `node scripts/world-first-hybrid-diagnostic-media.mjs`. Run contract tests with the command above. No production deployment is part of either command.

Next quality action: inspect a native environment-only checkpoint at the exact eye/lens, then a short matching moving plate. Review the full window/cowl/near-road join and moving lighting before longer renders. Do not reuse the old eight-second hood clip or substitute a tint for night-world art.
