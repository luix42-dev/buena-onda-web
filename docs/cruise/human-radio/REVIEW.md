# Independent source and visual review

Reviewed October 14, 2026 local time (browser evidence timestamp October 15 UTC). This reviewer authored the station catalog/audit but did not implement the radio console, metadata adapter, persistence hooks or Jeep integration being reviewed. Review was read-only apart from this report. No second browser session was launched for this review.

## Evidence inspected

- Source: `DiscoveryConsole.tsx`, `useHumanMetadata.ts`, `useDiscoveries.ts`, `finds.ts`, `metadata.ts`, `explore.ts`, Human Radio route/API/client, `JeepNight.tsx`, `CruiseSiteFrame.tsx`, audio/library hooks, presence code and radio CSS.
- Browser artifacts: [results.json](evidence/results.json), [desktop garage](evidence/desktop-garage.png), [desktop cockpit](evidence/desktop-cockpit.png), [portrait panel](evidence/portrait-directory.png), [landscape panel](evidence/landscape-directory.png), [tablet panel](evidence/tablet-directory.png). All five images were opened and visually inspected.
- Follow-up source checks confirmed the fixes below. Visual artifacts inspected here precede the last contrast/garage-overlap adjustments; those adjustments were not independently re-screenshotted by this reviewer.

## Findings and corrections

| Finding | Resolution inspected |
| --- | --- |
| Narrow/short viewport CSS hid scene attribution | Discovery panel now includes accessible credits with car, OSM and texture source links. Existing small-screen scene credits may remain hidden; panel credits provide the alternative. |
| Top Share sent Human Radio users to the original `/cruise` route | Human Radio branch now preserves query parameters while targeting `/cruise/human-radio`; ordinary Cruise branch remains `/cruise`. |
| Landscape CSS hid the only volume slider | Short-screen layout now retains a compact volume control. Landscape screenshot and browser check show it. |
| Discovery panel opening/closing lacked focus management | Source now focuses its close button and restores the connected opening trigger. Browser artifact reports `panelFocus:true`. |
| Selected tab and favorite star text had poor contrast | Increased selector specificity now preserves intended dark text on peach selected buttons. Source verified; post-fix visual confirmation outstanding in this review. |
| Desktop garage scenery-mode button overlapped the first vehicle option | Garage-specific rule now hides the overlapping scene action. The discovery panel retains the listening-mode control. Source verified; post-fix screenshot not inspected here. |

No additional critical defect was established in the reviewed code. This is not an assertion that untested paths are defect-free.

## What the artifacts support

The browser run is Windows headless Edge 155 with mobile/tablet viewport emulation. Jolt's real audio element advances from approximately 1.02 to 4.52 seconds; after scenery restoration it reaches approximately 10.20 seconds. Checks confirm the same audio element survives Canvas removal and radio continues without 3D. This supports playback continuity for that tested path, not every provider or device.

The run reports no page errors and passes no-autoplay, preset ordering, persistence, category filtering and metadata-unavailable behavior. Song save/export is explicitly tested with an injected, labeled metadata fixture. It demonstrates collection behavior; it does not demonstrate a successful live song identification. Screenshots show station identity and persistent radio controls in the cockpit.

Portrait, landscape and tablet screenshots show a scrollable discovery panel without reported horizontal overflow. The initial viewport contains the panel header and tuner; station rows and credits are farther down. The original `credits:true` check establishes DOM presence, not that credits were scrolled into view or read by assistive technology. Separate follow-up testing may add stronger evidence.

Performance artifact: about 38.8 average requestAnimationFrame FPS over 15 seconds, longest sampled frame about 66.7 ms, roughly 270 draw calls, Intel UHD 630 through ANGLE. The script uses DPR 1; screenshot shows Auto (high) quality. This is a short desktop development-build observation. The reported roughly 235 MB heap is JavaScript heap, not GPU memory. No physical mobile, thermal soak, prolonged background listening or production performance conclusion follows from it.

## Remaining launch gates

Continue development and local review. Station playback/metadata permissions in the commercial city context remain unresolved; a public stream and CORS response do not grant those rights. Live track metadata coverage remains limited, Kiosk's audited source failed, and several requested stations appropriately remain external destinations. Verify all intended providers in real browsers, sustained listening, outage recovery, keyboard/touch accessibility and physical devices before expanding availability. A 40-minute sunset cycle is present in source but was not observed end-to-end by this reviewer.

The source keeps audio state outside the conditional Canvas and uses fixed metadata origins, bounded response bodies, expiration checks and separate show bookmarks. These are appropriate foundations. They do not replace the outstanding operational, rights and device validation.
