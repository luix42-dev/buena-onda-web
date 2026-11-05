# Station source and reliability audit

Audit date: October 14, 2026. Scope: the new Human Radio experiment only. Neither `lib/cruise/stations.ts` nor `lib/real-miami/stations.ts` was modified.

## What the evidence establishes

The catalog reuses all nine existing entries (including external Poolsuite) and adds ten external destinations. Seven entries remain eligible for playback: Buena Onda's existing playlist plus six remote streams. Kiosk's existing stream failed the probe and is external-only in this experiment. The original catalogs retain their original values.

The probes used Node's HTTP GET with `Origin: http://127.0.0.1:3072`, a ten-second deadline, inspected response headers, then canceled each response body. A `200` and audio content type establish a reachable endpoint at that moment. They do **not** establish audible decoding, full HLS segment health, sustained reliability, mobile behavior, browser autoplay compliance, or permission. CORS headers below describe the response to this origin, not every possible origin. There was no continuous recording or relay.

| Existing source | HTTP finding | CORS response | Official attribution / limitation |
| --- | --- | --- | --- |
| Buena Onda | Existing `/api/radio/tracks`; not a remote stream probe | Same origin | Existing `owned` designation retained; underlying catalog licenses not independently validated |
| Jolt | `200 audio/mpeg` | Echoed request origin | [Official homepage](https://www.joltradio.org/) publishes `https://streamer.radio.co/sd8ab6b5aa/listen` in its public player data |
| NTS 1 | `200 audio/mpeg` following redirect | Echoed request origin | [Official station](https://www.nts.live/); existing direct URL preserved; redirected to Radio Mast Miami edge |
| NTS 2 | `200 audio/mpeg` following redirect | Echoed request origin | [Official station](https://www.nts.live/); existing direct URL preserved; redirected to Radio Mast Miami edge |
| Rinse France | `200 audio/mpeg` | `*` | [Official channel](https://www.rinse.fm/channels/france); existing pro-fhi source retained, but current official page source equivalence not independently established |
| The Lot Radio | `200 application/vnd.apple.mpegurl` | `*` | [Official station](https://www.thelotradio.com/); existing Livepeer HLS source retained; variant media and segments not checked in this HTTP probe |
| Kiosk Radio | `404 text/html` after redirect to `origin.streamnerd.nl` | `*` | [Official station](https://www.kioskradio.com/) public `_app` JavaScript contains the exact existing Streamnerd HLS URL and an alternate channel; no alternate silently substituted |
| dublab | `200 audio/mpeg` | Echoed request origin | [Official station](https://www.dublab.com/); existing Airtime source retained; current official page source equivalence not independently established |
| Poolsuite | Existing external-only destination | Not probed | [Official website](https://poolsuite.net/); permission-required status preserved |

Exact remote URLs remain in the existing station module. The sole override in `HUMAN_RADIO_STATIONS` disables Kiosk's source and points listeners to its website. An outage is a dated observation, not a permanent judgment about the station.

## Requested stations investigated without automatic stream integration

| Candidate | Official or attributed destination | Verified findings and remaining work |
| --- | --- | --- |
| WDNA | [How to Listen](https://wdna.org/how-to-listen/), [current listening page](https://wdnaradio.org/listen/) | Official listening instructions, playlist/show/host links exist. A reusable live endpoint, metadata license and third-party embedding permission were not established. |
| Depa.Radio | [Official website](https://depa.radio/) | Reachable HTTPS page describes 24/7 radio from Departamento Studio Bar in Mexico City and publishes shows/schedule. No approved reusable audio/metadata adapter established. |
| Sucker Free Radio | [Attributed Mixcloud archive](https://www.mixcloud.com/SuckerFreeRadio/) | Identified archive with named shows; exact intended live station identity and authentic live stream remain unverified. Clearly labeled as an archive destination. |
| Radio FG | [Official website](https://www.radiofg.com/) | Reachable official page publishes player URLs with session-like tokens and track lookup UI. Tokens were not copied into the catalog; permission, stability and metadata terms remain unreviewed. |
| KEXP | [Official third-party streaming URLs](https://kexp.org/streaming-urls/), [playlist](https://kexp.org/playlist/) | Official source explicitly lists `https://kexp.streamguys1.com/kexp64.aac` and `https://kexp.streamguys1.com/kexp160.aac` for third-party players. User requested investigation only. Not integrated or separately stream-probed. Commercial context and metadata reuse need review. |
| Radio alHara | [Official website](https://radioalhara.net/) | Official page includes broadcasts and archive schedule. No stream or metadata adapter integrated. |
| Radio Nopal | [Candidate website](https://radionopal.com/) | Browser research tool returned an internal error. Current site/stream availability and official identity need re-verification; listed as unverified in editorial copy. |
| KCHUNG | [Official stream page](https://www.kchungradio.org/stream) | Official homepage redirects to its stream page. Integration, metadata and permissions unreviewed. |
| KPISS | [Official website](https://kpiss.fm/) | Website resolved in the research browser but returned no parsed text. Player, metadata and permission review incomplete. |
| WFMU | [Official website](https://www.wfmu.org/) | Official freeform station site reachable. No stream or metadata adapter integrated. |

Descriptions are initial editorial drafts grounded in station pages and require human review. Genre and location labels are explicit navigation, never inferred listener preferences. Unknown identity/location is labeled unverified rather than invented.

## Metadata and launch limits

This station audit makes no song-identification claims. A station's schedule, visible playlist, show title, or ICY text is not automatically verified current artist/track data. No paid audio recognition service was activated. No protected API was accessed. NTS's public page advertises supporter live tracklists; do not bypass supporter restrictions or represent a show title as a track. The metadata implementation must separately document each source and its freshness.

Existing catalog labels such as `approved` and `public-stream` are inherited code classifications, **not new grants of legal permission**. A public URL, permissive CORS header, or player published by a station does not authorize rebroadcasting, redistribution, recording, sponsored use or artwork reuse. Rights for third-party in-app playback in this commercial city context remain a launch review item. Until established, new candidates are external-only. No audio proxy, download, payment or paid recognition was added.

Remaining validation: actual browser decoding and playback after a gesture, HLS variants/segments, stream error recovery, long listening sessions, mobile background behavior, physical devices, geographically variable stream access and documented station permissions. HTTP probe results must not be reported as physical-device or sustained audio validation.

Operating costs: this catalog adds no subscription or paid API. Listener streams load directly from providers; provider policies and availability apply. Existing hosting and metadata request costs require separate measurement; no recurring dollar amount was verified here.
