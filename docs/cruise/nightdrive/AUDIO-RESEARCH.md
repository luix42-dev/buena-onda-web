# Nightdrive ambience research

2026-10-10. Owner: `/root/qa_security`. Exact model identifier unavailable.
Status: **IMPLEMENTED ? listening and browser verification pending**. Initial research is retained below; the follow-up lab-only procedural implementation is summarized at the end. No download, account access, dependency installation or production write.

## Recommendation

Prototype a small, procedural ambience graph owned exclusively by the Nightdrive lab. Wind, road texture, restrained engine hum and occasional traffic should sit behind the radio. Keep an explicit **Ambience Off** switch and separate gain control. The initial recommendation was default Off until audition; the subsequent user direction explicitly requested enabled by default at restrained gain0.2, gated by Start. The implementation follows that direction. No recording of third-party radio, no imported recording in the first prototype, no microphone permission.

This avoids adding a download or account requirement while preserving a later option to audition a licensed recording. Procedural synthesis is a design proposal, not evidence of realistic sound.

## Existing interfaces and integration boundary

- `lib/cruise/music-audio.ts`: `MusicAudio.unlock()` lazily creates its private `AudioContext` and resumes it. `attach()` captures the HTML audio stream for analysis; its analyser is deliberately not connected to the destination. Ordinary radio remains audible independently, including capture-restricted stations. `detach()` stops capture tracks and analysis; `dispose()` closes that context.
- `components/cruise/audio/useCruiseAudio.ts`: `start()` invokes `music.unlock()` in the user gesture and unlocks the existing media element with a short silent WAV. Public controls include `start`, `pause`, `toggle`, `playing`, `requested`, `loading`, `volume`, `muted`, `setVolume`, `setMuted` and station selection. Requested playback can be true while actual playback is buffering; use the correct state when labeling controls.
- `components/cruise/master/MiamiStreet.tsx`: Start invokes `audio.start()`. Camera and driving changes do not own the radio lifetime. The lab should compose the same hook and a separate ambience owner, leaving these existing callers unchanged.

Proposed lab-only `NightdriveAmbience` interface: `unlock()`, `setEnabled(boolean)`, `setGain(0..1)`, `update({speed, moving, visible, musicPlaying, musicMuted})`, `dispose()`. No access to the private music context and no change to the analysis graph. A second context is a conscious isolation tradeoff; count and close it, never create one per frame or camera.

On the lab Start gesture, call both `audio.start()` and ambience `unlock()` synchronously. If ambience remains Off, defer its context creation until the visitor enables it in another gesture. Rejected resume must leave the radio working and show the ambience control as inactive. Chrome documents gesture-related Web Audio suspension; don't infer permission from elapsed time or a resolved network request. [Chrome autoplay policy](https://developer.chrome.com/blog/autoplay/)

## Proposed sound graph and behavior

