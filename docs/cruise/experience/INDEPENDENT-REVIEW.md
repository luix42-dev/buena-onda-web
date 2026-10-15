# Independent review of Phase Four diagnostics, presence and privacy

October 15, 2026. Read-only source review by the worker who implemented the opening UI, radio refinements and postcard components; this reviewer did **not** implement the metrics store/hook/report, leased-presence changes or privacy boundary under review. Scope is independent for those systems, not independent authorship of the entire feature. Only this review document was edited in this task. No second browser or new external service was started.

## Evidence inspected

- `lib/experience/metrics.ts`, `components/experience/useExperienceMetrics.ts`, `ExperienceMetricsControls.tsx`, `ExperienceReport.tsx`, and the local report page.
- `lib/experience/presence.ts`, `components/real-miami/presence/usePresence.ts`, `LiveCruisers.tsx`, and scene call sites.
- `RadioPrivacyBoundary.tsx`, root layout, Cruise site frame, console action callbacks, and postcard integration.
- Deterministic metrics/presence test source. This reviewer did not independently execute those new suites or a live realtime disconnection test during this review.
- Prior [Phase Three browser results](evidence/phase3/results.json): 12 checks pass, including real audio, remembered station without autoplay, explicit-link precedence, save/export fixtures and metadata fallback. These validate the prior radio gate, not the new Phase Four metrics/presence behavior.

The lead owns browser PNG capture and current integrated gates. No actual postcard image, current Phase Four browser result or physical-device result was available to this reviewer at the initial review snapshot.

## What the source supports

### Local counters and consent

The implemented design is local daily counters, not the earlier optional collector proposal. No new collector/API/JSONL service was found. The metrics module and hook contain no `fetch`, beacon, analytics SDK, IP field, account identifier, persistent user/session identifier, song/station ID, title, artist or location payload. Action callbacks accept a closed event name only. The counter schema rejects unknown keys and bounds values, serialized size and retained UTC days.

Consent defaults off. Reading a report does not enable or write collection. Enabling is a visible setting; the scene passes `active: experienceFirst`, so the hook's inactive path does not read/create a store for old Cruise modes. Action callbacks are only passed for the new mode. The report page reads this browser's local storage and cannot expose other listeners' data; there is no shared report requiring a new account/auth service.

Turning off writes the consent key to `off` before removing the metrics key. Updates re-read shared consent before writing. Storage failures halt collection in the hook and surface a message. Deletion targets diagnostics keys, not station memory, presets or My Finds. Cross-tab storage events refresh state and reset observed milestone bookkeeping when disabled. Deterministic test source covers sequential stale-writer revocation and deletion, corrupt/oversized records and blocked storage.

### Measurement honesty

The report visibly distinguishes this browser's opted-in diagnostic starts from visitors or audience size. It does not publish unique people, conversion rates or seven-day retention. Milestones arise from observed intervals after a measured start; enabling mid-drive does not backfill the opening minute. Timer gaps above 15 seconds are excluded. Parked experience time is included; eligible listening requires playing, unmuted and volume above zero at both sampled endpoints. These are observable browser states, not proof of human attention or speaker output.

Return counters count later measured starts in retained browser data, including reloads/tests. The report explicitly says so. Multiple tabs can lose increments through localStorage last-write behavior; no reliable cohort analysis follows from these numbers. Retention is the latest 30 UTC calendar buckets, not an assertion that all consenting visitors return.

### Leased presence

The new scene requires explicit presence opt-in, a started/visible scene and scenery mode. Its leased channel is separate from old presence channels. The leased branch uses a fresh random identity rather than the old persisted visitor key, renews every 15 seconds and filters missing, malformed, future or at-least-45-second-old timestamps. A five-second expiry poll bounds how long an expired lease can remain displayed after the threshold. Subscription failure/close and teardown clear the displayed result. Hidden/pagehide paths untrack or close the channel; cleanup removes timers/listeners.

The label is **opted-in browser sessions**, not people or actual listeners. It renders nothing when disabled, disconnected or below one. No artificial activity or fallback count was found. Supabase still provides the optional network transport; this is not a no-network presence implementation, and normal service traffic should not be described as hiding client IPs from the transport provider.

### Marketing telemetry boundary

