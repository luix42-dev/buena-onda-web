# Live Cruise casting — 2026-11-07

The in-app Cast button now opens Google's TV picker and streams the current device's rendered drive and radio/engine mix over WebRTC to the existing Buena Onda CAF receiver. The TV decodes that stream; it no longer simulates a second drive. The sender remains the owner of the scene, camera, station and playback position.

The stream includes the garage vehicle, driving canvases, and same-origin City iframe/cockpit composition. It does not capture Android itself or HTML menus/controls. Optional VESPER speech and the short tuning sound are separate audio paths. Radio streams that forbid browser audio capture report an error and restore local sound. Supported Chrome uses direct Cast; unsupported browsers retain the existing platform help.

Video follows the source aspect ratio, bounded at 1280×720 landscape / 720×1280 portrait and 30 FPS. WebRTC may adapt resolution/frame rate to the sender and network. Audio uses persistent output tracks across station and vehicle changes. Local output is suppressed only after the TV confirms an actual video frame; stopping/failing restores current local volume/mute intent. A scoped screen wake lock keeps the visible phone drive awake where supported.

## Verified before release

- All 280 existing/new tests in the initial full suite passed; focused live-session tests additionally cover offer/ICE order, cancellation, stale callbacks, capture failures and disconnect grace.
- Real Chrome browser integration with a bridged Cast channel: garage connects directly without an instructions modal, starts driving in the same session, sends changing source frames and nonzero audio, changes camera/station, disconnects and restores phone audio. No page errors.
- Actual La Sala Google TV Streamer: independent WebRTC capability tests decoded generated 720p30 and real Cruise frames at approximately 29 FPS with no dropped frames/packet loss. Unmuted receiver autoplay and positive decoded Opus audio energy passed. These initial tests preceded the new CAF deployment.
- Real Chrome pixel checks: same-origin iframe background plus transparent cockpit composition, hidden cockpit removal, capture-track disposal.

Physical Pixel 9 Pro XL encoding/performance has not been measured by automation. Desktop Chrome is not physical Android validation. Final deployed CAF results are recorded separately after release.

Local evidence and reusable hardware/browser harnesses: workspace `.tmp/cast-check-20261107/` (`live-integration-result.json`, `dashcast-audible-result.json`, and `dashcast-caf-proof.cjs`). Tests launch a TV app only when La Sala is idle and stop only their owned session.

Implementation and review used the existing `/root`, `/root/mirror_help_ui`, `/root/mirror_feasibility`, and `/root/cast_review` agents with inherited models; no model override was requested.
