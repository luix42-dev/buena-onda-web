# GTA5 iOS port: usefulness, rights and selected security review

October 15, 2026. Repository HEAD remains [`7b2f2cdc4ad82870c8ed08d44fa81ad2dad6a40d`](https://github.com/kevinerikjs/gta5-ios-port/tree/7b2f2cdc4ad82870c8ed08d44fa81ad2dad6a40d), matching the [earlier source assessment](../../human-radio/GTA5-IOS-ASSESSMENT.md). Reused that review and inspected selected build/security paths. No clone, build, downloaded game files, binary execution, imported code/assets, account connection or paid service.

## Decision for Buena Onda

Use as a reference for robustness; do not integrate the native engine. [`build_ipa.sh`](https://github.com/kevinerikjs/gta5-ios-port/blob/7b2f2cdc4ad82870c8ed08d44fa81ad2dad6a40d/build_ipa.sh) invokes input preparation, Xcode targeting `iphoneos`, signing and IPA packaging. Its Swift/UIKit and Objective-C++ Metal implementation does not drop into Next.js/R3F. The [README](https://github.com/kevinerikjs/gta5-ios-port/blob/7b2f2cdc4ad82870c8ed08d44fa81ad2dad6a40d/README.md) describes ARM64 conversion and approximately 21 GB of user-supplied files. Runtime quality, completeness and iPhone performance were not reproduced. This is not a source of licensed Miami scenery.

Three concrete patterns remain useful:

- **Independent quality and resolution plus recovery to proven settings.** [GraphicsOptions](https://github.com/kevinerikjs/gta5-ios-port/blob/7b2f2cdc4ad82870c8ed08d44fa81ad2dad6a40d/app/App/GraphicsOptions.swift) separates presets/render sizing; [GameSettings](https://github.com/kevinerikjs/gta5-ios-port/blob/7b2f2cdc4ad82870c8ed08d44fa81ad2dad6a40d/app/App/GameSettings.swift) tracks pending startup and last stable settings. Adapt conceptually to WebGL recovery while keeping radio mounted. Browser termination is ambiguous; never label every interrupted startup an out-of-memory crash.
- **Safe-area touch positions with essential controls protected.** [ControlsLayout](https://github.com/kevinerikjs/gta5-ios-port/blob/7b2f2cdc4ad82870c8ed08d44fa81ad2dad6a40d/app/App/ControlsLayout.swift) persists normalized position/scale/visibility and prevents hiding essential buttons. For Cruise, keep play/station/volume and exit available; a full layout editor is unnecessary now.
- **Commit asset bytes before publishing cache availability.** [NativePackedAssetCache](https://github.com/kevinerikjs/gta5-ios-port/blob/7b2f2cdc4ad82870c8ed08d44fa81ad2dad6a40d/app/Source/NativePackedAssetCache.h) synchronizes data before presence bits. The ordering principle applies to optional licensed scenery caching; its sparse-file/mmap code is native-specific. Do not cache live radio recordings.

These are proposed adaptations, not changes made to Cruise or measured improvements.

## License boundary

The [LICENSE](https://github.com/kevinerikjs/gta5-ios-port/blob/7b2f2cdc4ad82870c8ed08d44fa81ad2dad6a40d/LICENSE) grants MIT terms for this project's code and explicitly excludes Rockstar/Take-Two code/data/assets and fetched/patched third-party inputs. MIT notice obligations apply to any future code reuse. It establishes no right to publish GTA maps, vehicles, textures, audio or engine files inside Buena Onda. A broader dependency/asset review would be required before adoption; none is proposed here.

## Selected security evidence

[`prepare.py`](https://github.com/kevinerikjs/gta5-ios-port/blob/7b2f2cdc4ad82870c8ed08d44fa81ad2dad6a40d/app/Scripts/prepare.py) checks the exact engine hash, fetches build tooling, compares the WABT archive against an upstream checksum, clones a versioned SIMDe dependency and invokes compilation. [`fetch_game_files.py`](https://github.com/kevinerikjs/gta5-ios-port/blob/7b2f2cdc4ad82870c8ed08d44fa81ad2dad6a40d/app/Scripts/fetch_game_files.py) also checks engine/shader-index hashes. These are useful validation controls, not a comprehensive trust guarantee.

[`safe_extract.py`](https://github.com/kevinerikjs/gta5-ios-port/blob/7b2f2cdc4ad82870c8ed08d44fa81ad2dad6a40d/app/Scripts/safe_extract.py) uses Python's data extraction filter where supported. Its older-Python fallback checks resolved member paths, without explicit symlink/hardlink rejection in that function. No exploit was tested; the fallback merits separate review before processing untrusted archives.

The [workflow](https://github.com/kevinerikjs/gta5-ios-port/blob/7b2f2cdc4ad82870c8ed08d44fa81ad2dad6a40d/.github/workflows/build-ipa.yml) has repository-content write permission, uses version-tagged third-party Actions and installs build dependencies. These supply-chain and permission choices require review before executing someone else's build. This inspection does not certify the web builder, fetched tools, third-party binaries or resulting IPA as safe. No malicious behavior was established in the inspected excerpts.

Near-term Cruise work remains composition, reliable rendering/loading and human radio. Native conversion would introduce a separate platform, asset-rights problem and build pipeline without resolving those product needs.
