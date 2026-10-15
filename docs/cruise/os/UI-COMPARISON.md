# CruiseOS: measured interface comparison

October 15, 2026. Compare preserved production 3077 `/cruise/experience` with isolated production 3081 `/cruise/os`. Windows Edge 155, DPR 1. No representative-user study, physical phone, screen-reader or physical-controller validation. No deployment.

## Resting interface footprint

[Raw bounds and formula](evidence/obstruction/obstruction.json). Each fresh context starts the drive, waits for the vehicle-ready diagnostic, then waits 15 seconds before sampling with all panels closed. This is one sample per route/viewport, not a distribution across every journey state.

`percentage = 100 * area(union(selected visible rectangles clipped to viewport)) / (viewport width * height)`.

The script sweeps all rectangle x-edges and merges vertical intervals within each strip, preventing overlap double-counting. Old selectors: `.opening-brand`, `.opening-tools > button`, `.hr-deck`, `.ex-landmark`, `.jn-map-credit`, `.jn-credits > summary`, `.jn-extra-credit summary`, `.opening-guidance`, `.opening-return`, `.postcard-trigger`. New selectors: `.os-brand`, `.os-world-tools > button`, `.os-camera`, `.os-radio-deck`, `.jn-map-credit`, `.os-guidance`. Hidden/zero-sized elements are excluded. Header buttons are measured individually, not as a full-width header.

| Viewport | Preserved experience | CruiseOS | Difference |
| --- | --- | --- | --- |
| Desktop 1280x720 | 123,530.49px^2 / 13.4039% | 138,988.75px^2 / 15.0812% | +1.6773 percentage points |
| Portrait 390x844 | 60,732.35px^2 / 18.4507% | 65,037.76px^2 / 19.7587% | +1.3080 percentage points |

**This measurement does not show less screen coverage.** It measures selected DOM bounding boxes, including transparent space around text, rather than opaque pixels or perceptual obstruction. In particular, CruiseOS's desktop attribution anchor spans 1236x16px although its text paints only at left; that full layout rectangle counts. Portrait's anchor is hidden. CruiseOS adds persistent autodrive and direct camera controls plus supplied program text; it removes the automatic landmark card and separate credits controls from the resting drive. These are structural tradeoffs, not evidence of better usability or immersion.

Actual resting screenshots: [old desktop](evidence/obstruction/old-desktop-rest.png), [new desktop](evidence/obstruction/new-desktop-rest.png), [old portrait](evidence/obstruction/old-portrait-rest.png), [new portrait](evidence/obstruction/new-portrait-rest.png).

## Actions and automated durations

Opening Radio and tuning remain 2 activations; opening saved stations/finds remains 2. Saving the current station improves from open-radio -> star to a single persistent Save station action. Settings increases from 1 activation to Glovebox -> Settings (2); postcard capture increases from a late persistent trigger (1) to Glovebox -> Postcards -> Capture (3). This trades direct access for organized destinations. No human preference or task-success improvement was measured.

| Action | Old production desktop / portrait, ms | OS production desktop / narrow320, ms |
| --- | --- | --- |
| Start click | 531 / 4875 | 3778 / 2011 |
| Open Radio | 155 / 113 | 99 / 100 |
| Save station | 76 / 48 | 47 / 50 |
| Tune selection | 127 / 82 | 247 / 84 |

These are single Playwright action durations, including actionability waits. They are not audio-start latency or human task time. Different viewport pairs, servers, caches and network conditions prevent causal speed comparisons. Full paths, development measurements and reproduction parameters appear in [QA-COMPARISON](QA-COMPARISON.md).

## Evidence and limits

[Baseline](evidence/baseline/results.json): 9 assertions per desktop/portrait pass; desktop continues 300 seconds, audio advances beyond 307 seconds and odometer reaches 4.54 km. [Extended development gate](evidence/extended/results.json): desktop 29 checks, five other contexts 28 each pass across desktop, portrait, landscape, tablet, 320 px and reduced motion. [Frozen production gate](evidence/final-production/results.json): desktop 31/31 and narrow 30/30 pass, no page exceptions. Actual narrow slider is 228.97 px wide, with Start/Just listen entirely above the deck. [Narrow entry](evidence/final-production/narrow-entry.png), [narrow drive](evidence/final-production/narrow-final-controls.png), [Radio](evidence/final-production/desktop-radio.png), [Glovebox](evidence/final-production/desktop-glovebox.png), [Settings](evidence/final-production/desktop-settings.png), [actual postcard PNG](evidence/final-production/actual-gameplay-postcard.png).

Verified tasks include dialog exclusivity, Tab containment, Escape back/close and focus restoration, search/tune/station saves, collections, mute/pause/volume, same-element audio continuation, listening-only world removal, local persistence and no autoplay after reload. First Radio misalignment and narrow 36 px slider were real visual findings, corrected and rechecked. Initial Escape failures reflected an incorrect harness assumption; failed development narrow runs did not reproduce on frozen production. Original artifacts remain preserved.

[Explicit fixtures](evidence/fixtures-final/fixtures.json) pass 10 metadata/controller/outage/natural-follow checks; the final arrival assertion used the wrong coordinate system. [Corrected arrival probe](evidence/follow-final/follow-probe.json) passes arrival/dismiss using absolute route meters. Synthetic song titles are visibly labeled QA; no live identification is claimed. Synthetic standard-gamepad tests cover held-button baseline and B navigation only. Optional `?follow=1` naturally reduced The Carlyle's cue from 130 to 118 m over 3 seconds without station change; arrival uses a diagnostic setter, not full traversal.

NTS CORS-analysis errors occur while fallback playback continues; aborted requests on teardown/reload are recorded. Some 404 console messages have no captured response URL, so their origin remains unknown. Advertising overlay exclusion is source-reviewed, not a measured ad-exposure result. Sustained FPS belongs to the lead's separate controlled production test. Physical-device reliability, station rights, broad live-song metadata coverage and actual user preference remain launch limitations.

The final [corrected fixture suite](evidence/fixtures-corrected/fixtures.json) passes all 11 checks, including diagnostic arrival. See [PERFORMANCE](PERFORMANCE.md) for both sustained runs and the focused repeat; the initial OS run had two sub-30 samples despite its comparable average. Those failures are retained.
