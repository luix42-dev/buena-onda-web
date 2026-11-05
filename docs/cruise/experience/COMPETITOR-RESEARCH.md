# Experience-first competitor research

October 15, 2026. Research completed before application changes, against Human Radio `6fbffd2`. See [MASTER-PLAN](MASTER-PLAN.md). No purchase, deployment or competitor code/asset reuse.

Evidence packs: [RoamVista / Partyvia](research/ROAMVISTA-PARTYVIA.md), [Roadarium / Hop Earth](research/ROADARIUM-HOP.md), [NIGHTDRIVE and supplements](research/NIGHTDRIVE-REFERENCES.md). Only RoamVista and Partyvia were interactively entered. Neither was FPS-benchmarked. No physical mobile test or representative user study.

## Comparison across eight dimensions

`O` = observed in our browser; `S` = public shipped source; `C` = first-party claim; `?` = not established. Source observations do not establish active behavior, permission or performance.

| Experience | Opening minute | Visual/world identity | Driving/autodrive | Audio/radio | Mobile/performance | Return/sharing/community | Monetization | Architecture |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [RoamVista](https://roamvista.city/game/) | O: world at 5 s; moving 15/60 s | O: coastal curve/horizon; C: eight worlds | O: F autodrive; 1.16 km at 60 s | O: advancing live stream; source/save/share; song metadata ? | O: portrait fits/GO visible; FPS ? | O/S: saves, seeded settings links | C: no subscriptions; analytics present | S: Next/Three.js, DPR/shadow caps |
| [Partyvia](https://partyvia.com/en/games/night-drive) | O: profile 5 s, downloading 15 s, road 60 s | O: sodium highway/traffic; C: four maps | O: W driving/scoring; autodrive ? | S: seven synthetic stations; human radio ? | O: portrait fits, crowded controls; FPS/tilt ? | O: room/invite/chat/report controls | O: AdSense; C: outside gameplay | S: Three.js/Socket.IO; C: authoritative server |
| [Roadarium](https://www.roadarium.com/) | C: city/practice entry; timing ? | C: real streets; inconsistent city counts | C: practice/traffic; autodrive ? | ? | Reports: loading/Safari failures; FPS ? | C: local skills/places; sharing ? | C: free/no ads/tracking | S: tiles, Three.js, instancing/LOD |
| [Hop Earth](https://hop.earth/) | Timing/current access ? | C/S: terrain/OSM global roads | C: solo/racing; reliability ? | S: volume paths; radio ? | Historical experimental-mobile claim; FPS ? | S: route URLs; C: racing | S: payment UI; current price ? | S: workers/LOD/cache; C: dynamic origin |
| [NIGHTDRIVE](https://webxos.itch.io/nightdrive) | C: click/Enter; timing ? | C: one-bit Tokyo/districts | C: lanes/cameras/Auto Play | C: generated music/automatic tuning | ? | C: remix; community/sharing ? | ? | Reusable source/license not established |

Supplements: [Slow Roads](https://web.dev/case-studies/slow-roads) supports bounded roadside rendering, [Bruno Simon](https://github.com/brunosimon/folio-2025) confident controls/compression, [Butterchurn](https://github.com/jberg/butterchurn) continuous transitions. Their figures/licenses do not transfer into Cruise performance or asset permissions.

## First-minute implication for Buena Onda

Show a convincing place behind one invitation to begin. Offer configuration afterward. Retain human radio, voluntary tuning and local discoveries; avoid synthetic music, automatic channel surfing and scoring pressure. This is design judgment, not measured retention causality.

Timings start at an entry click after landing load, not cold navigation. Roam's audio reached 52.98 seconds at its 60-second checkpoint; Party still downloaded at 15 seconds. This is one observed journey per product, not a loading-speed ranking. [Evidence](research/ROAMVISTA-PARTYVIA.md).

## Top ten changes ranked for this repository

Qualitative judgments; `S/M/L` effort means scope, not delivery time. Performance cost remains to be measured.

| Rank | Adaptation | Listener impact | Feasibility | Performance cost | Effort | Buena Onda fit |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Scenic first frame plus one start action; secondary ride choice | High | High: existing world/audio | Low if existing scene reused | M | Strong |
| 2 | Author first 60 s around one coherent coast-to-landmark reveal | High | High: existing route/anchors | Low–medium; bound visible detail | M | Strong |
| 3 | Compact persistent station/play/volume/seek; hide duplicate setup surfaces | High | High | Low | S | Strong |
| 4 | Explicit playback/metadata recovery and verified provenance | High | High: reuse adapters | Low network/CPU, rate-limit | S–M | Essential |
| 5 | Touch-safe controls, focus/reduced-motion and listening-only escape | High | High | Low; fallback lowers cost | M | Essential |
| 6 | Protect audio through fixed DPR/detail budgets and bounded forward loading | High | Medium; profile first | Intended reduction; prefetch adds memory | M–L | Strong |
| 7 | A few editorial Miami visual phrases using existing landmarks/light | Medium–high | Medium | Medium if detail grows | M | Strong |
| 8 | Scene/station link plus actual silent, attributed screenshot card | Medium | High | Brief capture/readback cost | M | Strong |
| 9 | Return to explicit user presets/finds; optional local scene memory | Medium | High | Low storage/CPU | S–M | Strong; no ranking |
| 10 | Optional truthful presence and consented aggregate reliability metrics | Medium, unproven demand | Medium: existing service | Low–medium service/network | M | Conditional; solo remains complete |

Defer synchronized multiplayer, chat, global terrain, scoring and new renderers. Their value and operational costs remain unproven here.

## Mapping to the five authorized phases

1. **Beautiful Opening Minute:** ranks 1–5; measure gesture/audio/motion at 5/15/60 seconds; retain camera override and reduced motion.
2. **One Unforgettable Stretch of Miami:** ranks 2/6/7; reuse connected route/five anchors; verify continuity and rendering budgets.
3. **Effortless Radio Discovery:** ranks 3/4/9; preserve provenance, manual presets and transparent search; unavailable metadata stays unavailable.
4. **Sharing, Presence, Simple Analytics:** ranks 8/10; silent attributed sharing, opt-in leased presence and consented aggregate metrics; no music profiling.
5. **Public Playtest and Launch Validation:** compare baseline, test devices/rights/playback/consent, prepare invitations; claim participants only when real. No deployment authorized.

The lead's [baseline](evidence/baseline/results.json): 44.03 average scene FPS/90 seconds, Windows headless Edge/Intel UHD 630, 1280×720/DPR 1, local development build. Compare equivalent settings; no competitor or physical-mobile FPS comparison exists. Research gate complete; preserve Human Radio and independently review before/after evidence.
