# Experience First performance evidence

## Baseline — authoritative Human Radio build

Measured October15,2026 against http://127.0.0.1:3074/cruise/human-radio at `6fbffd2`. Source and radio were unchanged. Competitor browsers were closed. Headless Edge155.0.4283.45, Windows desktop,1280×720,DPR1, Auto/high, Countach cockpit, sunset. ANGLE Intel UHD630/D3D11 (not the machine's separate NVIDIA GPU). Warm local Next development server; fresh browser context. No physical mobile claim.

The car actually traveled and the Jolt audio clock advanced through90seconds of capture. After excluding the first10one-second samples,80scene-FPS observations averaged44.03, p5=36.47, minimum26.33;2below30. Maximum observed JS heap238,348,066bytes, not total RAM/VRAM. DOM ready163ms and start control ready5.713s are local warm-server measurements, not cold internet startup. No page exceptions or document overflow. [Raw results](evidence/baseline/results.json), [30s frame](evidence/baseline/drive-30s.png).

## Comparison method and acceptance

Use the same browser/hardware/resolution/DPR/quality where possible. Record differences in camera, workload, geography, cache and build type. Scene reports are1-second averaged rendered-frame counters, not GPU timer queries; min/p5refer to those samples. Browser screenshots can perturb timing. Audio evidence is advancing HTMLMediaElement time/state, not a microphone/audible-quality assessment. Heap is a browser estimate. Do not compare unmeasured competitor performance or label desktop emulation as a phone.

Target60FPSon suitable hardware; preserve at least30FPSon declared lower-end profiles where feasible. A target is not a measured result. Any retained graphical change needs actual moving evidence and a separate visual review. Do not claim indefinite-world memory safety from a short corridor test.

Later phase results are appended only after their runs. The existing19.6kmroute and five anchors must remain; reducing the playable map is not an optimization accepted by this plan.

## Phase 1 warm desktop retest

Same Edge/Intel UHD630/1280x720/DPR1 development setup, moving scene for 90 seconds. 51.71 average FPS,39.39 minimum,47.16 p5;zero of80 post-warmup samples below30. Peak observed JS heap268,163,716bytes (not GPU memory). Baseline44.03 average is context, not a controlled causal speedup claim: compilation/cache and scene timing differ. All nine functional checks passed. Raw evidence: `evidence/phase1/results.json`. Cold failed run retained separately; no production or phone performance claim.
