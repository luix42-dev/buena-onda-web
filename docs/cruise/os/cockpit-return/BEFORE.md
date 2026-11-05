# Public reference and camera baseline

October 15, 2026. Read-only inspection of the actual [public Cruise](https://www.buenaondalifestyle.com/cruise), followed by local production Countach captures. Windows headless Edge 155, DPR 1; viewport emulation, not physical mobile or actual Chrome zoom. No public Start click, account, message, purchase or deployment. Normal page loading may use the site's existing telemetry.

## Public entry actually observed

[Screenshot](evidence/before/public-entry.png), [raw inventory](evidence/before/results.json), [captured DOM](evidence/before/public-dom.html). At 1366x768 after 15 seconds, the public entry showed a vehicle on a circular platform over a dark grid. Island Trail was selected. Coastal Coupe, Classic Coupe and Island Trail were available; this public lineup did not include Countach. The screen offered paint swatches, previous/next car, drive selection, Day Drive/Night Drive and LET'S CRUISE. Along the Route and Credits were at the top. Copy included YOUR RIDE. YOUR RHYTHM. and Automatic cruising / Radio starts with your drive. No document overflow or page exceptions were observed.

The public radio guide was not visible before starting, and public playback was not started. Its poststart behavior is therefore unverified in this browser visit. Existing local source `components/cruise/radio/RadioConsole.tsx` supplies a four-step guide: tap the radio, choose a preset or SEEK, adjust volume, then return to the road. `LaunchExperience.tsx` starts this tutorial on the first drive and permits skipping/replaying. This is source evidence, not proof of the exact deployed poststart behavior.

## Preserved local Countach camera

Current local production at `http://127.0.0.1:3081/cruise/os` was captured before replacement. Start was clicked, vehicle readiness awaited, and Camera view manually changed to Cockpit. The three captures verified `vehicle=countach`, `camera=driver` and no page exceptions:

- [Desktop 1366x768](evidence/before/desktop-cockpit.png): wheel and dashboard occupy much of the lower frame, and the near road is concealed behind the dashboard.
- [Portrait 390x844](evidence/before/portrait-cockpit.png): roof and cabin dominate the image; the near road is especially difficult to see.
- [Short 1024x480](evidence/before/short-cockpit.png): the dashboard crosses the center region, leaving a narrow exterior view.

These are visual observations, not measured visibility percentages or a universal aesthetic judgment. The next camera should be compared at the same viewport sizes with a higher sightline while retaining a believable cabin and access to the physical headunit.

All before-capture browsers were closed before the lead replaced the production build. Originals remain preserved. Final ride-selection, immediate cockpit, 15-second camera persistence, radio-focus/audio continuity and six-size hit testing require the next frozen build; they are not claimed here.
