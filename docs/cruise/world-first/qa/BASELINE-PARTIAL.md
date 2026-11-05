# Desktop baseline checkpoint, paused for native render

Actual captures: `baseline/2026-10-12T02-46-23-129Z/`. Microsoft Edge headless, 1440x900, DPR1. Native Unreal editor and background shader compilation were active. The observations are comparative source/visual evidence, not a clean performance benchmark.

Original Cruise completed departure and an eight-second observation, with no page errors. Actual WebGL2 renderer: `ANGLE (Intel, Intel(R) UHD Graphics 630 (0x00003E9B) Direct3D11 vs_5_0 ps_5_0, D3D11)`. NVIDIA rendering is not established. Ready time was 15.2 seconds under the concurrent workload. Short rAF intervals fluctuate with background loading; no sustained FPS claim is made.

Independent inspection of its actual `drive.png` shows the selected Island Trail in an exterior chase camera, dark coastal road, palms, repeated near facades, ocean and a thin distant horizon. The corridor is readable but does not establish a wide illuminated night metropolis. The saved page video is silent.

Miami Test's actual deployed UI is the earlier **Ocean Drive / Sunset Study**, while the local source now contains `MiamiStreet`. The deployed gate is `▶ Cruise`; the original harness expected `Start the cruise` and timed out. Its `failure.png` nevertheless proves the geometry loaded: a pink convertible, coastal road, repeated low/mid-rise frontage, sparse distant towers, palms, advertising and visible radio controls. This timeout is a harness compatibility failure, not proof of an application startup failure. The selector is now adapted; actual driving/night comparison still awaits a resumed capture.

Both pages blocked Google Tag Manager and Vercel analytics. No production write or Avenue action was performed. The QA Node/MS Edge process tree was terminated once Miami's result and silent video were saved, releasing memory for the native checkpoint. A subsequent Jeep context had begun opening but did not capture evidence; Jeep remains pending. Future runs support a `qa/browser-hold` sentinel checked between pages for graceful resource release.

No world quality acceptance follows from this partial baseline. The source comparison and all phone emulation/local tests remain incomplete. Supabase historical-key retirement is still an unverified release blocker.
