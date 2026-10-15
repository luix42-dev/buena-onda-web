# Experience measurement: bounded local diagnostics

Design reviewed October 15, 2026. This is an analysis/design document, **not evidence that measurement or lease expiry has been implemented**. Scope for the next authorized pass: opt-in local counters and an internal browser report with export/delete. No server collector, marketing integration, new account, paid service or audience claim.

## Existing implementation assessed

`components/human-radio/RadioPrivacyBoundary.tsx` excludes site marketing telemetry components from the human-radio route and `/cruise/experience` paths. Preserve that exclusion: metrics consent must not activate Google Analytics, Meta, Clarity, Vercel analytics or the existing generic Cruise event sender. `lib/cruise/analytics.ts` forwards events to `window.gtag` when present and stores an in-memory event list, so it is inappropriate for this isolated local-only feature. A prior visit elsewhere in the SPA can already have loaded external scripts; unmounting components does not guarantee those scripts or their earlier network activity disappear. Verify fresh direct entry separately from navigation from another route.

The existing presence hook is `components/real-miami/presence/usePresence.ts`, with a reducer and UI in that directory. It distinguishes production from preview/local channels, tracks visible tabs and a browser-local visitor identifier, untracks hidden tabs, and fails closed on subscription errors. However, `countPresence` only examines visitor values: the tracked `at` timestamp is ignored, there is no local timestamp expiry, and tracking runs at join/visibility changes rather than on a lease heartbeat. Existing documentation's assertion that stale counts never appear is stronger than this code establishes. A remote browser going offline without a clean leave may remain until transport/server cleanup; no exact cleanup bound is proven here.

## Consent and storage boundary

Metrics start disabled. Explain the actual scope briefly: “Save technical listening counters in this browser. Nothing is sent to Cruise.” Presence is a separate choice because it does transmit ephemeral presence to an existing service. Neither choice is needed to play radio, drive, save finds, use presets or share a link.

Use a dedicated versioned storage key. Store validated aggregate counters, not an event history. Recommended bounds: at most 30 UTC-day buckets, a small fixed schema, finite nonnegative integer counters and a fixed maximum serialized size. Ignore unknown fields and corrupt records; fail to session-only storage with a visible limitation if localStorage is blocked. No persistent session identifier is necessary. A volatile ref can prevent duplicate starts in one mounted session. Avoid auto-collecting a session merely because the landing page rendered.

On revocation, stop timers/listeners immediately, discard pending changes, remove stored metrics, and make active callbacks no-ops. Propagate revocation/deletion across tabs through the storage event and recheck current consent before writes; a stale tab must not restore deleted data. “Delete metrics” clears only the metric collection. Preserve My Finds, presets and unrelated browser settings. Deleting counters may leave the user's explicit disabled consent preference so collection does not silently resume.

Export a versioned JSON object containing counters, reporting window, enabled scope, and limitations. Omit raw URLs, query strings, console errors, titles, device identifiers and anything absent from the strict schema. Download only after a user action; there is no automatic upload. A local report cannot be read by the product team unless its owner deliberately shares the export.

## Event allowlist

Only these coarse events should change local counters. No general-purpose arbitrary payload argument is needed.

| Event/counter | Trigger and bounds |
| --- | --- |
| `sessions_started` | Once after an explicit entry/start action within a consented mounted session |
| `playback_started` | First confirmed playback in that session; requesting autoplay is not success |
| `listening_seconds` | Observed eligible playback intervals; exclude paused/loading/stalled playback, muted/zero-volume time and unexplained long timer gaps |
| `station_changes` | Explicit successful selection of a different station; count action, omit station ID/name |
| `finds_saved` | A fresh verified track is newly saved; exclude removal, loading, duplicate clicks and invalid metadata |
| `share_completed` | A share promise succeeds or a link is copied; exclude opening a menu or cancelling native share |
| `playback_failures` | Confirmed player error/failure; count transition once, omit raw error text/URL |
| `render_samples` / bounded frame-time summary | Optional sampled durations only; no GPU fingerprint, user agent, detailed hardware profile or per-frame log |

