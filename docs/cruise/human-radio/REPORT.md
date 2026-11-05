# Buena Onda Cruise — Human Radio

Local implementation, October 14–15, 2026. Dedicated branch `feature/human-radio-20261014`, based on `2b7e078`. No deployment, push, payment activation, new paid API, game-asset import or replacement of an existing build.

## Preview and startup

- [Human Radio with the existing Miami garage and drive](http://127.0.0.1:3074/cruise/human-radio)
- [Radio-first entry without a WebGL canvas](http://127.0.0.1:3074/cruise/human-radio?listen=1)
- Existing `/cruise` routing files remain unchanged.

```powershell
cd D:\10-VENTURES\12-buena-onda\cruise-human-radio-20261014
$env:CRUISE_DIST_DIR='.next-human-radio-dev'
npm run dev -- --hostname 127.0.0.1 --port 3074
```

The preview is workstation-local. Installed dependencies are reused through a local junction; private environment configuration is copied locally and ignored. A separate machine needs the existing lockfile dependencies and appropriate environment configuration. No credentials are included in evidence or this report.

## Existing work reused

The actual current scene is `components/real-miami/jeep/JeepNight.tsx`. Its geographic Miami world, roads, licensed vehicle cabins, physical radio, spectrum, automatic drive, sunset/night lighting, 2400-simulation-second sunset transition, camera/director, casting controls, map and advertising renderer are retained. The original campaign/legacy Cruise, Miami test routes, Jeep assets, Neon Run, Vice City worktree and production site are preserved. The new mode restores Wrangler as an additional choice without altering the original garage lineup.

The existing audio hook already implements HTML media playback, station tuning noise, HLS handling, CORS fallback, loading timeout and bounded retry. Existing Jolt/NTS metadata adapters and local bookmark data were reused. Existing Supabase cruiser presence is optional in the new route; it is not a new listener-count backend.

## New vertical slice

| Feature | Actual implementation |
| --- | --- |
| Branding and entry | Requested identity and tagline in existing garage; sunset selected initially; radio can start before car/scenery readiness |
| Persistent radio | DOM controls for station, playback, volume, mute and discovery remain available over cockpit/cinematic views; physical radio continues to work |
| Tuning | Existing tuning noise plus seek buttons and listener-triggered Surprise Me; random selection among eligible alternatives without reading history |
| Directory | Explicit geographic/genre filters, station descriptions, external source/support links, no personalized ranking |
| Presets | Listener-selected favorites, explicit up/down arrangement and local persistence |
| Metadata | Separate fixed-source endpoint, bounded requests, conservative artist/title display, distinct on-air labels, source provenance and expiry |
| My Finds | Validated local collection, safe legacy migration, distinct broadcast bookmarks, removal, cross-tab updates, JSON export, explicit Bandcamp/Spotify/Apple/YouTube searches |
| Sharing | Station/deep links, native share or clipboard fallback, text-only 1080-square SVG discovery card export; no recorded music or album art |
| Listening mode | Canvas unmounts while the same audio owner stays mounted; available via direct radio-first URL and UI |
| Media controls | Browser Media Session metadata and play/pause/station actions when supported; no physical lock-screen validation claimed |
| Privacy | New route does not mount existing marketing analytics, pixel, session replay or site click sounds on direct entry; no new discovery telemetry backend |
| Presence | Explicit opt-in to existing anonymous cruiser channel; no invented counts, no claim of a live listener count |

The original `/cruise/page.tsx` and `CruiseClient.tsx` are not edited. Shared components gain opt-in props with their original defaults. The root layout receives a route-specific boundary around existing telemetry; other routes retain those components. Scripts already loaded by a prior client-side visit elsewhere cannot reliably be unloaded; a site-wide consent/privacy design is still needed before public launch. Direct-entry absence of telemetry and original-route behavior are separate browser checks.

## Station and metadata findings

See [station audit](STATIONS.md) and [metadata evidence](METADATA.md) for exact sources and dated observations. HTTP probes returned 200 and CORS headers for Jolt, NTS 1/2, Rinse, The Lot and dublab. This is endpoint evidence, not permission, audible quality, mobile reliability or an uptime guarantee. Real browser playback evidence exists for Jolt and station selection reaches NTS. Kiosk's official HLS URL returned 404, so only this new catalog disables its direct playback. Additional requested destinations remain external links pending technical and permission verification; Sucker Free identity is unresolved. The existing Buena Onda playlist still encounters its pre-existing upstream fetch failure and is not represented as repaired.

Fresh official requests returned on-air labels for Jolt/NTS/dublab but no sufficiently verified current song during the check. Jolt's combined string is never split into an invented artist/title or DJ. The UI uses generic on-air/broadcast wording. Song saving therefore requires a fresh structured track; broadcast bookmarks remain explicitly separate.

## Validation and evidence

- Focused unit tests: **21/21 pass**, covering station eligibility, metadata windows/provenance/outages/body limits, collection migration/validation/export, manual order, random tuning and SVG escaping.
- TypeScript: full project `npm run typecheck` passed after integration; final checks recorded below.
- Browser: [results.json](evidence/results.json), Edge 155.0.4283.45, Windows, desktop1440×900, DPR1. Jolt playback advanced, audio retained the same element when scenery was enabled, Canvas removal preserved advancing audio, manual presets reordered, filters worked, and no page exceptions occurred.
- Labeled synthetic metadata fixtures verified saving, JSON download, reload persistence and unavailable-metadata fallback. These are **not live song-identification evidence**. The fixture screenshot and exported test data explicitly contain QA labels.
- Viewport checks: 390×844 portrait, 844×390 landscape and 1024×768 tablet, no document overflow, volume visible. These are desktop browser viewport changes, not physical touch/device results.
- First browser run found the map intercepting the listening-mode button. The layout was fixed and the repeat passed. [Initial failed results](evidence/initial-failed-results.json) are retained. An initial continuity assertion also inspected the deliberately inactive Strict Mode trial audio element; it was corrected to compare the actual active element.
- Independent source and screenshot review identified mobile attribution access, share destination, landscape volume, focus behavior and selected-button contrast. Corrections preserve accessible credits in the scrollable panel, experimental sharing links, volume, focus restoration and dark text on selected presets.

Representative real captures: [garage](evidence/desktop-garage.png), [cockpit](evidence/desktop-cockpit.png), [radio-first](evidence/desktop-radio-first-live.png), [portrait directory](evidence/portrait-directory.png), [landscape](evidence/landscape-directory.png), [tablet](evidence/tablet-directory.png). The directory and credits are inside a scrollable panel; an unscrolled screenshot does not prove all content was visible simultaneously.

Performance sample: **32.17 average rAF FPS over15.05s**, longest frame133.2ms, cockpit sunset,1440×900/DPR1, Auto/high, development server, Intel UHD Graphics630 through ANGLE/D3D11. Scene report34.47FPS/259draw calls, JS heap234,309,914bytes (not GPU or total memory). Other build activity occurred during validation; this was not an isolated hardware benchmark. A short development sample is not a sustained benchmark or proof of improvement over the original. Full10-minute and physical low-end/mobile validation remain open. Listening-only mode has zero scene canvas; no GPU-memory measurement is claimed.

## Ranked launch work and decision

**Recommendation: continue development; use this local build for a controlled review.** No public launch is authorized or recommended by these tests alone.

1. Confirm station embedding/commercial permissions and owned-catalog recording rights, resolve unavailable owned playback and Kiosk, and verify the intended Sucker Free station.
2. Improve genuine track metadata coverage. A working save/export UI cannot compensate for stations publishing shows rather than track lists. User-initiated recognition remains disabled pending permission and an approved provider plan.
3. Complete physical iOS/Android/background-audio/lock-screen tests and sustained performance/audio tests on representative hardware, with equivalent settings for any baseline comparison.
4. Finish site-wide privacy/consent, including entry from pages where marketing scripts were previously loaded. Keep station/artist preferences out of advertiser events.
5. Human editorial approval of station descriptions and final mobile visual/accessibility review, including scrolled content and actual touch controls.
6. Community: separate live listener and active cruiser definitions, trustworthy opt-in measurement and event pages. No multiplayer or chat was added.
7. Growth/Claim Avenue: review sharing cards in raster/social export formats; retain existing ad contracts/plots. Commercial terms, exposure validation and payment activation remain outside this pass. No1.5× buyout transactions enabled.

No claims are made for six product phases being finished. Phase One's discovery interface and reliability safeguards are the implemented slice; later phases have only reused/limited foundations.

## Measurement and costs

No new product analytics collection was enabled. Future metrics need explicit event definitions and consent: song-save conversion = consented eligible sessions with at least one **track** save / consented eligible listening sessions; separate broadcast bookmarks. Seven-day return rate needs a clearly defined opted-in cohort, identification/retention policy and exclusion of test traffic. Average listening duration should count actual playback, account for pause/background/disconnect and document censored sessions. The15%/20%/10-minute targets remain unmeasured hypotheses. Such metrics must never rank or tune stations.

Verified incremental subscriptions/paid API activations for this work: **none**. Local operation uses the existing workstation/dependencies and direct station playback. Zero new purchases is not a guarantee of zero hosting, bandwidth, Supabase or account charges after deployment. Metadata polling is about one small request per20s per active listener, with process-local shared upstream caching; serverless instances do not share that cache. At128kbit/s, direct audio is approximately57.6MB/listener-hour, delivered by the station rather than a Cruise audio proxy. These are traffic estimates, not a hosting quote. Existing provider bills/quotas were not audited. AudD's trial is temporary; see official pricing findings in METADATA.md. No trial activated.

## GTA5 iOS reference

[Source assessment](GTA5-IOS-ASSESSMENT.md): independent resolution/quality controls, known-working preset recovery, safe-area touch layouts and cache-commit ordering are useful design references. The native Metal/Xcode renderer is not a browser drop-in; no code or game data was imported. Existing Cruise remains the renderer.

## Final verification ledger

Final production build **passed** (Next.js14.2.15, compilation, lint/type validation and static generation; exit0). Build ID `fKtpDY8w-Wf4_Duon4zyR`. Existing nonfatal framework configuration, image and hook-dependency warnings remain. No dependency upgrades were attempted. Full project typecheck passed separately, focused tests21/21, `git diff --check` clean.

[Resilience results](evidence/resilience-results.json):5/5 scenarios passed with no page exceptions. A deliberately failed Jolt connection recovered by explicit user tuning to real NTS; currentTime1.009?3.509s. Metadata503 did not stop audio and disabled saving. Denied browser storage retained session presets and produced portable empty JSON export. Real emulated touch taps, reduced-motion preference, Escape/Enter focus, landscape volume and scrolled station/credits access passed. [Portrait scrolled stations](evidence/resilience-portrait-scrolled-stations.png), [landscape credits](evidence/resilience-landscape-credits.png). No listed Meta/Clarity/Google/Vercel telemetry requests appeared on direct entries. This is observed network traffic for these paths, not an audit of all prior-script navigation scenarios. The original route initial garage retained night mode and had no Human Radio deck; full baseline driving was not re-benchmarked.

Final browser repeat after visual fixes passed all recorded checks with no page exceptions; its latest performance sample is the32.17FPS result above. The earlier independent screenshot review observed roughly38.8FPS in a different short run; the current artifact is authoritative and neither establishes stable60FPS. My Finds retains the existing200-item cap; simultaneous cross-tab edits use localStorage last-write behavior.

Seek and Surprise Me exclude the known-unavailable owned playlist and use the six audited direct streams. Manual selection of the owned station remains available with existing retry/error handling. This preserves listener choice without sending random discovery into that known outage. Long-term station health is not continuously monitored.

Exact changed paths are listed in [FILES.md](FILES.md). The implementation is committed on the dedicated feature branch; `git log -1 --oneline` identifies this report's checkpoint. The orchestration plan and actual participants are in [PLAN.md](PLAN.md).
