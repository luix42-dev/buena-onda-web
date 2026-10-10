# Nightdrive dynamics and camera evidence

Owner: `/root/performance`, Codex (exact model variant not exposed). Isolated lab only; existing Miami/original controllers unchanged. No new dependencies, deployment, production writes, or browser runs by this agent.

## Reference actually inspected

Founder file: `D:/10-VENTURES/12-buena-onda/california love/cli/cli-1.mp4`, 44,818,358 bytes. Existing CapCut 8.8 FFmpeg reports 18.62 seconds, H.264, 1080×1920, approximately 59.78 FPS. Playwright FFmpeg could not decode this input; CapCut's existing executable succeeded. CPU-extracted, visually inspected frames at 2, 8 and 14 seconds are [2s](reference/founder-2s.png), [8s](reference/founder-8s.png), [14s](reference/founder-14s.png). Frames are resized to 540×960, unretouched. The initial `founder-01..03.png` files are separate six-second sampling-filter outputs, also inspected; use timestamped files for reference.

Observed: elevated rear view looking over an open cabin; vehicle fills much of the lower portrait frame; broad dark road and long lane markings create depth; sparse white practical lighting and silhouetted palms/buildings dominate. The first sampled frame approaches a lit overhead structure, later frames show an open roadway. These stills support composition and lighting direction; they do not establish acceleration, exact camera dimensions, seamless looping, location, or audible music synchronization. Camera dimensions below are implementation choices, not measurements recovered from video.

Requested YouTube reference https://www.youtube.com/watch?v=ulQYuZxOIFs: **UNREVIEWED**. Direct fetch failed with cache miss and exact-ID search returned no results. No observations attributed to that video.

## Source audit and implementation

Existing Miami is now 630 m, with scenery/ground runout and an editorial covered reset. `miamiStreetCenter(s)=3 sin(s/95)` and hardcoded controller tangent currently agree, but this duplicates the route math. Selected speed is immediate and simulation time clamps to .05 s. That implementation does not become spatially continuous by extending its endpoint.

The lab instead uses shared `roadSample(s,seed)` for road, traffic, hero and camera. Distance is an unbounded longitudinal parameter; odometer integrates meters; advancement divides by the route metric. The world is centered on the current road sample, keeping scene coordinates small. Positive lateral is the right lane, `(cos(yaw),0,-sin(yaw))`; forward is -Z. Hero pitch follows the slope, with cabin camera transformed by the same pose. No endpoint reset/fade is introduced.

`dynamics.ts` implements three restrained target-speed envelopes: Cruise 8–12 m/s; Night Drive 12–20 m/s; Midnight Run 18–25 m/s with brief higher-speed peaks. Actual speed eases with bounded acceleration, braking and jerk; curvature and traffic can lower any target. Updates substep at ≤25 ms and discard hidden-tab catch-up beyond 100 ms. This is touring choreography, not tire physics or manual steering.

Two same-direction traffic cars start at 65 m / 9 m/s (right) and 180 m / 14 m/s (left). A pass requires a closing hero, a leader within 55 m and a clear adjacent lane. Quintic five-second lane changes keep endpoints smooth. Return requires 30 m clearance. Following control starts braking early; cars recycle only after falling >380 m behind, to ≥550 m ahead. Traffic count is fixed. Automated tests validate this constrained choreography, not arbitrary traffic or general collision avoidance.

`NightDrive.tsx` preserves chase, driver, side, low, aerial, hood, and adds LA elevated rear: 5 m high / 10 m back (13 m portrait), looking 25 m ahead, landscape FOV60. Existing aspect-aware cockpit eye/FOV and downward radio framing are copied. Driver camera has no pose lag. External camera translation/look target ease together. Director uses ≥22-second shots, chooses a coast/neon sequence and waits until no overtake is underway; no audio playback changes occur during camera transitions.

Reduced motion disables automatic passing and Director switching, reduces acceleration and removes camera lag. It retains the underlying cruise movement; pause remains available. Mid-maneuver preference changes finish the already-started smooth transition instead of snapping lanes.

## Verified and pending

**VERIFIED (CPU):** `node --import tsx --test tests/nightdrive-dynamics.test.ts`: 11/11 pass. Nine 30-minute simulations cover all three moods, three seeds and 60/30/12.5 Hz outer update rates. Assertions cover finite monotonic distance, bounded lanes/acceleration, >8 m center separation for overlapping lanes, expected mood speed range and completed overtakes. Additional tests cover stationary departure, occupied adjacent lane, pause and a minute of reduced-motion following with bounded jerk. These are simulated durations, not browser soak durations.