Do not store station IDs, track/artist/DJ/show names, genres, My Finds content, music searches, advertising exposure, route coordinates, referrers, IP addresses, user accounts or taste profiles in metrics. Counters must not influence station order or tune the radio.

Timer intervals alone do not prove audible listening. Browser throttling, stalls, suspension and background playback complicate attribution. Prefer player lifecycle confirmation and conservatively bounded deltas; call the result **observed eligible playback seconds**, not verified human attention or complete listening duration. Stop accumulating when signals become unknown. Do not retroactively backfill consent-free or suspended time.

## Honest report and denominators

The internal report must say **This browser only · opt-in · includes testing**. It represents storage, not people. Multiple devices, profiles, cleared storage and private windows cannot be deduplicated; multiple tabs need coordinated writes to avoid overwriting or double-counting. If cross-tab atomicity is not implemented, disclose it and avoid precise cross-tab duration claims.

| Proposed launch hypothesis | Correct denominator, if later measured | What this pass can actually say |
| --- | --- | --- |
| 15% save a song | Unique eligible visitor cohort; visitors with at least one valid save / all eligible visitors, with consent and missingness disclosed | Count save actions locally. `saves / sessions` is actions per consented session, **not visitor conversion**; it may exceed 100%. |
| Mean listening session at least 10 minutes | Eligible total duration / all qualifying listening sessions, including short sessions and documented open/censored sessions | Report observed eligible seconds and confirmed playback-session counts. State incomplete-session and suspension limits; do not call elapsed tab time listening. |
| 20% return within seven days | Complete first-visit cohort observed for seven days; returning unique visitors / cohort, with censoring and consent loss reported | **Not measurable in this pass.** No seven-day retention percentage or return-visitor claim. |

Without an explicit per-session conversion indicator, totals of saves/shares cannot establish how many distinct sessions converted. Avoid displaying a conversion percentage computed from unrelated action totals. No counts should exclude failures or zero-save sessions merely to improve the ratio. Browser/device QA records belong in test evidence with measured viewport/DPR/quality/cache conditions, separate from listener analytics.

## Isolated opt-in presence proposal

Use an experience-only environment-specific channel so existing Cruise visitors, previews and automated tests cannot inflate each other. Require independent presence opt-in. Transmit only a rotating session key, a coarse active state if truly necessary, and lease timestamps; omit stations, music and persistent metrics identifiers. A count describes **fresh opted-in browser sessions**, not total listeners or unique people. Distinguish visible cruisers from background listeners only if the implementation actually measures both; otherwise use one accurately scoped label.

A bounded lease needs both refresh and expiry: publish at a stated interval, validate timestamp shape/range, and count only entries inside the freshness window. Recompute expiry locally even without incoming sync events. Hide the count on channel failure or unknown state; do not turn unknown into a fake zero. Untrack on revoke, hidden state if visibility defines eligibility, pagehide and unmount. Consider page restoration/rejoin explicitly. Root owns the implementation and must choose intervals compatible with the existing plan's limits; this document makes no claim about current quotas or exact backend removal timing.

Client-reported timestamps and public anonymous presence remain spoofable. Local clock skew can also affect leases. This is a lightweight social cue, unsuitable for advertising invoices, audience totals or financial metrics. Verify two real isolated browser contexts, expiry after missed refresh, revocation, offline failure, duplicate tabs and cross-environment isolation before calling it working.

## Future aggregate collector: explicitly deferred

A later collector requires separate authorization and review of transport, retention, consent, operational cost and deployment. It should accept a strict schema of coarse counters, omit taste and identifiers, separate test traffic, reject malformed/rate-abusive submissions and publish reporting denominators. Receiving a request inherently exposes network metadata to infrastructure even if the application does not retain IPs; avoid promising anonymity without assessing that system. No collector, endpoint, subscription or payment is authorized by this design pass.

Acceptance tests for local metrics should cover default-off behavior, exact event allowlist, revoked callbacks, storage failure/corruption, bounded data, repeated starts, stale-tab deletion, safe export, preservation of My Finds, and absence of any network request from the metric module.
