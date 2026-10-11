# Authorized local Unreal setup

October 10, 2026 local time. Luis explicitly approved Epic Games Launcher/Unreal installation and a small local rendering test. This supersedes the earlier installation hold only; no paid rendering, large optional asset packs, production writes or deployment are authorized.

## Completed

- Inspected Microsoft WinGet's `EpicGames.EpicGamesLauncher` package. Package version1.3.210.0, official Epic CDN installer `EpicInstaller-20.3.3.msi`; SHA256 `d55d79710edfeaa107a62f2ea007bec1eeeac8b715a43c2ba3858eec7bc60337`.
- WinGet verified the installer hash and reported successful installation. The initial interrupted approval had not installed anything; state was checked before retrying.
- Installer ignored the requested D: location and installed the launcher at `C:\Program Files\Epic Games\Launcher\Portal\Binaries\Win64\EpicGamesLauncher.exe`. No existing installation was overwritten or moved manually.
- Launched Epic interactively for account setup. First-run update completed; executable file version20.3.5-0+UE5.
- Luis completed sign-in; the authenticated launcher was visually verified. No account credentials, date of birth or verification code entered or requested in chat.

## Installation attempt after sign-in

The Unreal Library opens, but contains no engine-version tiles. The Add Version control appears disabled, and Install Engine does not open the license or destination dialog. Other navigation and settings controls respond, so this is not established as a general input-automation failure.

Reopened the Unreal Library through the launcher's protocol link, switched between game and engine libraries, restarted only the newly installed launcher, and toggled/restored Hide Game Library. The empty engine list persisted. No engine download started, no destination was selected and no engine license dialog was accepted. Root cause remains unverified; a manual click by Luis was requested to distinguish launcher state from automation behavior. The launcher also displayed an email-verification reminder, but its relationship to the installation issue is unknown.

Latest disk check after launcher installation: C: approximately12.00 GiB free; D:154.26 GiB free. These supersede the earlier pre-install snapshot. Do not assume a specific engine size until the component dialog becomes available.

Epic's [official installation procedure](https://dev.epicgames.com/documentation/unreal-engine/install-unreal-engine?lang=en-US) requires an engine tile, license dialogs, then destination/component selection. This run has not reached those steps.

## Pending

Unreal Engine itself has **not** been installed or downloaded. Intended engine location remains D:. Configure minimum core Windows engine components and verify the launcher's disk estimate before beginning the engine download. Avoid optional platform SDKs, debugging symbols and large sample packs. Place project/cache data on D: where supported.

After the engine catalog becomes available, verify engine version availability and feature compatibility, install, open a minimal project and measure a small render. Successful launcher installation/sign-in is not proof of Unreal startup, GPU compatibility, photographic quality or finished footage. Existing GTX1060/16GB limitations remain untested.

No application source or Original Cruise changed. Owner: `/root`; no additional agent or model identity claimed for this installation step.

| Owner | Files | Status | Evidence | Blockers |
|---|---|---|---|---|
| `/root` | INSTALLATION.md, CURRENT-BUILD.md, REPORT.md | Sign-in verified; engine installation pending | Actual launcher-window inspection and disk checks; no engine tile/download | Empty engine catalog; manual-input comparison pending |
