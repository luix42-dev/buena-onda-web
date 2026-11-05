# Buena Onda Cruise OS

The experiment uses three layers: World for the drive, Radio for tuning, Glovebox for personal collections and secondary controls. One panel state selects the active destination. Music, metadata, collection storage and rendering remain owned by their existing systems.

## Tokens and components

| Token | Value | Purpose |
|---|---|---|
| `--os-ink` | `#122b27` | Opaque forest-green control material |
| `--os-paper` | `#f4eddb` | Warm primary text |
| `--os-accent` | `#e9b875` | Primary entry, selected state and focus |
| `--os-muted` | `#c2cdbc` | Supporting copy |
| Space | 8 / 12 / 16 / 24 / 32 CSS px | Control gaps, mobile margins, panel padding |
| Target | 44 CSS px minimum | Buttons, selects, range interaction area; stronger project target than WCAG's conditional 24px minimum |

The existing brand sans font handles actions, Georgia handles editorial headings, and monospace is reserved for small nonessential labels. Controls retain visible text rather than requiring icon recognition. Numbers on Glovebox sections evoke a travel index; they do not imply progression. Buttons use restrained borders and small corner radii, without transparent glass materials or decorative motion.

`CruiseOS` coordinates World and panel destinations. `Glovebox` is a reusable controlled native dialog with six destinations, header/back/close, scrolling content and a listening footer. `DiscoveryConsole` adds an opt-in OS presentation around its existing controller/hooks; default presentation remains available. `PostcardStudio` composes an actual frame with the existing attribution helper inside Glovebox, avoiding nested preview dialogs.

## Information architecture

- World: brand, autodrive/park, labeled camera selector, Glovebox, one entry invitation. The bottom radio displays the current station and playback controls.
- Radio: current program, truthful unavailable-track fallback, source/support links, station directory, search/category, Surprise me, saves, memory preference and original dashboard focus.
- Glovebox: My Finds, Saved stations, Postcards, Places, Garage, Settings. Collections reuse the Radio dialog frame and offer Back to Glovebox. Settings contains time, quality, scenery, pace, glow, fullscreen, share, casting instructions, presence, diagnostics, controls and credits.

No song title is invented. Show bookmarks and verified track discoveries remain distinct. Search links are explicitly searches. Collection data remains local, exportable and account-free.

## Input, motion and system states

Mouse/touch use ordinary buttons, selects, search and ranges. Native dialog modality contains focus; Escape backs out of Glovebox subpages and closes its home. Close is always visible. Collections and Radio restore focus to a connected visible opener. Only one OS overlay is active. Playback and volume are available inside modal footers because background controls become inert.

Keyboard: Tab / Shift-Tab traverse controls; Enter / Space use native activation. Outside interactive content, R opens Radio, G opens Glovebox, V switches cockpit/coastal, D toggles cinematic, Space parks, Escape exits physical-radio/landmark focus. Global shortcuts ignore editing, modifier combinations, repeat events and modal input. The original keyboard listener is disabled only for this route.

Reduced motion disables decorative CSS transitions/animation and reuses the world's existing system preference handling. Stable camera selections, Park and radio-only provide additional comfort choices. No essential action depends on a timer, gesture or animation.

Standard-controller menu navigation is optional and off by default. D-pad up/down changes focus, A activates, B backs out; outside menus Start opens Glovebox, X opens Radio and Y changes camera. Holds do not repeat. Connection, reconnection and visibility restoration establish a button baseline before accepting edges. Polling stops while disabled or hidden. Native select/range editing and analog driving are not implemented; this is not a complete controller-only mode. Synthetic API fixtures cannot certify a physical controller.

Loading is separate from listening: Start accepts the audio gesture while the car/map prepares. Errors remain actionable; radio errors expose retry and station alternatives. Storage failures are surfaced by existing hooks and the world status lane. Postcard failure retains link sharing. Optional counters do not transmit data. Optional presence counts opted-in active browser sessions, not unique people or multiplayer.

Responsive panels respect dynamic viewport height and safe areas, retain a scrolling body and accessible header/footer. Portrait, landscape, narrow widths, text zoom, keyboard and reduced motion need browser checks. Physical-device comfort, screen-reader behavior, contrast certification and human navigation success cannot be inferred from CSS or emulator screenshots.

## Roadmap coordination and reversibility

Experience phases 1 and 3 gain simpler entry and radio/collections access. Phase 2's world, scene streaming, assets, route scale and adaptive resolution are retained. Phase 4's postcard, opt-in presence and technical metrics are reused. Phase 5's playtest package remains valid, with Cruise OS as an additional comparison candidate. Ads still wait until after the first minute; modal obstruction disables their exposure measurement. No payments or deployment are activated.

Open the preserved `/cruise/experience` route for the old interface; `/cruise/human-radio` and `/cruise` are also preserved. `/cruise/os` alone opts into the new presentation. Reverting the feature commits removes the experiment without migrating saved data.

## Follow the Frequency experiment

After the six-viewport essential UI gate passed, a bounded prototype was added behind `/cruise/os?follow=1`. Glovebox > Places > Take me somewhere selects the closest documented landmark 60 to 2,000 meters forward on the existing route. It explicitly resumes autodrive and closes the menu; a small distance cue announces arrival within 35 meters. It does not teleport, change route geometry, choose music or infer a destination from a listener profile. A dismissed guide has no continuing timer. Outside the eligible Ocean Drive stretch, the action is unavailable rather than inventing a nearby location. The default experience does not show this experimental destination control. It is a product hypothesis, not evidence of repeat visits.
