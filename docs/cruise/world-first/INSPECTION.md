# World First — inspection and preconstruction assessment

The new request supersedes earlier founder-review pauses for this isolated local world proof. No deployment, production data mutation, purchases or paid rendering is authorized. `/cruise` remains the baseline. The existing working tree has unrelated unfinished cinema, projection and cockpit work and is preserved.

## Verified source and baseline

- Main repository: `D:/10-VENTURES/12-buena-onda/cruise-publish-20261006`, branch `experiment/cruise-miami-master`, HEAD `8ecc9ce15d82aecfa3662ff4e3f9f05668b9f33e`.
- Actual Original Cruise entry: `app/(site)/cruise/CruiseClient.tsx` imports `components/cruise/LaunchExperience.tsx`, **not** the older `CruiseExperience.tsx`. Preserve its garage, car presentation, radio controls and styles.
- Jeep Night is a separate source project at `D:/10-VENTURES/12-buena-onda/cruise-jeep-live-20261011`. Its Vercel project is `buena-onda-jeep-night`; its public URL is https://buena-onda-jeep-night.vercel.app. It is not the production baseline.
- Jeep Night uses React Three Fiber/Three.js for both scenery and custom cockpit, with a downloaded/repaired Wrangler GLB for its exterior. There is no scenery video. `NightWorld` recycles 13×96 m deterministic road chunks. `stepNight` advances a touring state; camera, car and traffic sample the same road. Distant buildings are simple instanced forms and sparse window meshes rather than a large authored city.
- Its independent audio owner is a copy of `useCruiseAudio`; a Web Audio capture tap drives spectrum displays. Radio changes do not replace the scene. Existing live browser evidence verifies control behavior at 1440×900, 844×390 and 390×844; these phone sizes are desktop emulation, not phone certification. Representative one-second FPS samples are not sustained benchmarks.

## Visual diagnosis before construction

The available founder source `D:/10-VENTURES/12-buena-onda/33secref.mp4` is a 32.70-second 368×496 clip with no audio. Prior saved decoded frames/contact sheets and a new independent artist inspection establish the downhill central vista, dense distant lights, dark near framing, warm instruments and cool exterior. The source contains a repeating driving composition and a branded outro. It is reference material with unresolved reuse rights, not deliverable world footage.

Jeep Night improves dashboard/control legibility and proves browser radio/spectrum behavior. Its scenery still shows a narrow, sparse corridor: repeated box facades, few window columns, simple palms, little atmospheric layering and almost no broad illuminated metropolis. Extending its chunk count alone will not make it photographic. Existing rear projection evidence shows a visible replacement-road seam and lens/hood mismatch; another uncalibrated video plane is not an acceptable final solution.

The first Unreal checkpoint must establish a wide city-light field, believable scale, material response and darkness. Geometry presence is not a photographic-quality pass. The competing hybrid proof must preserve photographic foreground pixels or use calibrated environment-only frames with matching camera transforms and occlusion. If neither looks meaningfully closer to the source, the quality gate fails honestly.

## Hardware and release boundary

The local machine exposes Intel UHD 630 and NVIDIA GTX 1060 Max-Q; the previous direct NVIDIA audit records 6 GiB VRAM. Windows `AdapterRAM` is not a reliable VRAM size field here. System RAM is about16GiB and free physical RAM was4.77GiB at inspection. UE5.8.3 is now installed; previous actual DX11/SM5 renders exist. No editor was running at this inspection. Lumen, hardware ray tracing and path tracing are not established on this machine. A large CiThruS startup previously exhausted resources; use one bounded small map, not that project.

The leaked Supabase service-role key's retirement was previously reported by the founder but has not been independently verified. It remains a release blocker. The file is no longer tracked at HEAD; that does not prove historical-key revocation. No secrets are printed, no production credentials or data are changed, and no Avenue claims are enabled.

## Source preservation snapshot

Git blob hashes taken before work:

| File | Hash |
|---|---|
| `app/(site)/cruise/page.tsx` | `1b558244f80bf6ca6147e9167b0e5fa76df13b2e` |
| `app/(site)/cruise/CruiseClient.tsx` | `0c1130e4c065102195d715b255a364f5ca5e99ec` |
| `components/cruise/LaunchExperience.tsx` | `97931445cc60c1318272b9fefbe520431d9e2dfb` |
| `components/cruise/CruiseScene.tsx` | `9f1daa80ae178a1374b79866f1a9b2345b72909f` |
| `components/cruise/audio/useCruiseAudio.ts` | `40a4d5a213f6391ca3e802975162e2af9797eae5` |
| `middleware.ts` | `3ce137612e443ad07386cdeb39303b16f50c3ad1` |

## Actual orchestration

Four concurrent slots are available, so seven workstreams are grouped and sequenced rather than inventing seven simultaneous agents. `/root/world_art` (configured `gpt-6-astra`) owns A/C world architecture and art. `/root/unreal_director` (configured `gpt-6-astra`) owns B native production. `/root/hybrid_playback` (configured `gpt-6.1-sol`) owns D/E hybrid and playback. Lead `/root` handles F audio and G initial QA/security and integration; independent QA can use a slot once production research finishes. These are requested runtime configurations, not claims of hidden backend model provenance or unavailable hardware.

Subsequently the available slots were reused for `/root/audio_music` and `/root/qa_security`, each configured `gpt-6.1-sol`. They independently reviewed audio and performed browser/security work respectively. The lead integrated their outputs. See the latest milestone ledger in [REPORT.md](REPORT.md).
