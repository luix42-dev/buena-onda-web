# RoamVista and Partyvia: observed experience research

October 15, 2026. Researcher `/root/station_audit`, available parent model. Public pages, delivered public JavaScript and actual demos inspected. Windows headless Edge, 1440×900, DPR 1; later 390×844 viewport resizing. No account registered, chat sent, purchase, asset extraction or application change. Partyvia was entered as a guest and the browser then closed. Screenshots are research evidence, not reusable product assets.

## First 5 / 15 / 60 seconds: actual checkpoints

Clock starts at the primary entry click **after the landing document is loaded**, not navigation start. These are single-session observations, not cold-load benchmarks. Browser startup, network/cache, shader work and server state were uncontrolled. No competitor FPS measurement was made.

| Checkpoint | [RoamVista](https://roamvista.city/game/) | [Partyvia Night Drive](https://partyvia.com/en/games/night-drive) |
| --- | --- | --- |
| 5 seconds | Coastal world rendered, stationary car and brief driving-key hint. 113FM media element readyState 4, unpaused, currentTime 0.05 s. Pressed F after this checkpoint. | Quick join presents nickname/mascot dialog. Entered generic Guest and continued; no registered account. |
| 15 seconds | Autodrive reads 82 km/h and 0.12 km. Same station media time 7.97 s. | Guest room exists, game download screen still visible. Held W for four seconds after this checkpoint. |
| 60 seconds | Autodrive reads 83 km/h and 1.16 km; radio time 52.98 s. No station switch was requested. | Night highway, car and traffic visible; distance 0.2 km, score 18, vehicle back at 0 km/h. No autodrive established. |

Evidence: [Roam observations](evidence/roamvista-observations.json), [5 s](evidence/roamvista-5sec.png), [60 s](evidence/roamvista-60sec.png), [Party observations](evidence/partyvia-observations.json), [5 s](evidence/partyvia-5sec.png), [15 s](evidence/partyvia-15sec.png), [60 s](evidence/partyvia-60sec.png). No page errors were reported in Party's run. Advancing media time supports decoded playback; audio was not listened to for subjective quality. The checkpoints do not locate exact first-render or first-audio times.

## RoamVista: atmosphere before configuration

**Observed:** the [landing capture](evidence/roamvista-landing.png) uses a live scenic road as its main visual, one strong entry action and secondary geographic choices below. The drive frame has a coherent horizon, coastal curve, sparse vegetation, lighthouse and modest vehicle detail. Scene composition supplies identity without photoreal materials. Station playback occupies a compact bottom-right player, with world/weather/time/camera options secondary. After the short hint disappears, the road has room to breathe. This is a visual interpretation of inspected images, not a conversion study.

The [radio drawer](evidence/roamvista-radio.png) shows station volume, broadcaster source, save/share and a regional list. It did not show verified song metadata in this session. Stations span the selected region; their human-curation status was not audited. [About](https://roamvista.city/about/) separates fictional generated roads from real recorded journeys. Eight regional inspirations and no scoring are stated on its game page; only California was driven here.

**Public-source evidence:** [game UI chunk](https://roamvista.city/_next/static/chunks/0o6p47-8y8g-e.js) contains gesture-specific radio recovery, explicit retry, touch steering/brake/GO, camera switching and a share drawer encoding seed/settings while disclosing that driving progress is not saved. [Renderer chunk](https://roamvista.city/_next/static/chunks/3om9fl6t1mnpr.js) contains Three.js rendering, a low-power context preference, DPR caps of 1/1.65 and 1024/2048 shadow-map quality settings. These establish shipped paths, not activated settings or performance superiority. Chunk names can change.

**Mobile:** [390×844 capture](evidence/roamvista-mobile.png) shows a readable radio drawer; no horizontal document overflow, and GO control was reported visible. This was viewport resizing, not physical touch/tilt validation. **Return/economics:** [privacy](https://roamvista.city/privacy/) documents local saved items/preferences, portable settings links and direct broadcaster connections. [About](https://roamvista.city/about/) says no accounts/subscriptions; no checkout or ad placement was seen here. Analytics scripts were present. No recurring-cost inference follows.

## Partyvia: a social driving game with synthetic radio

**Observed:** initial setup is more involved: guide page, optional-cookie choice, guest profile, room, then game loading. The rendered frame provides a broad sodium-lit highway, warm light pools, traffic and clear car silhouette. Points, timer, room identity and social controls frame the activity as a game. The [portrait capture](evidence/partyvia-mobile.png) has no horizontal overflow but crowded top controls; physical controls and mobile GPU performance were not validated. Cockpit, hood view, tilt and server-authoritative simulation are [official claims](https://partyvia.com/en/games/night-drive), not paths exercised in this run.

**Radio verified in source:** the page inconsistently mentions seven generative stations and three lo-fi stations. The actually delivered [audio module](https://partyvia.com/js/games/nightdrive-audio.js?v=mv9enl6o) defines seven IDs (`lofi`, `synth`, `jazz`, `anadolu`, `techno`, `ambient`, `talk`) with oscillator/buffer synthesis and sequence parameters. This supports generative audio architecture, not independent human radio. No live broadcaster playback or song identification was established. This is the most important product distinction from Buena Onda.

**Architecture:** the run loaded [Three.js scene code](https://partyvia.com/js/games/nightdrive-scene.js?v=mv9enl6o), a [shared simulation module](https://partyvia.com/shared/games/nightdrive-sim.js?v=mv9enl6o), Socket.IO, road/terrain/model modules and a touch kit. Scene source includes render tiers and DPR limits. Public source access supplies no reuse license.

**Community/business:** the actual room exposes invite-link, participants, chat, voice and reporting controls; no invitations/messages were sent. [About](https://partyvia.com/en/about) describes optional accounts, progress and original content. [Privacy](https://partyvia.com/en/privacy) documents guest progress keys, moderation records and AdSense only on information pages, outside play. Loaded AdSense and the cookie dialog substantiate advertising integration; consent/personalization operation was not independently audited. Its commercial separation is worth adapting; scoring pressure, synthetic playlists and chat overhead do not serve Cruise's immediate music mission.

## Adaptation boundary and priorities

Adapt **principles**: immediate scenic invitation; a consistent visual language; small persistent station controls; optional deeper settings; explicit radio recovery; one-action autodrive; portable scene/station links; ads outside the listening flow. Keep My Finds and human station attribution as Cruise's differentiation. Do not copy either site's art, code, music, maps or interface assets. [Roam terms](https://roamvista.city/terms/) retain creator rights; [Party terms](https://partyvia.com/en/terms) reserve site/game/software rights. No protected material was imported.

Public search found directory/editorial mentions of RoamVista but no representative user usability sample, and no substantive independent Night Drive discussion was established. Neither review scores, retention rates, true population counts, operating costs, sustained loading reliability nor cross-device performance can be inferred from this research.
