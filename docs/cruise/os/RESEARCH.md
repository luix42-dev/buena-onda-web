# Cruise OS: ranked UX evidence and decisions

This extends the experience-first roadmap; it does not replace its five phases. Research preceded application changes. Three bounded research agents (`/root/finds`, `/root/metadata`, `/root/station_audit`, inherited session model) reviewed primary sources, accessibility guidance and explicitly identified criticism. No unavailable Opus model or paid research tool was used. Their source-linked reports are in [research](research/). Existing browser-competitor findings are reused from [experience research](../experience/COMPETITOR-RESEARCH.md).

| Rank | Principle and evidence | Cruise decision | Cost / confidence |
|---|---|---|---|
| 1 | Mario's first encounter teaches one action through feedback; Nintendo describes iteration after playtesting. | One explicit Start cruising action, optional ride choice, no required setup. | Low; principle supported, Cruise usability untested. |
| 2 | Vice City / San Andreas developer soundtrack announcements establish radio as authored world identity. GT player criticism illustrates frustration with interrupted music. | Preserve one audio owner across views, menus and radio-only mode; always expose station and playback. | Low; source and existing architecture supported. |
| 3 | GT4 manual separates garage, diary and photo functions; GT7 acknowledges intimidating menus and introduces facilities progressively. | Glovebox holds personal collections, postcards, places, garage and settings. Radio focuses on tuning. | Medium; proposed information architecture requires human testing. |
| 4 | Dead Space's UI developer describes iterative diegetic design; XAG input guidance requires alternative interaction paths. | Analog radio identity with complete labeled DOM controls; physical cockpit is optional. | Medium; no 3D-only controls. |
| 5 | Journey removes lobby complexity and remains complete alone. | No account, forced social choice or fabricated activity; presence stays optional. | Low; broad fit, not proof of retention. |
| 6 | Persona's directors deliberately make identity part of interaction; criticism identifies remapping and legibility limits. | Brand through typography, hierarchy and material colors; reject animated text choreography for core controls. | Low; styling is an editorial choice. |
| 7 | FH5 documents scalable text, contrast, remapping and static backgrounds; XAG112 calls for predictable focus/back. | Native dialogs, visible close/back, focus containment/return, minimum 44px controls, keyboard equivalents. | Medium; browser automation is not assistive-technology certification. |
| 8 | Ghost of Tsushima's developer reduces visual noise and uses coherent environmental motion. | Preserve scenery, minimize persistent world controls, avoid multiple competing prompts. | Low; no new renderer cost intended. |
| 9 | Firewatch criticism identifies timed replies and camera friction; XAG117 and WCAG animation guidance cover motion alternatives. | No timed core decisions; reduced motion, stable camera, park and radio-only remain accessible. | Low; physical/mobile comfort still untested. |
| 10 | Slow Roads' developer explains deferred loading and reuse; Roadarium / Hop research suggests bounded streaming. | Reuse the measured Cruise world and adaptive resolution. UI redesign does not justify a new engine or city rebuild. | Low; no competitor FPS claims. |

Adopt RoamVista's direct scene entry, improve persistent human radio and personal presets, and retain an expansive authored Miami route. Reject unsolicited automatic station surfing, multiplayer-first setup, progression gates and decorative HUD density. No game assets, music, UI artwork or protected code are copied. Public talk abstracts are evidence of stated topics, not claims that paywalled talks or games were played.

## Execution and acceptance

1. Record the current controls and fresh screenshots. Preserve the original `/cruise`, Human Radio and experience routes.
2. Add `/cruise/os` on `feature/cruise-os-20261015`, based on `1e9a319`; reuse audio, metadata, discovery storage, scene, ads and metrics.
3. Centralize modal navigation; provide World, Radio and Glovebox layers with reusable tokens and predictable input.
4. Run focused contracts, type/build checks and old/new browser tasks; record actual screenshots, timing and rendering conditions. Do not infer real-user outcomes from automation.
5. Consider Follow the Frequency only after the essential interface passes. Keep unvalidated experiments and external licensing/physical-device blockers explicit.

Technical acceptance: start, tune, save/reorder a station, inspect/export discoveries, switch camera, park, change rides/settings, create/share a postcard, retain credits and ad behavior, listen without 3D, and close every panel with keyboard without interrupting radio. No public deployment, service activation or new recurring cost.