Direct `/cruise/human-radio` and `/cruise/experience…` paths return null from the boundary wrapping marketing analytics, speed insights, Meta, GA, Clarity and site click sounds. Original routes retain their prior behavior. This is a source check of direct-entry mounting; scripts already loaded on another site page cannot reliably be unloaded through this React boundary. A comprehensive site-wide consent design and navigation-path verification remain open.

## Findings sent to the lead

| Finding at initial snapshot | Consequence / requested resolution |
| --- | --- |
| `playback_failure` initially had no recording call | **Source correction verified:** the scene now records once per distinct non-null audio error transition, with a ref reset on error clearing. No recording callback is passed on inactive old routes. Actual outage-counter browser validation remains with the lead. |
| Report initially labeled `postcard_share` as share/download actions, while Download did not call `onShared` | **Source correction verified:** label now reads “Postcard shares or copied links,” matching native-share/clipboard callbacks. Downloads remain uncounted. Neither callback proves external publication. |
| Consent check and metrics write are separate localStorage operations | Sequential stale-writer tests are useful but cannot guarantee atomic deletion across simultaneous tabs. Retain a clear concurrency limitation; stronger guarantees need transactional storage/coordination. |
| `pagehide` tears down leased presence without a `pageshow` resubscribe path | Accepted recovery limitation: BFCache return can leave presence unavailable until remount/enable changes. It fails closed rather than fabricating activity; this is not represented as fixed. |

The lead also changed metrics input to require `audio.playing && !audio.loading`; buffering state no longer qualifies for listening seconds merely because the player preserves its playback intent. Source correction verified. No shared code was edited by the reviewer. Remaining resolution needs source reinspection or actual gate evidence; a message saying a fix is planned does not establish implementation.

An initial [sharing gate artifact](evidence/phase4-hmr-interrupted/results.json) records default-off diagnostics then times out waiting for capture. The lead inspected its screenshot and attributed the returned entry screen to a hot-reload remount during a concurrent audio-hook edit. That cause is the lead's diagnosis, not an independently reproduced result. The failed artifact remains separate; it neither proves postcard capture works nor establishes a capture-component defect. A stable repeat is still required.

## Remaining validation before stronger claims

1. Capture an actual rendered PNG after the render pass and inspect nonblank scenery, exact station/car/location footer, source attribution and absence of audio. Unit tests of postcard metadata alone do not establish a working capture.
2. Browser-test consent off/no counter writes, opt-in observed intervals, actual action callbacks, revoke/delete from another tab and storage denial. Verify no diagnostics network traffic and distinguish ordinary streams/metadata/presence transport.
3. Test leased presence with two genuine opted-in browser sessions, one disconnected without a leave message, expiry, explicit opt-out and BFCache recovery. Test fixtures must be labeled and cannot establish real audience size.
4. Recheck original routes with diagnostics inactive and unchanged share destination; retain prior isolated build and checkpoint.
5. Physical iOS/Android, background/lock-screen audio, prolonged thermal/performance behavior, commercial station permissions and actual participant feedback remain launch work. No new-unit-test or desktop emulation result closes those gaps.

Recommendation at this snapshot: continue the authorized local gates. Source reinspection confirms both counter-accuracy corrections. The design supports a restrained, consent-first local diagnostics foundation and truthful leased-session terminology, with concurrent-storage and BFCache-recovery limitations documented. It does not support public audience metrics or launch readiness by itself, and the stable integrated sharing/browser gate remains pending.

## Final evidence addendum ? lead records subsequent independent QA

A separate QA worker, who did not implement the postcard or rendering controls, opened `final-controlled/drive-180s.png` and `final-low-sharing/actual-gameplay-postcard.png`. The car/cabin and persistent radio controls were visible and readable, and the postcard contained real scene pixels and attribution. The worker read the nine passing sustained-drive checks and ten passing resized-sharing/manual-quality checks. Auto DPR0.92?1.00 yielded49.59FPS average and31.85 minimum sampled one-second average, zero/170 below30. This is not a fixed-DPR1, every-frame minimum or60FPS claim. Only2.66km of the19.64km loop was exercised.

The source-only pending items earlier in this document are historical. Actual PNG, consent/export/deletion, manual quality, real presence joins/opt-out and the final moving trace now have evidence. Abrupt transport expiry, BFCache recovery, simultaneous storage atomicity, physical devices, commercial rights and public audience measurement remain open. Independent recommendation: local playtest ready; public launch not established.
