# NPC characters: asset notes

Retrieved 2026-10-13. All assets are Quaternius, CC0 1.0. Nothing needed a login. Processed files live in `public/real-miami/people/`.

## Sources and license verification
- Models were taken from poly.pizza (author "Quaternius"). Each page shows "Public Domain (CC0)", and the page metadata says `"Licence":"CC0 1.0"`:
  - https://poly.pizza/m/fjHyMd5Wxw (Man)
  - https://poly.pizza/m/DLptRuewTn (Man in Long Sleeves)
  - https://poly.pizza/m/mQnGoME1ez (Man in Suit)
  - https://poly.pizza/m/AQsd9ngvKU (Woman)
  - https://poly.pizza/m/XqzeZGB7iU (Woman in Tank Top)
  - https://poly.pizza/m/zMyPlQXBzq (Woman in Dress)
- Cross-check: https://quaternius.com/packs/ultimatedanimatedcharacter.html shows "License CC0" and links https://creativecommons.org/publicdomain/zero/1.0/. That pack ships FBX/OBJ/Blend through a Google Drive folder, not glTF, so I did not use it directly. I did not verify that these six models belong to that exact pack; the poly.pizza CC0 labels are what I rely on.
- Checked and rejected:
  - Universal Animation Library and Universal Base Characters: CC0, but the base characters are about 13k tris. The animation library's glTF download has unclear tiers (itch.io purchase page).
  - Several Quaternius poly.pizza characters are CC-BY 3.0 (Suit, Worker E8079Ahx7k, Witch and others). I skipped these.
  - The 62-bone "Adventurer/Casual/Beach/Hoodie" family (CC0) has Wave and Interact, but each is 5.7k to 10k tris and about 1.4 to 1.9 MB. I did not ship it.

## What was shipped
Six adult characters on one shared 31-bone skeleton, plus two small animation-only files. Total is about 1.4 MB.

| File | Bytes | Tris | Meshes | Materials | Bones |
|---|---|---|---|---|---|
| npc_man_tee.glb | 218,344 | 1,854 | 1 | 9 | 31 |
| npc_man_longsleeve.glb | 227,064 | 1,970 | 1 | 5 | 31 |
| npc_man_suit.glb | 238,240 | 2,058 | 1 | 7 | 31 |
| npc_woman_jacket.glb | 232,916 | 2,004 | 1 | 9 | 31 |
| npc_woman_tank.glb | 229,300 | 1,983 | 1 | 6 | 31 |
| npc_woman_dress.glb | 206,892 | 1,786 | 1 | 5 | 31 |
| npc_anims_male.glb | 62,240 | n/a | none | none | armature nodes only |
| npc_anims_female.glb | 61,872 | n/a | none | none | armature nodes only |

- All six share identical bone names (verified in code). Rest-pose joint translations differ by at most 1.5 mm between male and female.
- Bone names: Bone, Foot.L, Body, Hips, Abdomen, Torso, Neck, Head, Shoulder.L/R, UpperArm.L/R, LowerArm.L/R, Palm.L/R, MiddleHand.L/R, Fingers.L/R, Thumb1/2.L/R, UpperLeg.L/R, LowerLeg.L/R, PoleTarget.L/R, Foot.R.
- No textures. Everything uses flat material colors.

## Animation clips
Character files carry no animations. Load `npc_anims_male.glb` or `npc_anims_female.glb` and play its clips on the character with a three.js `AnimationMixer`. This works because track targets are bone names.

| Clip | Duration (s) | Original name |
|---|---|---|
| Idle | 4.17 | Man_Idle / Female_Idle |
| Walk | 1.04 | Man_Walk / Female_Walk (in place, no root motion) |
| Run | 0.88 | Man_Run / Female_Run |
| Sit | 8.33 | Man_Sitting / Female_Sitting |
| Stand | 0.83 | Man_Standing / Female_Standing |
| Clap | 1.67 | Man_Clapping / Female_Clapping |

Gaps and unverified points:
- There is no wave, talk or dance clip in this skeleton family. Use Clap as the cheer or gesture; fake dancing with a procedural bob; fake skating by sliding the Idle or Walk clip along a path.
- I never viewed the clips. I don't know what Sit and Stand look like, or whether Idle and Sit loop cleanly.
- Sit and Stand both shift the Body bone by about 0.8 cm on Y and 0.8 cm on Z. Stand is probably the stand-up from Sit, but that is a guess.

## Scale and orientation
- Characters are exported at unit scale 100 (the FBX centimeter convention). Rest height is about 4.84 units for men and 4.65 to 4.69 for women. Feet are at y=0 (women about -0.02), and the origin is between the feet.
- Scale the root by about 0.36 for 1.75 m (men) and about 0.355 for 1.65 m (women). Do the scaling on a wrapper group.
- Forward is +Z in glTF space. This is inferred from the eye centroid at z +0.18 to +0.22 and from the toes (z max 0.54 versus min -0.4). I did not confirm it visually.
- Set `frustumCulled = false` on the SkinnedMesh, or recompute its bounding sphere, because the scale-100 node can confuse culling.

## Wardrobe tinting: material names to set `material.color`
Materials are per-part primitives, so tint by name. Clone the materials per NPC.

| File | Shirt / top | Pants / skirt | Skin | Hair | Other |
|---|---|---|---|---|---|
| npc_man_tee | Shirt, Shirt2 (Shirt2 is probably sleeve or trim; unverified) | Pants | Skin | Hair, Hair2 | Shoes, Socks, Eyes |
| npc_man_longsleeve | Shirt | Pants | Skin | Hair | Eyes |
| npc_man_suit | Shirt | Pants | Skin | Hair | Details, TieTexture, Eyes |
| npc_woman_jacket | Shirt, Jacket, LightJacket | Pants | Skin | HairBase, Hair | Shoes, Eyebrows, Eyes |
| npc_woman_tank | Shirt | Pants | Skin | HairBase, Hair | Shoes, Eyes |
| npc_woman_dress | Dress | (dress) | Skin | Hair | Shoes, Eyes |

Treat these roles as inferred from material names. I did not inspect renders.
- Leave Eyes, Eyebrows and Details alone.
- Pastel linen needs light shirt colors, a Pants tint, and Shoes set to white.
- Skin base color is a single flat value (about linear 0.4, 0.25, 0.13 on the tee model); tint or swap it for variety.
- The suit and the jacket woman are the least beach-appropriate. Weight them lower or tint the jacket to a light pastel.

## How it was produced
Run from C:\Temp\claude\npc-tools, not from the project:
1. Downloaded `https://static.poly.pizza/<ResourceID>.glb` into C:\Temp\claude\npc-src\glb. The files were treated as data and nothing was executed.
2. Used @gltf-transform/core and functions 4.1.1 to dispose all animations and unused accessors from the character files, then prune and dedup.
3. Built the two animation files from Man and Woman. Kept six clips (Idle, Walk, Run, Sit, Stand, Clap), dropped Death, Jump, Punch, RunningJump and SwordSlash, stripped meshes and skins, and resampled with tolerance 1e-3.
4. No Draco, meshopt or KTX2.
