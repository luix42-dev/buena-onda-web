# Authorized local Unreal setup

October 10, 2026 local time. Luis explicitly approved Epic Games Launcher/Unreal installation and a small local rendering test. This supersedes the earlier installation hold only; no paid rendering, large optional asset packs, production writes or deployment are authorized.

## Original installation

- Inspected Microsoft WinGet's `EpicGames.EpicGamesLauncher` package. Package version1.3.210.0, official Epic CDN installer `EpicInstaller-20.3.3.msi`; SHA256 `d55d79710edfeaa107a62f2ea007bec1eeeac8b715a43c2ba3858eec7bc60337`.
- WinGet verified the installer hash and reported successful installation. The initial interrupted approval had not installed anything; state was checked before retrying.
- Installer ignored the requested D: location and installed the launcher at `C:\Program Files\Epic Games\Launcher\Portal\Binaries\Win64\EpicGamesLauncher.exe`. No existing installation was overwritten or moved manually.
- Launched Epic interactively for account setup. First-run update completed; executable file version20.3.5-0+UE5.
- Luis completed sign-in; the authenticated launcher was visually verified. No account credentials, date of birth or verification code entered or requested in chat.

## Installation attempt after sign-in

The Unreal Library opens, but contains no engine-version tiles. The Add Version control appears disabled, and Install Engine does not open the license or destination dialog. Other navigation and settings controls respond, so this is not established as a general input-automation failure.

Reopened the Unreal Library through the launcher's protocol link, switched between game and engine libraries, restarted only the newly installed launcher, and toggled/restored Hide Game Library. The empty engine list persisted. Luis confirmed that manual clicks also failed. A fresh web cache and an administrator launch did not restore engine selection. The old cache was preserved as `webcache_4430.cinema-backup` under Epic's local Saved folder. No engine download started, no destination was selected and no engine license dialog was accepted. The launcher also displayed an email-verification reminder, but its relationship to the installation issue is unknown.

Latest disk check after launcher installation: C: approximately12.00 GiB free; D:154.26 GiB free. These supersede the earlier pre-install snapshot. Do not assume a specific engine size until the component dialog becomes available.

Epic's [official installation procedure](https://dev.epicgames.com/documentation/unreal-engine/install-unreal-engine?lang=en-US) requires an engine tile, license dialogs, then destination/component selection. This run has not reached those steps.

## Bounded recovery attempt

