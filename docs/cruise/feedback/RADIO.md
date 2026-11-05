# Experimental radio additions

Owner: `/root/qa_security`; exact model identifier unavailable. 2026-10-10.

## Implemented

Miami Test receives an explicit catalog containing Rinse France, The Lot Radio, Kiosk Radio and dublab. The default `CRUISE_STATIONS` catalog and original route remain unchanged. The shared audio hook and cockpit provider accept an optional catalog; existing callers keep the default. The cockpit keeps four physical preset buttons and seeks through all eight playable stations. The experimental menu exposes all eight.

Public listener sources were found in the stations' own sites/assets:

| Station | Official evidence | Playback source |
|---|---|---|
| Rinse France | [France channel](https://www.rinse.fm/channels/france), embedded `streamerMountPoint` | `https://radio10.pro-fhi.net/flux-trmqtiat/stream` |
| The Lot Radio | [Official homepage](https://www.thelotradio.com/), embedded The Lot Live player source | `https://livepeercdn.studio/hls/85c28sa2o8wppm58/index.m3u8` |
| Kiosk Radio | [Official homepage](https://www.kioskradio.com/), its `/_next/static/chunks/pages/_app-2a7a8dcd6c12df3b.js` player bundle | `https://play.streamnerd.nl/kioskradio/kioskradio/playlist.m3u8` |
| dublab | [Official homepage](https://www.dublab.com/), `/js/app.e4707e94.js` stream state | `https://dublab.out.airtime.pro/dublab_a` |

These are labeled `public-stream`, not licensed/approved. Published listener URLs do not establish permission to record, rebroadcast, imply endorsement, or sell sponsorship against those stations.

HLS dynamically loads the already installed `hls.js` where MSE is supported, falling back to native HLS when MSE is unavailable; no package installation or dependency change. It prefers audio-only levels, otherwise fixes the lowest bandwidth level. Buffer targets are 12 seconds, capped at 20 seconds, no back buffer or worker. Station switches and unmount destroy the HLS instance; revision guards discard late callbacks. Playback still requires the existing user audio-unlock gate.

## Verified

Read-only direct GET/header probes on 2026-10-10 returned HTTP200 and `Access-Control-Allow-Origin: *` for all four source URLs. Rinse and dublab returned `audio/mpeg`; Lot and Kiosk returned HLS manifests.

- Lot: five video+audio variants, lowest 426×240 at approximately425kbps. No audio-only variant advertised.
- Kiosk: one 1920×1080 video+audio variant at approximately2.93Mbps. No audio-only or lower resolution variant advertised.
- Catalog unit tests cover original catalog isolation, eight experimental playable entries, public-source classification, and rejection of permission-required/disabled/external/empty sources. Both catalog tests passed within the lead's final64/64 sequential suite; the production build also passed.

## Pending / limitations

Header success alone is not evidence of browser decoding, audible playback, live FFT analysis, reliable station switching or acceptable sustained FPS. The integrated desktop Edge browser results below establish current playback/analysis state; longer-term reliability remains separate. Physical Safari/AirPlay and Chromecast remain separate device gates.

Kiosk's published feed carries substantial video bandwidth even though Cruise renders no station video. Native HLS may select its own rendition; the hls.js path explicitly pins the cheapest advertised level. Do not claim an audio-only transport or negligible decoding cost. If runtime cost is unacceptable, an official audio-only endpoint is still needed.

## Initial integrated browser findings

Lead's local production Edge154 functional run recorded Rinse France, Lot and dublab playing with `source: live`; Kiosk was paused with no error after30s. Follow-up independent real Next browser diagnosis at844×390 found Edge advertises and uses native HLS. Kiosk decoded successfully after an explicit play gesture: `playing: true`, `source: live`, energy0.505 after12s. Its metadata took longer to arrive than Lot's; the initial harness could press a button labeled Play while playback was already requested/buffering, thereby toggling it off. Lead corrected the control label and retry logic to match playback intent before the final run.

The same diagnostic also observed a separate intermittent Lot native demux failure (`DEMUXER_ERROR_COULD_NOT_PARSE`, media error4) after playback started. Earlier successful playback does not establish continuous reliability. The final integrated rerun below supersedes this initial result. These were desktop Edge tests of the actual local production app, not physical mobile verification.

The final adapter now prefers hls.js when supported to avoid the observed native demux instability and enforce the lowest rendition. Native support remains the fallback. The final browser run verified both Lot and Kiosk playing with live analysis through the MSE-preferred adapter.


## Final integrated verification

Evidence: [functional/results.json](functional/results.json), actual local production Next app, desktop Edge154, emulation rather than physical phone hardware. All seven external stations were playing with no reported radio error. Five reported live audio analysis; NTS1 and NTS2 used the explicitly reported capture-restricted fallback.

| Station | Playback | Visualization source |
|---|---|---|
| Jolt Radio | Playing | Live FFT |
| NTS1 | Playing | Groove fallback ? capture restricted |
| NTS2 | Playing | Groove fallback ? capture restricted |
| Rinse France | Playing | Live FFT |
| The Lot Radio | Playing | Live FFT |
| Kiosk Radio | Playing | Live FFT |
| dublab | Playing | Live FFT |

NTS diagnostics explicitly reported `Capture restricted; radio playback unaffected`. This is not live FFT and no restriction bypass was attempted. Read-only NTS probes also returned HTTP200 audio/mpeg with permissive CORS headers; those headers alone do not guarantee successful browser capture.

The ten-minute Lot soak and final night performance run remain pending at this report update. Short playback checks do not prove uninterrupted long-session reliability, audible output on physical TV hardware, or mobile decoding performance. The original owned Buena Onda playlist was not part of the seven external-station playback claims.

## Completed long run

The final Lot Radio/night/Director soak ran600.573seconds with no recorded playback-state interruption,page error or context loss and three natural loops. Live analysis remained active at sampled intervals. This is local desktop evidence,not physical audible verification. Mixed-camera30-second means ranged29.58–46.97FPS,so the performance floor still fails. See [report](REPORT.md) and [raw soak](soak/results.json). The earlier pending note describes the state before this completed run.
