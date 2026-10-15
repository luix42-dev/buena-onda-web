# Simplification QA

October 15, 2026. Independent review of the simplified CruiseOS entry, player and Menu. No application edits by the QA agent. Final production URL: http://127.0.0.1:3081/cruise/os, build h_LNOKPQjEQ_1lCmdO9sQ.

Tests use headless Edge 155 on Windows, DPR 1. A 683x384 CSS viewport approximates the reflow space of a 1366x768 window at 200% zoom. Actual Chrome browser zoom, physical phones and representative users were not tested. No FPS benchmark.

## Confirmed original obstruction

The preserved production version was captured before replacement, without clicking Start or starting playback. [Raw measurements](evidence/old-layout/old-layout.json):

| Original viewport | Start button bounds | Element at its center | Finding |
| --- | --- | --- | --- |
| Laptop 1280x600 | x102.39, y454.59, 173.70x52 px; inside viewport | OpenStreetMap attribution A | The attribution link intercepts Start despite the button fitting on screen. |
| Zoom-equivalent 683x384 | x47.80, y247.30, 173.70x44 px; inside viewport | Player's Ready when you are SPAN | Player overlaps 6,131.18 square pixels of Start and intercepts its center. |

[Original laptop](evidence/old-layout/old-laptop.png), [original zoom-equivalent reflow](evidence/old-layout/old-zoom-reflow.png). These concrete layout obstructions explain a need to change zoom or aim elsewhere; they do not establish the user's exact Chrome zoom/window configuration. Audio stayed paused in both captures.

## Final production result

[Production results](evidence/production/results.json): all 30 assertions pass in each of six contexts, 180 total. No page exceptions. All captured HTTP response-error arrays are empty; isolated console resource errors remain recorded and are not described as a clean console.

| Context | CSS viewport | Start fully visible and center uncovered | Play fully visible and center uncovered | Actual audio starts, pauses and resumes |
| --- | --- | --- | --- | --- |
| Desktop | 1366x768 | Pass | Pass | Pass |
| Laptop | 1280x600 | Pass | Pass | Pass |
| Short window | 1024x480 | Pass | Pass | Pass |
| Portrait | 390x844 | Pass | Pass | Pass |
| Zoom-equivalent reflow | 683x384 | Pass | Pass | Pass |
| Compact reflow | 512x384 | Pass | Pass | Pass |

The entry now has one primary Play and start cruising action, no competing Just listen action and no radio player before starting. The OSM attribution anchor measures 192.44 px wide on desktop/laptop and is hidden at the other tested sizes; none overlaps Start. Pause is also fully visible and uncovered in every context. Hit tests use document.elementFromPoint at each button center and require the button or its descendant to be the actual target.

Actual station media time advances after Start, every media element pauses after Pause, and media time advances again after Play. This is browser-media evidence, not a claim about physical speakers, long-term stream reliability or every station.

After starting, Choose station, Save station and a plainly labeled Menu remain available. The station dialog shows search immediately, with Now playing and station details collapsed. Settings, Saved music and Saved stations open successfully. Menu is a scrolling surface at compact sizes; lower destinations remain accessible and were actually activated.

[Focused Escape results](evidence/focus/focus.json): five additional focus checks pass in each context, 30 total. Closing the directory returns focus to Choose station; Escape from Settings returns to Menu; another Escape restores the Menu trigger. Saved music and Saved stations also restore the Menu trigger. This focused run was already launched before the lead narrowed its requested scope; no broader transport tests were repeated.

## Screenshots visually reviewed

- [Laptop entry](evidence/production/laptop-entry.png): short explanation, prominent single start action, no player obstruction.
- [Zoom-equivalent entry](evidence/production/zoom-reflow-entry.png): start action fits with usable margins.
- [Zoom-equivalent paused state](evidence/production/zoom-reflow-paused.png): visible Play button, station choice, Save and volume.
- [Portrait playing](evidence/production/portrait-playing.png): compact player with separate volume row.
- [Compact Menu](evidence/production/compact-reflow-menu.png): scrollable destinations and persistent listening controls.
- [Zoom-equivalent station directory](evidence/production/zoom-reflow-directory.png): search is visible without opening program details.

These screenshots support a simpler hierarchy and confirm visible controls. They do not establish that new users feel less lost; that requires an actual user review.

## Earlier attempts and reproduction

The initial development browser attempt stalled before producing entry evidence during concurrent build/memory pressure and was stopped. A fresh diagnostic desktop run passed 25 checks. Final acceptance above uses the separately rebuilt production server and six fresh contexts, rather than assuming development behavior represented the final build.

Run node scripts/cruise-os-simple-proof.mjs from the worktree. BASE_URL selects the complete route URL; PROOF_OUT selects a fresh evidence directory; PROOF_VIEWPORT optionally selects comma-separated context names. STOP_ON_FAILURE=1 stops after a failed context. The --old-layout-only flag captures old startup layouts without playing audio. The --focus-only flag runs the focused Escape checks. Failed critical checks exit 1. Script syntax validation passes.

All QA browser contexts and processes were closed after completion. No deployment, paid service, app edit or performance benchmark was performed by this QA agent.
