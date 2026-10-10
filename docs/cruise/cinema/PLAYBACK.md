# Project Cinema: browser architecture and acceptance plan

2026-10-10. Owner: `/root/cinema_playback`, inherited session model (exact runtime variant not exposed). Research and source inspection only. No route, render, playback measurement or production write was performed by this workstream. Gate B requires actual accepted Unreal frames before integration; an existing generated clip is not a substitute.

## Existing dependency map

| Source | Observed responsibility | Cinema decision |
| --- | --- | --- |
| `app/(site)/cruise/page.tsx` | Default loads `CruiseClient`; `?mode=video` reads published Supabase scenes/channels; `?mode=minimax-test` loads existing experiment | Original remains read-only. New noindex route uses a local static manifest and no production database dependency. |
| `app/(site)/cruise/CruiseClient.tsx` -> `components/cruise/LaunchExperience.tsx` | Garage, branding, introduction, controls, radio, analytics and dynamic `CruiseScene` | Reproduce the established presentation in an isolated wrapper; do not mount this scene-bearing component behind a video. |
| `components/cruise/MiniMaxExperiment.tsx` | Existing six-second generated-video test, independent radio and muted inline video | Useful architectural precedent, not Unreal evidence or a quality benchmark. It has unhandled `play()` rejection, no poster, hard loop and public sponsor controls; do not copy wholesale. |
| `components/cruise/audio/useCruiseAudio.ts` | Persistent HTML audio, user-gesture unlock, station switching, playlist, existing HLS handling, error/retry and volume | Reuse once at the persistent cinematic experience root, passing experimental station catalog. No need for `MusicAudio` analysis solely to play a film. |
| `lib/cruise/stations.ts` | Original catalog plus experimental additions | Eight of twelve target stations are enabled in code; this is not eight newly verified working streams. |
| `components/cruise/RadioPanel.tsx` | Original catalog hardcoded; optional cockpit context | Do not change shared behavior. Create isolated catalog-aware panel using original visual language after Gate B. |
| `components/cruise/radio/RadioConsole.tsx` | Reads cockpit context, shows station/status; song label only for playlist | Adapt presentation cautiously; never represent the rendered dashboard as an interactive DOM head unit. |
| `lib/radio-metadata.ts` | Owned playlist metadata backed by server Supabase | Avoid writes. Existing metadata availability is not proof of live third-party song identification. |

No component named Astra was found in the inspected Cruise/app source search. “Astra UI” should mean preserving the actual existing design, not inventing a new named implementation.

## Four independent lifecycles

Planned route: `/cruise/cinematic-test`. Planned local manifest: hero-car ID, source provenance, poster, 1080p MP4, optional separate ambiance, duration, camera variant and explicit continuity status. One supported hero car; other selections clearly unavailable. Night only initially. No low-angle option, fake sky controls or six camera menus.

1. **Visual:** one stable `<video muted playsInline preload="metadata">`, no radio audio track. Keep DOM identity and `src` stable through station/volume changes. A video failure shows poster and a video retry action while radio continues. Do not claim seamless looping for a cinematic sequence with unmatched endpoints.
2. **Music:** one persistent `useCruiseAudio(undefined, MIAMI_CRUISE_STATIONS)`. Its source changes only when radio selection/playlist changes. Video `ended`, `waiting` and `error` must not pause/recreate the radio. Radio controls must not reload/seek video.
3. **Ambiance:** separate licensed audio player/gain. Start/resume only in the user gesture. Its mute/volume affects no radio gain. Follow video pause and timeline for synchronized passes; gently fade on visual stall/seek rather than restarting music. Stop/dispose on route exit. Existing generated Nightdrive audio is an engineering demo, not a claim of realistic recorded engine sound.
4. **UI:** preserve Buena Onda introduction, typography, colors, compact radio controls, one-car garage presentation, official station links and mirroring guidance. No Avenue controls, database claims or fabricated song information. A global pause explicitly pauses visual and ambiance; radio has its own clearly labeled pause.