**IMPLEMENTED, visitor effect unverified:** camera composition, smooth passes, district-sensitive Director and continuous world integration. Lead must inspect actual lab pixels, verify radio visibility across portrait/landscape and run sustained production performance/soak. Source correctness is not visual acceptance.

**Budget recommendation:** fixed two traffic cars; bounded recycled road chunks; instanced decorations; no dynamic shadow lights or extra mirror passes on Mobile. Preserve cockpit/DOM radio clarity before adding detail. Measure at least 60 seconds per fixed camera plus a Director soak, including frame-time p95, window p5, actual render-buffer size and geometry/texture count after chunk recycling. Target ≥30 FPS across windows rather than average alone. Existing Miami Intel UHD630 results do not benchmark this new lab. Physical phone/casting remain untested.

| Owner | Files | Status | Evidence | Blockers |
|---|---|---|---|---|
| performance | dynamics.ts, tests/nightdrive-dynamics.test.ts | Implemented; CPU verified | 11 passing tests | Browser traffic choreography pending |
| performance | NightDrive.tsx | Implemented | Shared pose/camera source audit | Actual pixels and performance pending |
| performance | reference/*.png | Independently inspected | Founder frames 2/8/14 s | YouTube unreviewed |

Next action: lead integration/typecheck, matched cockpit/LA screenshots, pass recording, chunk-boundary soak and sustained production measurements. Do not call this a finished visual improvement until those pass.

## Initial pixel review and bounded LA trial

Independently viewed all six `initial/{desktop,landscape,portrait}-{la,driver}.png` images and the existing Miami `feedback/functional/car-chase.png`. Initial Nightdrive is visually weaker: repeated enormous luminous window bands and hard light-pool circles dominate the street; the car is too small to supply the founder reference's cabin presence. This is a composition judgment across different lighting conditions, not a controlled night-versus-night quality benchmark. Coast/neon did not look meaningfully different in the captured frames. Root/world agent owns the environment corrections.

Cockpit radio is visibly retained above the dock in all three initial viewport captures; landscape fine text is small but the main display remains intact. The LA landscape rear is partly hidden by the dock, while portrait car width is roughly one fifth of the viewport versus the founder's much larger foreground vehicle.

Implemented one bounded LA-only framing trial: height 4.2 m, back 6.5 m landscape / 6 m portrait; target `(0,.6,-9)` landscape / `(0,.3,-8)` portrait; portrait FOV66, landscape FOV60 retained. All other camera settings remain unchanged. This supersedes the initial 5 m / 10–13 m LA setup above. **Candidate only:** final pixel review must confirm stronger car presence without clipping or dock overlap. No successful visual outcome is claimed from the code edit.

## Following recovery discovered in the real journey

Lead's actual five-minute `comparison-lab` journey exposed a failure that the original CPU assertions missed: at 300 seconds the hero was approximately 9.001 m/s behind a 9 m/s leader, gap about 29.9 m, with only one completed pass. Desired speed exceeded 12 m/s and the adjacent car was approximately 714 m ahead, but the original pass trigger required positive closing speed. Following had already removed that speed difference, so the hero could remain trapped behind the leader despite a clear passing lane. **`comparison-lab` is pre-recovery evidence and records this failure.**

Implemented recovery in `dynamics.ts`: after eight seconds, an established moving follower at least `max(3, leader.speed - .5)` m/s may initiate a pass when its desired speed exceeds the leader by 1 m/s and the existing adjacent-lane clearance checks pass. A stationary departure still cannot trigger a lane change. Lane timing, acceleration limits, following control and traffic count are unchanged.

**CPU verification after fix: 12/12 tests pass.** The added regression holds the hero speed-matched behind a leader with an occupied adjacent lane, confirms it stays in lane, clears the blockage, then confirms a pass starts and completes with a safe sampled gap. All nine earlier 30-minute simulations across moods/seeds/update rates and the departure/reduced-motion tests also pass. Those earlier tests only required some completed overtakes, so they did not establish recovery from prolonged following; the new case covers that missing condition.

Corrected browser journey evidence is planned under `comparison-lab-recovery`. At this documentation update the rebuild is underway; successful browser recovery is **not yet verified**. Do not attribute the fix to pre-recovery recordings or performance runs.
