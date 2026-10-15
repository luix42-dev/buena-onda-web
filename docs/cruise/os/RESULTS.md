# Cruise OS delivery

**Latest update:** listener feedback identified overload and a blocked Play button. The interface was simplified in `34ff268`; production build is now `h_LNOKPQjEQ_1lCmdO9sQ`. See [simplification findings and evidence](simplification/RESULTS.md). The report below records the earlier OS implementation and its historical measurements.

Local production: **http://127.0.0.1:3081/cruise/os**. Optional guide: **http://127.0.0.1:3081/cruise/os?follow=1**. Compare the preserved interface at **http://127.0.0.1:3077/cruise/experience**; the previous Human Radio build remains on **http://127.0.0.1:3074/cruise/human-radio**.

Branch: `feature/cruise-os-20261015`, isolated worktree `cruise-os-20261015`, based on `1e9a319`. Implementation commit: `d725c898ac8f17d108985eb89fc96db5d98a9504`. Production build ID: `xIOfRl6VF9vnd47j3jC9T`. No deployment, external messages, purchase, new dependency or paid API activation.

## Existing systems and preserved behavior

The working starting point already contained the expansive Miami loop, five vehicles, cockpit/coastal/cinematic views, sunset/night transition, adaptive scenery resolution, independent audio lifetime, station directory/search, Surprise me, verified-metadata boundaries, My Finds, ordered presets, local station memory, sharing, postcard composition, optional presence and local diagnostics. Existing advertising geometry and first-minute gating were retained. This work did not rebuild those systems or import game assets/code.

The original `/cruise`, `/cruise/human-radio` and `/cruise/experience` interfaces retain their default paths. Shared `JeepNight` opts into OS only with `cruiseOS`; `DiscoveryConsole` retains its original default rendering. The successful production servers and original worktrees were not replaced. The scene, route geometry, car models, radio catalog, streaming URLs, metadata adapters, collection keys and licensing records remain in use.

## Implemented

- World: explicit Start / Just listen, visible autodrive/park, labeled camera select, one Glovebox entry and short contextual guidance. Audio starts from user interaction while scenery prepares.
- Radio: one named destination, tactile tuning scale, station/program display, direct previous/next, one-action station saving, verified-song saving and distinct broadcast bookmarking, search/category/Surprise me, source/support links and remembered-station preference.
- Glovebox: My Finds, Saved stations, Postcards, Places, Garage and Settings. Existing collections retain export, ordering, removal, external searches and sharing. Vehicle changes preserve audio.
- Interaction: one active OS panel, native modal containment, visible Back/Close, Escape hierarchy, focus restoration and text-safe shortcuts. Every modal keeps playback/volume available. Optional standard-controller menu navigation defaults off and pauses polling while hidden.
- Comfort and reliability: reduced-motion rules, quality/radio-only controls, persistent storage failure disclosure, narrow-screen slider row and short opening typography, inline casting help, source/vehicle/map attribution.
- Postcards: actual scene capture and attributed PNG composition inside Glovebox, without stacking a second modal or recording radio audio.
- Advertising: an open OS panel disables geometric exposure measurement. This is a source-reviewed gate; it is not a measured advertiser impression or a claim of human sign readability.
- Optional Follow the Frequency: only `?follow=1`, selecting a documented architectural anchor 60-2,000 meters forward on the existing loop. Explicit user action resumes autodrive. The guide does not change stations, infer taste, teleport or add an engine/quest system.

## Research and actual tradeoffs

[Ranked evidence and plan](RESEARCH.md), [source reports](research/), [complete interface audit](INTERFACE-AUDIT.md), [design system](DESIGN-SYSTEM.md), [measured comparison](UI-COMPARISON.md), [detailed QA](QA-COMPARISON.md).

The research favors one comprehensible entry action, persistent human radio, predictable back/focus behavior, complete DOM alternatives to physical controls, and brand through composition rather than animation. The actual architecture separates tuning from personal collections and secondary options.

Saving the current station drops from two activations to one; opening settings increases from one to two, and postcard capture moves from a timed floating trigger to a three-action Glovebox path. The selected DOM footprint increases from 13.40% to 15.08% desktop and 18.45% to 19.76% portrait. Desktop includes a large transparent attribution rectangle. These are bounding-box unions, not painted-pixel coverage or proof of better immersion. No human preference, comprehension, return rate or emotional-response improvement is claimed.

## Validation and evidence

Production build passed compilation, lint gate, type validation and static generation. Existing Next configuration, image and hook warnings remain; output is not warning-free. An intermediate build failed on an unescaped JSX apostrophe and was corrected. An initial standalone typecheck exhausted available memory during parallel activity; bounded-memory typecheck and the final full build passed.

[Focused tests](evidence/unit-tests.txt): **52 passed, 0 failed**. Includes shortcut safety, controller button edges, safe share-route encoding, geographic guide bounds/wrap, original metadata/provenance, persistence, metrics, presence, postcards, atmosphere and adaptive-resolution contracts.

