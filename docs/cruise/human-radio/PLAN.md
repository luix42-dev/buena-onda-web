# Human Radio — implementation ledger

Base: `2b7e078`, latest `opus/wheels-retrowave-20261013` checkpoint. Dedicated worktree/branch: `cruise-human-radio-20261014`, `feature/human-radio-20261014`. No deployment or changes to the original `/cruise` routing.

## Orchestration

Repository AGENTS.md and Sistema orchestration rules inspected. Sistema's running router is a personal inbox classifier, not a development model orchestrator; it is not invoked for coding. Available development orchestration is Codex collaboration (four concurrent slots). Opus 5.5 is unavailable through these tools. All workers inherit the session model; exact worker runtime identifiers are not exposed.

| Participant | Bounded ownership |
| --- | --- |
| `/root` | Product integration, new discovery console/route, optional existing scene configuration, browser validation |
| `/root/station_audit` | New station catalog, official-source research, reliability ledger and catalog tests |
| `/root/metadata` | Separate official metadata wrapper/API, provenance/staleness tests, recognition evaluation |
| `/root/finds` | Local collection migration/export/search, manual presets, focused tests |
| Independent review | Reuse an idle worker after integration to review actual evidence and regressions |

## Verified baseline / gap analysis

| Requirement | Actual starting status |
| --- | --- |
| Geographic Miami, licensed cars, cockpit, director, radio focus | Implemented in `components/real-miami/jeep/JeepNight.tsx`; original checkpoint retained |
| Jeep After Hours | Wrangler implementation/assets retained; current garage defaults to Countach and omits Wrangler selection |
| Original Cruise | Legacy campaign route preserved via `CruiseClient.tsx`; not replaced |
| Miami geography experiments | Separate prior worktrees/routes; retain them |
| Neon Run | Optional `?world=neon`, latest DeLorean world; retain it |
| Radio streams and tuning | Existing `useCruiseAudio`, bounded retry/timeout, HLS and tuning noise; verify browser behavior |
| Official metadata | Jolt/NTS/dublab adapters exist; harden track/show distinction and freshness in isolated API |
| Song collection | Local bookmarks exist; missing portable export, artist-oriented search links and ordered presets |
| Directory / Surprise Me | Missing; implement explicit categories and listener-triggered uniform random tuning |
| Radio-first mode | Missing in this scene; add optional rendering suspension without remounting audio |
| Sunset transition | Existing 2400 simulation seconds; preserve and default new route to sunset |
| Presence / share | Existing Supabase presence and drive links; keep optional, never invent counts |
| Claim Avenue | Existing contracts/UI and blocked commercial review; preserve, do not activate transactions |
| Product metrics | Existing analytics not automatically enabled for new route; document future consent/denominators |

## Execution

1. Audit official station sources and retain evidence, including outages and permission uncertainty.
2. Implement `/cruise/human-radio` with the existing Miami renderer and audio owner; provide radio before scenery readiness, My Finds, station attribution, manual favorites, random tune and listening mode.
3. Run critical unit tests/type/build checks, then browser validation of real playback plus labeled failure fixtures, persistence and responsive layouts.
4. Independently review screenshots and measured evidence; document real remaining launch blockers and operating cost limits.

Editorial basis: [NPR World Cafe syndicated article, December 16, 2025](https://www.wgbh.org/news/2025-12-16/ditching-music-algorithms-here-are-12-streaming-alternatives-to-explore). The original NPR URL could not be fetched; the full syndicated text was available. Human editorial choices, station attribution and listener-controlled exploration inform this work. No article prose is copied into the product.
