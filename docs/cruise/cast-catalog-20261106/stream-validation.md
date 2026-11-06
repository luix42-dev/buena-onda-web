# Cruise complete selectable station validation — 2026-11-06

All **14 currently selectable stations** passed an independent browser playback check on the production website at baseline commit `664dd31`. Each selected station showed about five seconds of actual media-time advancement, a matching station label and source, one playing HTML media element and no final media error. There were **zero page exceptions**. These are Chrome playback observations, not TV decoding or audible-output certification.

The release agent owns the later physical-device matrix and production activation. This report records the independent HTTP/browser baseline and does not claim a later deployment completed.

## Results

| Station ID, in displayed order | HTTP content type | HTTP result | CORS/browser behavior | Media advancement | Browser |
| --- | --- | --- | --- | --- | --- |
| buena-onda-radio | application/json | 200; 6 tracks: 206 | Same-origin manifest | 5.013 s | Pass |
| jolt-radio | audio/mpeg | 200 | https://www.buenaondalifestyle.com | 5.009 s | Pass |
| nts-radio | audio/mpeg | 200 | Recovered CORS fallback | 5.012 s | Pass |
| nts-radio-2 | audio/mpeg | 200 | Recovered CORS fallback | 5.006 s | Pass |
| wvum | audio/aacp | 200 | * | 5.018 s | Pass |
| the-lot-radio | application/vnd.apple.mpegurl | 200 | * | 4.977 s | Pass |
| dublab | audio/mpeg | 200 | https://www.buenaondalifestyle.com | 5.005 s | Pass |
| hkcr | application/vnd.apple.mpegurl | 200 | * | 4.969 s | Pass |
| veridian-club | application/json; charset=utf-8 | 200; 85 tracks: 206 | Recovered CORS fallback | 5.013 s | Pass |
| nightride | audio/mpeg | 200 | * | 5.007 s | Pass |
| darksynth | audio/mpeg | 200 | * | 5.009 s | Pass |
| chillsynth | audio/mpeg | 200 | * | 5.004 s | Pass |
| datawave | audio/mpeg | 200 | * | 5.008 s | Pass |
| spacesynth | audio/mpeg | 200 | * | 4.998 s | Pass |

The exact stable configured URLs and per-station results are in [stream-validation.json](stream-validation.json). Raw response headers, track URL probes and browser event logs remain outside the repository under `.tmp/cruise-release/cast-all-stations/`. No signed provider URLs, account/device identifiers or raw audio bodies are included here.

## HTTP coverage

All source responses used HTTPS, verified TLS and returned HTTP 200. Live-stream GET requests were limited to three seconds; curl exit 28 at that deliberate cutoff is expected. File probes requested bytes 0–4095 and discarded audio bodies.

- Buena Onda's same-origin JSON manifest contains **six recorded MP3 tracks**. All six returned 206 and allowed the production origin. The same-origin manifest does not require CORS headers.
- Veridian Club's manifest contains **85 recorded MP3 tracks**. All 85 returned 206 after an HTTPS redirect to temporary S3 URLs. Keep the stable official player URLs: the signed destinations expire.
- The Lot's HLS master, **all five variant playlists and one TS segment from each** responded successfully with CORS support. The receiver's existing hook chooses the lowest variant, advertised as 426×240 at 425,360 bits/s with H.264/AAC-LC. There was no audio-only variant.
- HKCR's HLS playlist and a current TS segment passed HTTPS/CORS checks; codecs are not declared in that media playlist. WVUM advertises `audio/aacp`. Both also played in this Chrome test.

## CORS findings and actual recovery

The first redirect from both configured NTS URLs lacks ACAO. Veridian's official player redirects also lack ACAO. Chrome reported two CORS failures for each of these three selections; the existing same-element retry then removed `crossorigin` and ordinary media playback succeeded. The final steady state had no media error and time continued advancing. This fallback sacrifices optional analyser capture, not the station's audio playback.

The NTS redirects point to `https://streams.radiomast.io/nts1` and `https://streams.radiomast.io/nts2`. Independent follow-up probes confirmed those paths allow CORS throughout the remaining chain, including final responses to `Origin: null` after cross-origin redirects. No application source URL was changed in this audit.

## Browser method and limits

Fresh headless Chrome **156.0.8078.80**, new independent context, **390×844**, mobile/touch emulation. The script entered Retrowave and selected all fourteen stations using the actual station picker. It observed each station for five seconds after playback began and checked actual HTML media state, source, label and elapsed time. The browser was launched with `--mute-audio`; no audible-output claim is made. It did not attach over CDP, open a Cast picker, or join or change any TV session.

Only the initial chosen track of each recorded station was played; full-track endings and subsequent playlist transitions were not tested here. The HTTP probes cover all 91 current recording URLs. HLS buffering under sustained load, actual TV decoding, physical phones, network loss and audible output require separate evidence.

Twelve other catalog entries are disabled external website links rather than selectable streams: Poolsuite, Kiosk Radio, WDNA, Depa.Radio, Sucker Free Radio, Radio FG, KEXP, Radio alHara, Radio Nopal, KCHUNG, KPISS and WFMU. They are excluded from the fourteen-station claim.

Official references: [Google Cast supported media](https://developers.google.com/cast/docs/media), [custom receiver core features](https://developers.google.com/cast/docs/web_receiver/core_features). These document codec/device differences and CORS requirements; successful workstation HTTP and Chrome playback do not substitute for the physical receiver check.
