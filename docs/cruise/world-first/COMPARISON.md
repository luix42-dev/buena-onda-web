# Actual output comparison

Lead review of actual captures, supported by the independent art and QA reviews. Native/hybrid footage is a two-second diagnostic, not the requested minute. No numerical realism scores or successful architecture winner are invented.

| Criterion | Original Cruise | Jeep Night | Unreal diagnostic | Hybrid diagnostic |
|---|---|---|---|---|
| Photographic realism | Stronger near asphalt, palms and facade detail; still visibly realtime art | Graphic boxes, sparse palms and black road | Wider city field, but emissive cuboids and detached road fail | Adds a dark cabin to the failed plate; still fails |
| City depth | Sparse coastal corridor and hazy distance | Recycled narrow roadside corridor | City below elevated road; connected middle ground absent | Same city depth; cabin masks part of it |
| Road credibility | Textured asphalt, curbs and curves | Simple marks and dark surface | Correct nominal lane scale; straight, largely black and isolated | Preserves native road pixels; replacement-road seam avoided |
| Sense of scale | Local beachfront district | Limited metropolitan scale | Broader vista, not a convincing inhabited metropolis | Broader vista visible through a large close cabin |
| Lighting | Subdued coastal night; details remain readable | Warm instruments against brighter violet exterior | Regular amber pools, black surfaces; instanced shadows disabled | Unmatched cabin lighting, black mirrors and unverified reflections |
| Vehicle movement | Existing realtime route; natural traffic needs longer review | Kinematic car/road sampling; photographic traffic unproven | Actual advancing driver-eye camera; no baked vehicle or traffic | Fixed realtime Jeep over advancing plate; no calibrated passing traffic |
| Cockpit integration | Existing original interior/radio retained | Legible custom warm dashboard and spectrum | Environment-only: native cockpit not delivered | Original realtime Jeep present; framing and pixel registration unverified |
| Motion and speed | Realtime motion works in bounded live captures | Realtime motion works in bounded live captures | 60 distinct rendered frames; full acceleration/descent story unrendered | Same two-second media clock; longer synchronization unproven |
| Audio immersion | Existing radio retained; no fresh human mix approval | Existing station/spectrum behavior; no fresh human mix approval | Independent original radio in local shell; generated ambience defaults Off | Same radio owner; no station-driven visual restart; human audition pending |
| Browser performance | Fresh three-layout capture passes; callback rates are not sustained FPS | Fresh three-layout capture passes on Intel UHD630 | Three-layout muted1080p playback passes; one drop per short run | Same bounded playback pass, plus realtime cabin; one drop per short run |
| Continuous-play potential | Realtime route exists; extended soak not rerun here | 13 recycled96m chunks; photographic repetition unresolved | Two adjacent1s clips join; no last-to-first or authored-scene join approval | Same source ordering; independently authored branching unproven |
| Resemblance to founder reference | Preferred product identity, but sparse city and different composition | Intimate warm cabin, but distant city missing | Larger low city field; missing inhabited streets and photographic material response | Cabin and city combined, but dark oversized framing and lighting mismatch weaken the illusion |

## Representative evidence

- [Original live chase](qa/baseline/2026-10-12T03-24-49-508Z/originalCruise-desktop/drive.png).
- [Jeep Night live cockpit](qa/baseline/2026-10-12T03-24-49-508Z/jeepNight-desktop/drive.png).
- [Native browser plate](hybrid/browser-2026-10-12T03-19-49-582Z/desktop/unreal-paused.png).
- [Hybrid browser cockpit](hybrid/browser-2026-10-12T03-19-49-582Z/desktop/hybrid-paused.png).
- [Native first/last rendered frames and source](unreal/README.md).
- [Screenshots, silent comparison recordings and measured browser results](qa/FINAL-QA.md).

The founder reference was directly inspected locally; its low resolution, repeated shot and absent audio are recorded in the inspection. Emotional resemblance is a visual judgment, not a claim that its unknown production method or sound was reproduced. Neither new approach passes the world-quality gate. Build a connected licensed neighborhood before extending either renderer's duration.
