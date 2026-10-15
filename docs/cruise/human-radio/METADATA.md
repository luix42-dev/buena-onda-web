# Human Radio metadata — 2026-10-14

## Implemented guarantees

The isolated `/api/cruise/human-radio/now-playing?station=ID` endpoint accepts catalog IDs only. It never accepts a URL, proxies audio, follows redirects, reads credentials or invokes recognition services. The existing Cruise metadata route and all original radio adapters remain unchanged.

Jolt and NTS reuse `getCruiseNowPlaying` with an additional exact-source and 20-second observation freshness check. Jolt's combined title is a program label, not a parsed artist/song. NTS broadcasts remain shows. No DJ is inferred from punctuation in a title.

Dublab uses the existing official Airtime endpoint with stricter parsing because the shared legacy adapter accepts track items without timestamps. Both current-item timestamps must exist and enclose the current UTC time. Both structured `artist_name` and `track_title` must exist. Filenames and unknown placeholders are rejected. Previous and next tracks are never promoted. Show schedule windows use Airtime's published timezone offset; missing offset or expired windows suppress the show. No show host is guessed.

Provider metadata is attributed as `confidence: provider`, with source URL, observation time and expiry. It is not independently fingerprinted audio or a numeric match score. A track expires at the earlier of its provider end time or 20 seconds. `isFreshHumanRadioTrack` is the shared save eligibility guard. Unavailable data displays **Track information unavailable**, preserving a valid show separately when possible.

Network requests use a five-second abort, 256 KiB maximum actual payload, JSON content type, fixed endpoints, no redirects, short process-local caching and request deduplication. Failures become unavailable; expired successes are never served as current. Multi-instance deployments have separate process caches. Existing adapters already apply the same request bounds for Jolt/NTS.

## Evidence and limits

Official sources: [NTS live endpoint](https://www.nts.live/api/v2/live), [Jolt Radio.co status](https://public.radio.co/stations/sd8ab6b5aa/status), [dublab Airtime live info](https://dublab.airtime.pro/api/live-info), [dublab](https://www.dublab.com/).

The research browser initially returned a **cached June 5, 2026** Airtime document. A subsequent direct Node server-side fetch bypassed that research cache and verified all three endpoints at **2026-10-15 02:18:15 UTC** (October 14 evening, New York). Requests used an eight-second timeout and rejected redirects. Results:

| Endpoint | Actual result | Available schema |
| --- | --- | --- |
| Jolt Radio.co | HTTP 200, application/json, status online | Combined current_track.title and start_time; no structured artist field |
| NTS live | HTTP 200, application/vnd.live-list+json | Channels 1 and 2; broadcast_title and active start/end timestamps |
| dublab Airtime | HTTP 200, application/json | Current type livestream, no track metadata; currentShow plus America/Los_Angeles offset -25200 |

The real metadata reader was also executed against these services at **02:18:30–31 UTC**. Jolt returned `Boblebad - Balearic Heavenz` as an opaque on-air label; NTS 1 returned `Rắn Cạp Đuôi`, NTS 2 `DISCOSTAN`, and dublab `sounds of NOW`. All returned null track title/artist and no inferred DJ. Dublab's current live-source window was 01:00–03:00 UTC. This proves live show/on-air fallback behavior at that moment, **not a live song-save demonstration or sustained availability**. Jolt's combined label could describe either a song or program; use a generic “On air” heading rather than claiming it is a verified show name.

Deterministic tests use invented fixtures explicitly labeled as test data. Neither screenshots nor fixtures establish reliable live metadata coverage.

No additional station adapters were added without verified official endpoints. Missing provider metadata is an expected limitation, especially live DJ sets. Publicly reachable metadata does not establish permission to commercially embed or redistribute the station audio; station permissions remain a separate launch review.

## Recognition evaluation, not activation

[AudD's official pricing page](https://audd.io/pricing/) describes a trial for eligible new accounts of 300 requests within 14 days, no card, and an automatic stop at the limit. This is an evaluation allowance, not a recurring free production tier. It lists a $5/month entry plan and $45/stream/month monitoring. Pricing is time-sensitive; confirm before any approval. [API documentation](https://docs.audd.io/) requires an API token and accepts submitted audio or a URL.

No account, token, trial, audio capture or recognition request was created. No paid service was enabled. Before any user-initiated recognition, confirm station/audio submission permission, browser capture feasibility and an enforced spend cap. Keeping this feature unavailable is preferable to silently uploading or continuously identifying station audio. Provider metadata incurs no new paid API subscription in this implementation; hosting and bandwidth remain deployment-dependent.

## Tests

`tests/human-radio-metadata.test.ts` checks structured tracks, separate shows, no inferred DJ, exact expiry, stale/future/missing windows, unknown IDs and prototype keys, payload limits, unavailable fallbacks, fixed fetch destinations, redirect rejection configuration, deduplication and outage invalidation. **8/8 passed** under Node 24.14.0 on Windows on October 14, 2026. Initial sandbox execution could not spawn Node's test worker (EPERM); the approved unrestricted retry passed. Tests perform no live requests. Run with `node --import tsx --test tests/human-radio-metadata.test.ts`.