Independent targeted review by `/root/cinema_unreal` identified an October6 firsthand [matching Launcher20.3.x report](https://forums.unrealengine.com/t/install-engine-and-do-nothing-engine-versions-empty-log-eoshstate-waitingforbuildsanditemfiles-found-0-entitled-apps-new-account-launcher-20-3-4/2837432). Its reported workaround uses an older official launcher to reach the missing Unreal license flow. This is community evidence, not an Epic-confirmed root cause or a verified fix for our machine. Our log likewise reports `WaitingForBuildsAndItemFiles`, zero entitled apps and zero item files. No undocumented registry edits were made.

- EOS5.8.1's original installer exited0. A manual service-start experiment without updater arguments produced exit77/`No updater mode specified`; the original updater exited0. The manual error must **not** be presented as the original installation failure.
- Luis supplied `EpicInstaller-20.3.3-unrealEngine-51aa5a9a1dfe45358fa9869cee1c5f01.exe`: valid Epic Games signature,264,283,136bytes, SHA256 `E3D862E40160F333CE116F7038F1EAD8DACE971D504E1FC8BE7EAF06B698D961`. Product metadata identifies a Launcher installer, not the Unreal engine. Opening it did not establish a repair; launcher remained20.3.5.
- Microsoft WinGet's historical package1.3.159.0 identified Epic's official18.12.1MSI. Downloaded from Epic CDN,353,636,352bytes. SHA256 `8DC09359E3E33A3818A09432337D390DE5FB640400CC5E21FCABBFB2E02BEC91` matched the package catalog; Authenticode signature valid, Epic Games.
- Verified no installed Epic game/engine manifests. Preserved settings in `Config.cinema-before-recovery` inside Epic's local Saved folder. No settings or credentials copied into project documentation.
- First removal stopped with MSI1730/1603 because it required administrator rights; no successful removal claimed for that attempt. Authorized elevated retry: current-launcher uninstall0, recovery-launcher install0. Both operations logged locally under ignored `.vercel`; raw logs are not committed.
- Recovery launcher performed its first809MB self-update and reached **19.2.0-0+UE5**, process executable under `C:\Program Files (x86)\Epic Games\Launcher\Portal\Binaries\Win64`. Luis completed account setup privately and initiated the engine install. The engine catalog blocker is **resolved for this run**: actual window now shows **Unreal Engine5.8.3 installing**, reaching23% in the latest inspected frame. No permanent update-disable setting was applied. This observation does not establish the exact backend cause or guarantee the workaround for other accounts.
- Launcher log independently confirms install destination `D:/10-VENTURES/12-buena-onda/UE_5.8` and staging directory `D:/10-VENTURES/12-buena-onda/UE_5.8/.egstore/bps`. Selected tags include templates and engine_source. Initial UI showed12.3GB remaining; at23% it showed9.9GB remaining. These are progress snapshots, not final installed sizes.

## Pending

October 11, 00:23 EDT: `/root/cinema_unreal` prepared `watch-and-probe.ps1`; `/root` reviewed and launched it hidden (PID 25644). The initial saved state is `WAITING_INSTALL`. This replaces repeated conversational polling with one actual background process, bounded to eight hours. It checks the completed Epic item manifest plus final editor executable, requires at least 4 GiB free RAM and no existing Unreal editor, then runs the existing 12-minute DX11 diagnostic once. It does not close applications, alter the installer or retry failures. Status is saved on state changes under `.vercel/cinema-probe/watcher/status.json`; probe logs remain local. Pixel inspection and actual RHI/GPU verification are still required after any successful file-sanity result. The earlier manual monitor ended before this watcher started.

Later progress: the install reached 97%, then reported 82% while changing phase. Sanitized BuildPatch logs at `2026.10.11-03.43.03` UTC explicitly report `Staged install complete` and `Running backup and stage relocation`. The final Engine folder and editor executable subsequently appeared. `Engine/Build/Build.version` identifies 5.8.3, changelist 58210709, compatible changelist 55116800, branch `++UE5+Release-5.8`. This is not yet a completed-install claim: the UI still says Installing and no matching completed installation registration exists.

Bounded monitoring found active file construction, completion and relocation, rather than an error dialog. One measured 25-second interval wrote 13.56 MiB and consumed 2.94 CPU seconds; recent BuildPatch error/fatal entries were zero. D: had 124.09 GiB free in that later snapshot. Monitor timeouts do not mean installation failed. No installer restart, cancellation or partial-engine launch was performed.

Unreal Engine 5.8.3 is **finalizing, not yet verified complete**. Destination and staging are verified on D:. No optional platform SDKs, debugging symbols or large sample packs were requested by this work. The prepared diagnostic project/cache are on D: too.

After installation completes, open a minimal project and measure a small render. Successful launcher recovery/engine download is not proof of Unreal startup, GPU compatibility, photographic quality or finished footage. Existing GTX1060/16GB limitations remain untested.

No application source or Original Cruise changed. Owners: `/root`, with targeted read-only diagnosis by `/root/cinema_unreal`; inherited exact runtime model variants unavailable.

| Owner | Files | Status | Evidence | Blockers |
|---|---|---|---|---|
| `/root` | INSTALLATION.md, CURRENT-BUILD.md, REPORT.md | Recovery launcher19.2.0 installed; UE5.8.3 downloading on D: | Verified signatures/hashes, MSI exits0, actual23% progress, destination log | Engine completion, startup and rendering |
| `/root/cinema_unreal` | Read-only diagnosis; ignored compatibility-probe preparation | Matching community report independently located; local recovery now works | Targeted sanitized log review, sources and root's actual install observation | Render probe not run; no guaranteed standalone web EULA fix |

The initial progress observations in the table are historical milestones; the final-relocation update above is the current state. `/root/cinema_unreal` owns the remaining bounded install monitor and startup probe. Asset diagnostics ran separately in the existing portable Blender; see [ASSETS.md](ASSETS.md).
