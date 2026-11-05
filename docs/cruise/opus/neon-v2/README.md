# Neon Run v2: the cybercity ambience, the DeLorean, real speed

Luis's direction on 2026-10-13: "speed on the neon world needs to be faster", graphics and ambience like [xikhar/cybercity](https://github.com/xikhar/cybercity), "everything else we built is cool". He downloaded the DeLorean (#2, tiunov.se).

Open `/cruise?world=neon`.

## Built
- **DeLorean DMC-12** (`components/real-miami/jeep/Delorean.tsx`): the CC BY 4.0 model by tiunov.se, with attribution in the car credits, `LICENSE.txt` and `provenance.json`.
  - Scaled to the real 4.27 m length, with a brushed-stainless body, tinted glass and lit lamps.
  - Its four separate wheels roll by distance driven.
  - The model has no cabin, so a plain cabin (dash, binnacle, console, seats) and the interactive radio appear only in cockpit view.
  - Neon Run's garage offers only the DeLorean. In Miami it's the fourth car.
- **Speed**: Neon Run uses a fast mode on the procedural road.
  - Targets are Easy about 100, Cruise about 150 and Midnight about 200–220 km/h. The old targets were 43–90.
  - Grip, acceleration (4.8 m/s²) and braking (7 m/s²) are raised to match.
  - Traffic flows at about 70% of our pace. Slower cars are noticed from much farther back, and lane changes take 2.2 s.
  - Five traffic cars, with LED tail bars and headlights.
- **Ambience** (`NeonWorld.tsx`, `signAtlas.ts`, `NeonSky.tsx`): adapted from techniques only. No cybercity code or assets were copied. Their renderer is WebGPU with screen-space reflections and took over 3 minutes to start on this laptop; this is WebGL that starts in seconds.
  - **Street**: a street-level canyon of mid-rise blocks with glass shopfronts, awnings and stacked neon. Real words in English, Spanish and Japanese, plus our campaign names, are drawn into one 2048² atlas. Some signs flicker like failing tubes.
  - **Wet look**: wet asphalt with mirror puddles and a water film, colored reflection streaks under each sign, and glow halos in the haze. Rain runs on the GPU with splash rings and never falls inside the cabin.
  - **City**: overhead cables, curbside lamps and a double yellow line. Syd Mead megastructures with light lines, spires, pyramids and flare stacks rise behind the street wall, and flying cars cross overhead.
  - **Night**: a rain night sky with a faint retro sun down the avenue. The environment carries neon bands, so the stainless steel, glass and puddles pick up pink and cyan.
  - **Bloom**: a wider neon bloom that keeps signs saturated, with the Director grade always on.
- **VESPER**:
  - She now forms on the sidewalk on your side.
  - Every third appearance she stands 40 m tall straddling the avenue ahead, and you drive through her.
- **Quality tiers**:
  - Low: 700 rain drops, no splashes, no glow halos and fewer flying cars.
  - Medium: 1,400 rain drops.
  - High: 2,400 rain drops.
  - `?neonfx=noglow,nostreak,norain,nosigns,nofill` turns effects off one at a time for performance comparisons.

## Verified
All runs used headless Edge with D3D11 at 1280x720, high tier, on a **GTX 1060 Max-Q laptop**. Its thermal state moves FPS by ±10 between identical runs.
- **FPS**: mean chase 55.4, sideTrack 54.5, crane 55.4, frontLow 53.3, wheelLow 52.1 and cockpit 46.8, each over 10 one-second samples. See [results.json](results.json).
- **Speed**: the HUD read 128–160 km/h on Cruise pace.
- **DeLorean wheels**: 4 wheels, radius 0.332 m, angle advancing. See `../wheels-delorean/`.
- **VESPER**: 3 appearances in a row (two sidewalk, one giant), each showing its caption and then clearing. See `../neon-host/`.

## Not verified / limits
- **Cockpit FPS**: about 47 on this laptop, below the 50–60 target.
- **Phones**: real-phone performance was not measured. The tier gating is a guess until it is.
- **Reflections**: these are a stand-in for real screen-space reflections. They don't move with your view the way true reflections do.
- **Pedestrians**: none on the sidewalks yet. Cybercity's crowd with umbrellas is the next ambience gap.