Use native `AudioBufferSourceNode`, `OscillatorNode`, `BiquadFilterNode`, `GainNode` and optional `StereoPannerNode`; no AudioWorklet, per-frame sample generation or reverb dependency needed. Looping buffers and parameter automation are standard Web Audio facilities. Smooth gain changes on the audio clock rather than abruptly changing amplitude. Close/disconnect nodes at teardown. [W3C Web Audio Recommendation](https://www.w3.org/TR/2021/REC-webaudio-20210617/)

| Layer | First prototype | Music-first constraint |
|---|---|---|
| Wind | Generated mono noise, filtered to a soft band; shallow slow modulation | No bright hiss or beat modulation; smoothly follow speed |
| Road | A separate lower noise band with a seamless generated loop | Very low gain; fade out when stopped |
| Engine | Two quiet sine/triangle harmonics following speed with slow response | No gear changes, revving prompts or aggressive acceleration effect |
| Traffic | Reuse filtered procedural noise with a slow gain/pan envelope | At most one pass at a time, tied to a visible passing vehicle, no horns/sirens |

Mix layers into one ambience master gain connected only to its own destination. Initial gain values are audition targets, not measured loudness claims: initially cap master around0.08, start an enabled audition around0.025 (subsequently revised from measured capture; see below), and leave headroom within each source. Avoid claiming a dB relationship to music without measuring both outputs. The visitor's ambience slider scales this conservative cap, not full digital amplitude.

Recommended control semantics: radio Pause/Mute also fades ambience down so a familiar silence action remains reliable; ambience Off never changes the radio. Keep ambience low or silent during station buffering, never swell into a foreground sound when music disappears. Driving pause fades road/wind/traffic; camera changes preserve the graph. Hidden tabs fade/suspend ambience, visible tabs only resume an already-enabled session if browser policy allows. Do not pause or resume the separate radio as a side effect of ambience visibility handling. Under reduced-motion preference, remove moving stereo sweeps and slow modulation further; leave an independent Off control available.

Use a roughly100–200ms gain fade and low-rate parameter updates (approximately10Hz is a proposed starting point); `setTargetAtTime` supports smooth exponential approaches. Explicitly set gain to zero after an Off fade before suspending to avoid a residual tail. [AudioParam automation](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setTargetAtTime)

## Freesound candidate: provenance verified, audio not auditioned

[Road ambiance — Passing cars by Breviceps](https://freesound.org/people/Breviceps/sounds/452756/) publicly lists CC0, dated2018-12-12, WAV,33.825seconds, mono16kHz/16bit, about1MB. The page currently says **Login to download**. No login or download attempted. Its title/metadata alone cannot establish a clean loop, suitable traffic density or audible quality; the lower sample rate also limits high-frequency texture. Retain as an optional reference candidate, not an included asset.

The linked [CC0 deed](https://creativecommons.org/publicdomain/zero/1.0/) permits copying/modification/distribution, including commercial use, subject to its stated limitations; it supplies no warranty. Preserve title, author, original URL, license and any later edit history if the asset is eventually obtained. Do not bypass the download login or assume other recordings share this license.

## Security and route isolation invariants

- Existing leaked service-role key retirement remains **unconfirmed**. No deploy, publication or production writes. Do not read or log credential values.
- New lab route/components only; do not change original `/cruise` or Miami Test behavior, default catalog, shared Start gate, cast flow or radio ownership to add ambience.
- No microphone, tab recording, captured-station export, remote audio upload or new telemetry/service. The ambience graph never connects to the radio analyser; synthetic sound cannot be reported as live music FFT.
- Keep Avenue commercially hidden and its existing authorization/claim gates intact. A new lab should not create real drive-by/claim events; use inert local fixtures or omit Avenue wiring while preserving existing routes' analytics behavior.
- No secrets in client props, query strings, audio URLs, generated assets or screenshots. No new environment variables are necessary for procedural audio.
- Physical casting remains unverified: tab/screen mirroring may include separate Web Audio output, whereas an HTML-media-only remote playback path may not. Verify on hardware before claiming mixed receiver audio.

## Acceptance evidence required before calling it implemented successfully

1. Actual local Next browser: no audible output before a gesture; Off remains silent; Start and rejected autoplay paths do not break radio playback.
2. Independent music/ambience gains, radio Pause/Mute silence semantics, station switching, rapid On/Off and route unmount all work; no extra contexts/nodes accumulate.
3. Listening comparison with vocals, quiet passages and different stations; founder can hear and approve balance. A screenshot or FFT state is not audible-quality evidence.
4. Seamless noise loop and gentle traffic envelope; reduced motion, visibility changes, phone rotation and camera switching do not create clicks or restart the radio.
5. Equal-setting ambience Off/On sustained performance and memory measurements on the same device/browser; existing music station and HLS costs recorded separately. Real phones and TV audio remain physical-device gates.

Next action: integrate the lab-only implementation and perform an explicit audible comparison. Freesound remains an optional future audition, not a blocker for a no-download prototype.


## Implementation delivered

`components/cruise/nightdrive/NightAmbience.ts` exports the lab-only class with the requested unlock/control/update/dispose/snapshot interface. Construction allocates no Web Audio objects. `unlock()` creates a graph only in the Start/enable gesture. Default enabled is true, gain0.2; master is now capped0.25, giving default target0.05 outside and0.036 in cockpit before source gains. The initial cap0.08 was revised after the generated-only capture measured very low levels. These are digital gain values, not measured perceptual loudness.

Three filtered generated noise sources supply wind, road and the nearest actual traffic car; two quiet sine harmonics supply engine hum. Traffic gain follows distance within28m and pan follows its lateral position. No random phantom traffic or horn events. Reduced-motion mode centers traffic pan. A seeded three-second generated buffer has endpoint correction; no recorded asset was imported. Sound quality and loop audibility require listening review.

Off, hidden, radio not playing/muted, and driving stopped all fade ambience to zero and suspend its independent context. A400ms timer finishes the fade and exact zero; repeated10Hz updates do not postpone that timer. Enabling/moving again resumes only the already-created context. Radio owns its own playback lifecycle. Unmount stops sources, disconnects nodes, stops optional recording tracks and closes the ambience context.

Optional `recordingStream()` connects only the generated ambience master to a MediaStream destination, after unlock. It cannot record radio because there is no connection to the radio element or capture graph. The caller owns any MediaRecorder duration and stop handling; dispose closes the stream tracks.

`tests/nightdrive-audio.test.ts`: **2/2 passed**. Tests cover no pre-unlock context/nodes, independent silence conditions, idempotent pre-unlock disposal, gain bounds/nonfinite input, lower cockpit level, actual-car proximity and centered reduced-motion traffic. These tests do not prove browser audio cleanup, audible quality or performance; the lead's integrated browser/listening checks remain required.


## Capture-driven gain adjustment

Lead decoded `initial/generated-ambience-only.webm` with existing FFmpeg:44.81seconds, mean-53.4dBFS and maximum-39.4dBFS. This was the synthesized ambience graph only. No third-party radio was recorded or measured, so there is no measured ambience-to-radio loudness comparison.

At the lead's direction the master cap changed from0.08 to0.25, retaining the user gain default0.2 and every layer weight, silence gate and cleanup behavior. This is a3.125? amplitude increase (approximately+9.9dB). For exactly the same synthesized signal/control trajectory, the expected level change is+9.9dB; final capture levels still require measurement. This is a bounded audition adjustment, not a human listening verdict or proof of a balanced mix.