In the Start handler, initiate video `play()`, radio `start()` and ambiance unlock directly in the same gesture, without waiting for a network promise first. Handle each result independently. Do not hide Start until required playback succeeds; expose a retry for the failing layer. WebKit documents muted/no-audio inline-video behavior, but policies and device states still require actual testing. [WebKit policy](https://webkit.org/blog/6784/new-video-policies-for-ios/)

## Delivery choice

Use progressive MP4/H.264 at 1920x1080/30 fps, SDR, 4:2:0 with a web-ready MP4 index and correct `video/mp4` response. Keep the archival image sequence separate. H.264 in MP4 has broad compatibility; verify the encoded profile on target devices rather than assuming a container guarantees decoding. [MDN container guidance](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Containers)

Use poster plus metadata preload before Start; after user intent, allow ordinary buffering. `preload` is a hint, not a download guarantee. Test initial and mid-file byte-range responses and cache behavior on the intended delivery path. Do not download the whole film into a JS blob or introduce a streaming server. [MDN preload](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/preload)

Start with `object-fit: contain`, especially portrait, so hands, steering wheel and skyline survive. Letterboxing is preferable to silently cropping the cockpit. Place mobile controls in the safe letterbox area where possible. `cover` crops; `fill` can distort. Compare actual frames at all viewports before choosing per-shot crop rules. [MDN object-fit](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/object-fit)

For approved long-form work, evaluate HLS with aligned renditions/keyframes and native Safari playback, using existing HLS tooling only where needed and supported. MSE can append segments but does not manufacture artistic continuity; feature/codec support must be detected. No custom MSE or adaptive-bitrate system is justified for this first 30-second file. [Apple HLS](https://developer.apple.com/streaming/), [MDN MediaSource](https://developer.mozilla.org/en-US/docs/Web/API/MediaSource)

## Radio truth and candidate preservation

Code currently enables Buena Onda, Jolt, NTS 1/2, Rinse France, The Lot, Kiosk and dublab. Depa.Radio, Sucker Free Radio, WDNA and Radio FG remain requested candidates, absent from this registry. Poolsuite remains external-only. No live playback/rights revalidation was performed in this architecture pass; previous `public-stream` labels are not blanket recording, sponsorship or redistribution permission.

Keep the twelve-target research backlog, but require one verified playable source for the film proof. Existing live-source `trackTitle` is constructed from station name, not live song discovery. Show station plus “Track information unavailable” unless a verified metadata source supplies current artist/title. Save/share only known information, with station/source/time attribution; offer official listening links for unresolved integrations. Do not build paid recognition or relay station audio.

## Gate E test protocol (planned, not executed)

- Production local Next build; 1440x900, 390x844 and 844x390. Record OS/browser/GPU, DPR, encoded resolution/bitrate/file size, network conditions and duration. Desktop emulation is not an iPhone.
- Verify keyboard/touch Start, actual decoded video, actual audible radio, independent station switch and volumes, ambiance Off, pause/resume, retry, visibility change, orientation, focus and no unwanted navigation. Observe video element identity/current time before and after controls.
- Log `waiting`, `stalled`, `playing`, `error`, buffered ranges, startup time and `getVideoPlaybackQuality()` total/dropped frame deltas. A 30 fps film does not need 60 decoded frames/sec. Use `requestVideoFrameCallback` media timestamps for cadence; feature-detect it. Browser frame counters are not proof of photographic quality. [Playback quality](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/getVideoPlaybackQuality), [Video frame callbacks](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback)
- Inspect decoded stills against the master at fixed times: dashboard labels, fingers, haze gradients, headlight clipping, dark banding, gamma and motion artifacts. Compare cockpit-only versus one-exterior variant, with no low-angle shot.
- Run repeated playback for ten minutes, logging stalls, drift, memory and all transition timestamps; do not call a visible hard loop endless. Separately capture licensed ambiance and silent visual evidence; do not record third-party station audio.
- Physical iPhone/Android, TV, Chromecast and AirPlay remain **BLOCKED — PHYSICAL DEVICE REQUIRED** until actually exercised. AirPlay of the video element alone may omit separate radio/UI; retain full-screen/tab mirroring guidance and test audio independently.

## Continuity contract

Each future clip needs authored incoming/outgoing state: speed, curvature, lane offset, camera transform/FOV, horizon, car/hand pose, traffic, weather, time, exposure and light direction. Render boundary handles. Compare last/first decoded frames and timestamp cadence, including moving traffic and lamp positions; a crossfade can hide a cut but create double geometry. For the first continuity experiment, render two adjacent sections from one uninterrupted Unreal timeline, encode with matching settings, compare joined browser playback against the uninterrupted master. Native `loop` is an experiment, not a guarantee of frame-exact playback.

Prefer a longer prejoined authored journey once approved. Prebuffer at most the next compatible segment; release old buffers. Decide whether MSE/HLS is warranted only after measured gaps on target browsers. Licensed ambient beds may crossfade; timeline-specific pass-by effects need aligned handles. Radio never participates in these transitions.

## Scaling arithmetic (estimates, not measured files or prices)

Decimal MB = Mbps x seconds / 8. Video only, excluding audio/container overhead, retries, posters and additional renditions.

| Duration | Frames at 30 fps | 4 Mbps | 6 Mbps | 10 Mbps |
| --- | ---: | ---: | ---: | ---: |
| 30 seconds | 900 | 15 MB | 22.5 MB | 37.5 MB |
| 5 minutes | 9,000 | 150 MB | 225 MB | 375 MB |
| 40 minutes | 72,000 | 1.2 GB | 1.8 GB | 3.0 GB |

At 6 Mbps, one hour delivered is approximately 2.7 GB per listener; 1,000 complete 40-minute plays imply 1.8 TB transfer before overhead/cache effects. This is transfer arithmetic, not a CDN bill. Repeated cached clips may reduce bytes; a fresh long journey will not. Storage includes every prepared car/camera/lighting version plus masters; three cars and two complete camera programs multiply final-render work roughly sixfold if all else is equal. Audio has separate rights and delivery costs.

Render time must be measured on the selected GPU: frames x measured seconds/frame, plus warm-up/retries. No Unreal frame has been rendered by this workstream, so no exact render hours, GPU bill or quality bitrate is claimed. A 40-minute progression could use 80 x 30-second unique clips or fewer longer shots; compatibility and repetition must be evaluated before choosing. Do not authorize 40 minutes by extrapolating appearance from one still.

## Avenue limits and next step

Keep Avenue hidden and server claims disabled. A sign baked into footage is immutable in ordinary video playback. Future alternatives are prepared variants (storage/render multiplication), tracked compositing with occlusion/depth data (substantial QA), or honest screen overlays (not in-world signs). Existing 3D sign-viewability geometry cannot simply be reused as video impression evidence. No demo views count as sponsor results.

Next: acquire approved Unreal visual frames and actual 30-second sequence, establish licenses, then implement the small independent route above and execute the protocol. Until then, all browser integration/performance conclusions remain **PLANNED / BLOCKED BY VISUAL PROOF**.
