# World First independent QA

Owner: `/root/qa_security`, configured model `gpt-6.1-sol`. No child agents. Bounded browser verification is complete; all QA browsers are closed. See [FINAL-QA.md](FINAL-QA.md) for actual artifacts, passing functional checks and remaining quality/release blockers.

## Verified without browser

On 2026-10-12 at 02:34 UTC, all six original Git blob hashes in `../INSPECTION.md` matched the working files. Git staged paths were empty. No original application file was edited by QA. Both harness scripts pass Node syntax checks. Evidence: `local/2026-10-12T02-34-13-573Z/preflight.json`.

The shell uses the actual original garage and a separate muted video owner after departure. At the initial preflight its manifest contained no clips. It now contains the bounded two-second native and nine-second reference diagnostic; every source remains `qualityAccepted:false`. Interface readiness is deliberately separate from visual acceptance.

## Harness

`node scripts/world-first-baseline.mjs` and `node scripts/world-first-proof.mjs` perform preflight only. A browser launches only with explicit `--run`, after the lead releases the memory hold.

```powershell
node scripts/world-first-baseline.mjs --run --seconds=12
node scripts/world-first-proof.mjs --run --url=http://127.0.0.1:3060/cruise/world-test --source=unreal --seconds=30
node scripts/world-first-proof.mjs --run --source=hybrid --profiles=desktop,portrait,landscape --seconds=30
node scripts/world-first-proof.mjs --run --source=reference --profiles=desktop,portrait,landscape --seconds=10
```

Baseline targets: Original Cruise `/cruise`, Miami Test `/cruise/miami-test`, and the separate Jeep Night deployment. Optional `--targets=originalCruise,miamiTest,jeepNight` and `--profiles=desktop,portrait,landscape` narrow captures. Profiles are 1440x900, 390x844 and 844x390 at DPR1. Phone dimensions are desktop browser emulation, not physical Android validation.

Each context runs sequentially and saves viewport screenshots, a **silent** Playwright page video, sanitized blocked request records and metrics. There is no microphone, system audio, radio capture, MediaRecorder or stream download. Live radio may play for functional testing but is not included in recordings. Browser renderer strings are collected from actual WebGL contexts; no NVIDIA claim is made before those artifacts exist.

The request guard blocks non-GET/HEAD/OPTIONS traffic, known analytics endpoints and Avenue API requests, including sendBeacon traffic. Service workers are blocked. It records no request/response body, headers, credentials or URL queries. It does not click claim, payment, cast, sponsorship or external store actions.

Metrics distinguish browser animation callbacks from presented video frames. Loading duration, media file bytes, decode/drop counts, presented-frame timestamps, temporal sample progression and transitions are retained. Radio switching and pausing are checked against the video identity, timeline and load/pause events. A natural segment transition during a radio switch makes that narrow check inconclusive. World pause and independent synthesized ambience receive separate checks. Short samples are not a sustained performance or GPU-memory certification.

The nine-second reference diagnostic is replayed before each independent functional phase. Radio switching occurs near the beginning and has no replay inside its observation window. A final uninterrupted pass records the actual two-clip transition and end. These deliberate restarts are separate tests, not a continuous nine-second loop or a sixty-second authored world. The optional `--seconds` controls only the final uninterrupted observation; it cannot lengthen the source.

## Open gates

- Browser screenshots/video now verify Intel UHD630 rendering and bounded functional checks on desktop emulation; physical phone and sustained performance remain unverified.
- Native photographic world, matched hybrid calibration, visual joins and longer duration playback have not passed independent inspection.
- Previously leaked Supabase key retirement remains unverified. QA will not inspect credentials, revoke keys or mutate production data.
- No deployment, paid service, cloud GPU or asset purchase is authorized.
