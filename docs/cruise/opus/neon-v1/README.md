# Neon Run v1: retrowave / cyberpunk world

Luis asked on 2026-10-13 for a retrowave cyberpunk world, "Syd Mead meets Blade Runner". It should have a DeLorean, only specific stations, and futuristic ads, including a hologram that appears out of nowhere and whispers an ad.

Open it with `/cruise?world=neon`. Miami is unchanged without the parameter.

## Built
- **World** (`components/real-miami/neon/NeonWorld.tsx`): a procedural elevated skyway over a city floor lost in smog, 70 m below.
  - Stepped megastructures with Mead-style horizontal light lines. Windows are computed from chunk-local position, so they don't swim as you drive.
  - Some chrome towers, red-lit spires, arcology pyramids and flare stacks in the distance.
  - 36 flying cars in lanes, rain, and holographic ad screens hung between the towers.
  - Cyan and magenta light strips on the barriers.
  - Everything is original geometry. No film assets, logos or locations are used.
- **Sky** (`NeonSky.tsx`): a smog sunset (amber horizon, magenta haze, indigo zenith) with a slatted retro sun and stars. It also supplies the fog, the fill light and the environment map that the paint and wet road reflect.
- **Stations** (`lib/real-miami/neon.ts`): only Nightride FM's five channels play here: Nightride, Darksynth, Chillsynth, Datawave and Spacesynth. All five streams answered HTTP 200 with `Access-Control-Allow-Origin: *`, so the live spectrum works. These are public listener streams, not rebroadcast rights.
- **VESPER** (`HoloHost.tsx`): an original holographic host.
  - She is not Joi, which is a Warner Bros. character. VESPER is a CC0 Quaternius figure under a scanline and rim-light hologram shader that glitches in and out.
  - Two of every three appearances: she forms on the barrier on your side, rides alongside about 10 m ahead while she speaks, then stays put while you pass her.
  - Every third appearance: she stands about 45 m tall between the towers.
  - Each appearance whispers one house-campaign line through the browser's speech synthesis. The radio ducks to 30% under her and then returns to your level. A caption card shows the line with its link.
  - She appears every 38–52 s. `?host=off` disables her, and `?hostFirst=<s>` brings the first appearance forward for testing.
- **Director in Neon Run** (`neonDirector.ts`): the Miami director needs OSM buildings and landmarks, so this world gets its own car-relative director with six shots: sideTrack, wheelLow, frontLow, crane, rearChase and flyby. sideTrack and wheelLow keep the wheels in frame.

## Also in this pass
- **Wheels**: the wheels now roll by the real distance driven, on all three licensed cars. See `../wheels/`.
- **Speed effect**: the speed FX (FOV widening and edge blur) is off by default. `?speedfx=on` turns it back on for A/B comparison.

## Verified
All runs used headless Edge with D3D11 at 1280x720 against the production build on 127.0.0.1:3067.
- **FPS**: chase 60.0, sideTrack 59.4, wheelLow 57.4, crane 60.0, frontLow 60.0 and driver 60.0, each a mean of eight 1-second samples. See [results.json](results.json).
- **VESPER**: `scripts/opus-neon-host.mjs` caught three appearances in a row, two roadside and one giant. Each showed its caption and then cleared. Evidence is in `../neon-host/`. Headless runs cannot hear speech, so the whisper and the ducking are **not** verified by ear.
- **Wheels**: `scripts/opus-wheels.mjs` found 4 wheels per car with the wheel angle advancing between samples, and the garage frames show the cars intact.

## Not verified / limits
- **DeLorean**: not in yet. The Countach stands in for now (see below).
- **Voice**: speech synthesis uses whatever voices the device has, so it sounds different on every machine. A recorded or TTS voice would make VESPER consistent.
- **Analytics**: VESPER's lines are not counted as ad impressions yet.
- **Mobile**: portrait layout and phone performance were not measured.

## DeLorean (needs Luis)
These Sketchfab candidates are CC BY and downloadable. Downloading needs a Sketchfab login, so Luis has to download it.
1. [DeLorean DMC12 || Retro wave art](https://sketchfab.com/3d-models/6b18d3a8859749379987380bf2ac34ab) by dark_igorek: 422k faces, already lit retrowave. Best fit for the look, but the heaviest.
2. [DeLorean DMC-12](https://sketchfab.com/3d-models/fd1742be45ff42d2b922fea2e61846a1) by vrchris: 92k faces, photoscan. Probably has no interior.
3. [DMC DeLorean](https://sketchfab.com/3d-models/4d4af57068b146cca160ed2691c05633) by tiunov.se: 134k faces.
4. [DeLorean DMC-12](https://sketchfab.com/3d-models/7001f739fe594314b5a3081163577139) by JandroS: 170k faces.

Avoid the Back to the Future time-machine versions: the film's props are its own IP, and several of those models are NonCommercial.
