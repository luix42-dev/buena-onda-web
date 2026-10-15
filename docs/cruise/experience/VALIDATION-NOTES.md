# Validation notes and retained failures

## Same-station playback regression

A stable portrait run reproduced a genuine existing bug: selecting the already-playing Jolt station called start/attemptPlay again, set loading and armed a12second timeout. The media element was already playing and did not emit another playing event to clear that timeout. Audio then paused despite buffered data and no stream error. Source and failure: `evidence/mobile-portrait-stable/results.json`.

The shared audio hook now verifies the actual expected active source, non-paused/non-ended/error-free media and readyState>=3 before treating an existing play request as satisfied. It clears stale loading timeouts instead of arming another. Loading/new stations retain their timeout protection. The exact stable14second retune regression passed afterward: `evidence/mobile-portrait-fixed/results.json`. No radio endpoint or audio ownership was replaced.

## Harness and development reload limitations

- Initial opening proof used a hidden legacy radio-only button locator, then corrected the locator to the new options panel. Failed screenshots/results retained in phase1-cold-failed.
- Early mobile checks used an overly exact implicit select label; actual screenshots showed the settings panel. Harness now locates the visible panel combobox and waits for UI updates. Original failures retained under mobile-initial-harness-race.
- Portrait evidence also captured React hook dependency hot reload resetting audio during active edits; that contaminated run is distinct from the later stable retune bug reproduction.
- First postcard validation ran while shared integration changed and React remounted the experience back to Start. Its screenshot proves it was on entry rather than65seconds into driving. Retained as phase4-hmr-interrupted; only a fresh stable test can establish capture success.

All viewport/touch tests use headless desktop Edge emulation. They do not prove physical iPhone/Android audio, GPU, thermal or lock-screen behavior. A no-page-exceptions assertion does not mean no external CORS/404 console errors. Some streams reject analyser CORS and use direct playback fallback; station outages remain possible.
