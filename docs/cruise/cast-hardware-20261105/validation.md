# Cruise Cast hardware follow-up — 2026-11-05

Status updated at 2026-11-06 04:10 UTC (November 5 in New York). Work is in progress on `fix/cruise-cast-device`, based on deployed main commit `bab26919884e5e3b22094a043a08ad42cd435539`. This follow-up has not been deployed to production. Public Cast remains disabled.

## Registration and physical test

The real Google Cast application is **Buena Onda Cruise**, application ID **`4B58AA3F`**, type **Custom Receiver**, status **Unpublished**. The user's Google TV Streamer (4K), named La Sala, is registered for testing. Its serial number and account details are intentionally excluded from this evidence.

The app was not initially available to the Streamer after registration. After another power restart, device discovery reported `APP_AVAILABLE`. This observation is consistent with registration propagation or cached device configuration; it does not prove which mechanism caused the initial delay.

The unpublished app temporarily uses an isolated receiver served on the user's local network. Google permits an HTTP receiver during development. The intended production receiver remains `https://www.buenaondalifestyle.com/cruise/receiver`. Production environment variables have not been enabled for Cast by this follow-up.

The actual custom receiver launched on the physical Streamer, and the user confirmed that the Cruise scene appeared on the TV. This is a real device launch, not browser emulation. The sender is desktop Chrome on Windows; physical phone behavior is still untested.

The [receiver observation](receiver-observation.json) records:

- Receiver: Nightride, `ready=true`, `playing=true`, `requested=true`, `loading=false`, volume 0.82, unmuted.
- Receiver scene: Retrowave, Countach, night, night-drive mood.
- Sender: its HTML audio element is paused; its local drive is parked and the engine voice is absent.
- No sender page errors in that captured observation.

The user subsequently confirmed audible TV output for Nightride ("it's working sound on") and Jolt ("Yes, I hear Jolt"). Pause, next-station and volume commands were exercised on the physical receiver; Jolt reported playing at volume 0.55. The Retrowave-to-Highway change acknowledged `ready=true`, and the sender's HTML audio remained paused. Later telemetry also reported City and a return to Retrowave ready with the Countach; the remaining world, rapid-control and reconnection matrix is still in progress.

These results establish real TV scene/audio playback and an acknowledged handoff for the two tested streams. The captured sender media state shows local HTML playback stopped; this is not a separate acoustic certification of every output device. Receiver FPS, memory usage and sustained graphics performance have not been measured.

## Changes prepared

- Sender connection state remains pending until a matching receiver acknowledgement. Request IDs and station matching prevent stale handoff or station responses from taking ownership.
- Disconnect waits for the Cast session to end before local playback resumes. Existing-session and paused handoffs preserve the requested volume, mute and playback intent.
- The receiver starts muted, preserves commands during scene warmup, validates station and scene choices, and acknowledges observed state. CAF messages wait for SDK readiness.
- Remote ownership parks the sender's local drive and silences its engine without sending an unintended pause to the TV. A receiver can start its scene without starting radio playback.
- Promotional cards retain the campaign message, name where useful, CTA and accessible dismissal. Generic “Roadside Ad,” “Ad · Buena Onda,” format labels and “Just passed” copy are removed.

## Verification record

| Check | Recorded result |
| --- | --- |
| Google app and test-device registration | Complete; app remains unpublished |
| Physical custom receiver launch | Passed; user confirmed scene visible |
| Nightride receiver handoff and TV audio | Matching acknowledgement; sender HTML audio paused; user confirmed TV sound |
| Jolt receiver playback and TV audio | Playing state observed at volume 0.55; user confirmed TV sound |
| Pause, next station and volume | Commands exercised on physical receiver; state responses observed |
| Local double-audio prevention | Sender HTML audio remained paused during receiver playback; local engine voice absent |
| Retrowave / Highway / City | Receiver acknowledged ready scenes with Countach; additional combinations remain in progress |
| Rapid station changes, reconnect, disconnect, network loss | Hardware matrix still in progress |
| Other cars and moods on receiver | Pending hardware verification |
| Physical phone, lock-screen and steering-wheel controls | Not tested |
| Sustained receiver graphics performance | Not measured |
| Public production Cast activation | Not performed |

Bounded GET probes of the actual configured Nightride and Jolt URLs returned HTTPS 200, `audio/mpeg`, no redirects and successful TLS verification for both the isolated receiver origin and production www origin. Nightride allows any origin; Jolt reflected the requested origin. See [HTTP probe summary](http-probes.json). The deliberate three-second stream cutoff is expected, and does not represent a failed endpoint.

The focused sender, receiver and scene-seed regression checks passed **17/17**. TypeScript checking exited 0. The local Next.js production build exited 0 at approximately 04:02 UTC, with the real application ID and the two candidate station IDs configured only for the isolated build. This build result is not a production deployment. See the [automated result summary](automated-results.json).

The browser regression matrix passed at **360×844, 390×844, 430×844, 844×390 and 1440×900**, with zero page errors. These checks use headless browser emulation; they do not represent a physical phone. See [matrix results](browser-results.json) and the [desktop confirmation](desktop-results.json). The earlier desktop screenshot captured warmup and is not used as visual evidence.

The prior mobile release recorded four existing Stripe checkout test failures caused by `revalidatePath` outside a Next.js static-generation store. No checkout or webhook source changes are part of this follow-up. No new full-suite result is inferred from the focused checks.

## Screenshots

[360 px](mobile-360.png), [390 px](mobile-390.png), [landscape](mobile-landscape.png), [desktop after warmup](desktop.png), [station picker](station-sheet.png), [More](more-sheet.png).

The [connected sender](connected-sender.png) shows the desktop Chrome sender at a mobile viewport controlling the physical La Sala Streamer. It is a screenshot of the sender interface, not a TV capture or a physical phone screenshot. Public Cast remains gated despite the button being enabled in this isolated test build.

## Before public activation

1. Finish the remaining real-device matrix, including cancellation, rapid controls, mute, additional scene/car/mood combinations, reconnect, disconnect and network loss. Retain the confirmed audible Nightride/Jolt results and retest affected cases after any changes.
2. Test the HTTPS receiver deployment and the actual station origins used for release. The candidate station list in the isolated test is not a claim that every catalogue station is Cast-compatible.
3. Restore the registered receiver URL to the production HTTPS route, publish the receiver only when its release checks pass, and configure only validated station IDs together with the real application ID. These public build-time values require a rebuild.
4. Verify the resulting production deployment and record its exact commit and deployment URL. Keep Cast hidden if any required receiver setup or hardware test remains incomplete.

Evidence contributors: `/root`, `/root/cast_sender_fix`, `/root/cast_registration_review`, and `/root/cast_stream_probe`. Local raw artifacts remain outside the repository; the committed summaries exclude device serials, account information, local IPs and Cast session identifiers.

Official references: [Cast registration](https://developers.google.com/cast/docs/registration), [Web Sender integration](https://developers.google.com/cast/docs/web_sender/integrate), [receiver features](https://developers.google.com/cast/docs/web_receiver/core_features), [Android TV debugging](https://developers.google.com/cast/docs/android_tv_receiver/debugging).