[Frozen production browser gate](evidence/final-production/results.json): **31/31 desktop and 30/30 at 320x740**, no page exceptions. Checks cover launch/playback, radio/search/tune/save, modal exclusivity, Tab/Escape/focus, collections, volume/mute/pause, actual PNG download, same-element audio continuation without 3D, saved stations after reload and no autoplay. The narrow volume input measures 228.97 CSS px; both entry actions are above the deck.

[Earlier extended gate](evidence/extended/results.json): 169 assertions across desktop, portrait, landscape, tablet, narrow and reduced-motion contexts. Frozen production was subsequently checked on desktop and narrow. This is Windows Edge viewport emulation, not six physical devices.

The first Radio alignment and 36px narrow slider were real defects, fixed and visually rechecked. Incorrect Escape expectations, development hot-reload failures and mistaken odometer-based arrival fixtures are preserved in their original evidence directories. They are not relabeled as passing runs. Synthetic metadata is visibly marked QA, not live identification. The corrected arrival probe uses absolute route meters; natural movement was separately observed for about three seconds, not the complete destination traversal.

The fully corrected [fixture suite](evidence/fixtures-corrected/fixtures.json) subsequently passed **11/11 checks** with no page exceptions: synthetic verified-song save/persistence, metadata failure fallback, held-controller protection and Back, stream outage recovery controls, natural guide movement without teleport/station change, and diagnostic arrival. The earlier failed fixture outputs remain preserved.

The preserved experience interface also passed **9/9 regression checks inside the new production build**, at `/cruise/experience` on port 3081: launch/audio, favorites, NTS selection, Escape, element continuity, panel playback, layout and no page exceptions. [Raw regression evidence](evidence/legacy-regression/results.json).

Actual screenshots: [before](evidence/obstruction/old-desktop-rest.png), [after](evidence/obstruction/new-desktop-rest.png), [Radio](evidence/final-production/desktop-radio.png), [Glovebox](evidence/final-production/desktop-glovebox.png), [mobile](evidence/final-production/narrow-final-controls.png), [actual postcard](evidence/final-production/actual-gameplay-postcard.png).

## External limits and costs

Live Jolt/NTS playback advanced during tested flows, including CORS-restricted analysis fallback. Console errors/cancelled requests remain recorded; some early 404 messages lack an identified response URL. Metadata outages hide song saving and display an honest fallback. Broad live-song identification across the catalog was not established. Synthetic track fixtures prove UI handling, not a real broadcast identification.

Station embedding/redistribution terms and existing third-party asset obligations remain external review items; direct stream reachability is not permission. No recognition provider was activated. No physical mobile, real gamepad, screen-reader, representative-user, long background/lock-screen or throttled-network certification was performed. Controller navigation is partial, not complete controller-only use. Optional presence retains the existing short-lived-session architecture; no global distributed counting or multiplayer claim is added.

Existing station findings are retained in [Human Radio stations](../human-radio/STATIONS.md) and [experience reliability review](../experience/research/RADIO-RELIABILITY.md). The earlier [GTA iOS assessment](../experience/research/GTA-IOS-ASSESSMENT.md) remains applicable: its native engine/assets were not integrated into this browser UI experiment.

Incremental recurring service cost for this local UI experiment is **zero**: no service or subscription was added. Existing hosting/bandwidth and any future service costs are unquoted and workload-dependent. This is not a verified estimate of total operating expense.

Use [PLAYTEST](PLAYTEST.md) for the ranked backlog and human comparison protocol. Public deployment remains unauthorized. Final performance findings and the resulting readiness recommendation are in [PERFORMANCE](PERFORMANCE.md).

## Exact implementation files

`git show --stat d725c89` identifies the 21 implementation/test/config files. New route: `app/(site)/cruise/os/{page,CruiseOSClient}.tsx`. New components: `components/cruise-os/{CruiseOS,Glovebox,PostcardStudio}.tsx`, `useCruiseGamepad.ts`, `useFrequencyGuide.ts`, and three scoped CSS files. New pure helpers: `lib/cruise-os/{input,frequency}.ts`. New tests: `tests/cruise-os-{input,frequency}.test.ts`.

Shared changes: `components/real-miami/jeep/JeepNight.tsx`, `components/human-radio/DiscoveryConsole.tsx`, `components/human-radio/RadioPrivacyBoundary.tsx`, `components/cruise/CruiseSiteFrame.tsx`, `lib/human-radio/explore.ts`, `.gitignore`, and generated Next type include entries in `tsconfig.json`. Research, scripts and all retained evidence are committed separately with this report. No station URL, metadata adapter, audio hook, vehicle asset, payment handler or original route file was edited.

The full [changed-file manifest](CHANGED-FILES.txt) includes documentation, both reproducible scripts and every retained screenshot/result. `git log --oneline 1e9a319..HEAD` identifies the implementation and evidence commits.
