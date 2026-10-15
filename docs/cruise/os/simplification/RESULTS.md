# Simpler entry and reachable playback

Preview: http://127.0.0.1:3081/cruise/os. Refresh the page after resetting Chrome zoom with Ctrl+0. Local implementation commit `34ff268`, production build `h_LNOKPQjEQ_1lCmdO9sQ`. Nothing deployed publicly.

## What was wrong

The previous layout offered competing entry/player actions, excessive text and unfamiliar navigation labels. The user's blocked-Play report was reproduced with actual hit testing, not just checking whether the button existed:

- At 1280x600, Start was within the viewport but its center hit the stretched OpenStreetMap attribution link.
- At 683x384, approximating the CSS viewport of a 1366x768 browser at 200% zoom, the fixed player covered 6,131 square pixels of Start and intercepted its center.

[Original evidence](evidence/old-layout/old-layout.json). This does not establish the user's exact Chrome window or zoom setting.

## Changes

- One entry action: **Play and start cruising**, with a short explanation that driving is automatic.
- The radio deck appears after starting. Entry content uses normal flow with scrolling available at extreme sizes, rather than absolute placement beneath another fixed control.
- Map attribution has intrinsic text width, preventing its invisible area from intercepting other controls.
- The playing screen keeps Play/Pause, Change station, Save and Volume. The player is narrower on desktop.
- Plain **Menu**, **Saved music**, **Change car** and **Take a photo** labels replace less obvious terminology. Extra menu descriptions and numbered decorations are hidden.
- Station search appears immediately. Program details, city/genre browsing and advanced station preferences are available through collapsed disclosures.
- Park remains in Settings; radio tuning, saves, exports, credits, camera choices, scenery settings and postcards remain available. Audio/world/metadata/persistence implementations were reused.

## Validation

Typecheck and the full production build passed. The initial concurrent build exhausted machine memory; after stopping this experiment's dev server and closing QA browsers, the sequential build passed. Existing warnings remain.

[Production checks](evidence/production/results.json): **180/180**, 30 per viewport: 1366x768, 1280x600, 1024x480, 390x844, 683x384 and 512x384. Actual center hit testing confirms Start, Play and Pause are uncovered and fully within the viewport. Real stream playback advances, pauses and resumes. Station search and menu collections remain accessible. No page exceptions were observed.

[Independent QA](QA.md) also records focused keyboard/focus checks. Before/after screenshots were visually inspected. These are Windows Edge viewport tests, including zoom-equivalent CSS reflow; actual Chrome zoom, physical phones and a new representative-user usability study were not performed. FPS was not remeasured for this UI fix; earlier performance limitations remain in [the performance report](../PERFORMANCE.md).

Screenshots: [before, laptop](evidence/old-layout/old-laptop.png), [after, laptop](evidence/production/laptop-entry.png), [zoom-equivalent entry](evidence/production/zoom-reflow-entry.png), [mobile player](evidence/production/portrait-playing.png), [station chooser](evidence/production/zoom-reflow-directory.png).
