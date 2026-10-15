# Cruise OS playtest preparation

Local production candidate: http://127.0.0.1:3081/cruise/os. Preserved comparison: http://127.0.0.1:3077/cruise/experience. Optional destination prototype: append `?follow=1`. Nothing has been deployed or published.

Use the existing [experience launch plan](../experience/LAUNCH-PLAN.md) for promotional hooks, authentic gameplay capture and feedback collection. This experiment changes interface access, not the music mission or commercial strategy. Promotional screenshots/video must show this actual build; do not add a copyrighted broadcast recording to exported clips.

## First representative-user session

After consent, counterbalance which interface a participant sees first. Use the same supported desktop/mobile conditions, car, station eligibility and network. Give goals rather than button instructions; record completed/failed tasks, time and observed confusion. A facilitator must not silently fix failures and count them as success.

1. Start a cruise, identify whether the road is automatic, and name the station.
2. Tune a different station, adjust volume, and save a station for a later visit.
3. Find that station again, reorder it if multiple stations were saved, and return to the drive.
4. Find My Finds and explain the difference between a broadcast bookmark and a verified song. If live track metadata is unavailable, record that limitation rather than inventing a song-save opportunity.
5. Park, change camera, find quality/scenery settings, and continue listening with 3D off.
6. Capture a real postcard, find credits, and close every panel using keyboard or the participant's usual input.

Ask what they expected Glovebox to contain, which controls they could not find, what obstructed the drive, whether the music continued, which moment they remember, and whether they prefer either interface. Invite an unprompted return later; do not equate stated intention with an observed return visit. Test Follow the Frequency separately so its novelty does not bias the core interface comparison.

No representative participants, screen-reader users, physical gamepads or real phones were available in this session. Automation validates technical tasks, not comprehension, comfort, emotional response or preference.

## Ranked remaining work

1. Confirm station embedding/redistribution permissions and asset attribution obligations before broader public use. Existing direct playback is not legal permission.
2. Profile the intermittent slow window near route meters 110-130. The initial OS run had two sub-30 one-second samples; the focused repeat did not reproduce them. Neither average FPS nor the passing repeat proves a consistent floor. See [performance evidence](PERFORMANCE.md).
3. Test real mobile Safari/Chrome, actual audio routes/lock screens/background behavior, touch, physical controllers and assistive technology. Confirm frame targets on explicitly supported hardware.
4. Run the comparison above with first-time listeners. Resolve observed entry, Radio/Glovebox language and narrow-layout issues before treating the IA as validated; consider the measured increase in selected DOM footprint.
5. Improve stream outage resilience and audit startup under real throttled networks. Expected CORS analysis fallback is not a promise that every station always plays.
6. Evaluate Follow the Frequency with natural travel and real feedback. Its diagnostic-arrival fixture is not proof of full-route enjoyment or retention.
7. Decide whether complete controller-only operation, text scaling and additional HUD customization merit implementation. Current controller support is optional menu navigation only.

No new service, paid API, asset purchase, payment flow or recurring subscription was introduced. Incremental recurring service cost is zero for this local UI experiment. Existing hosting/bandwidth and any future metadata/presence/analytics costs are workload-dependent and have not been newly quoted or verified. Keep all existing advertising infrastructure separate from music selection; menus do not justify counting obscured ads as exposures.
