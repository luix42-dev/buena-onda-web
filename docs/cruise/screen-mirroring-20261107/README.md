# Cruise screen mirroring — November 7, 2026

The user reported lag and a different scene on La Sala when using Cruise's Cast button from a Pixel 9 Pro XL. The previous button launched an independent custom receiver; it did not mirror the phone. The phone parked while the TV ran its own simulation, without shared route position or steering.

The primary Cast button now opens a platform-specific screen-mirroring dialog. Android offers a user-tapped `android.settings.CAST_SETTINGS` intent and immediately visible manual instructions. Android still requires the user to select a TV and approve sharing. iPhone/iPad, Mac and desktop Chrome have corresponding instructions. The button is available in the garage, radio-only mode and the player. The old TV-help entry uses the same component.

The primary UI no longer loads the custom sender SDK or automatically rejoins its session. Local scene/audio ownership and page visibility handling remain unchanged. Existing receiver routes and protocol code remain for older clients. Existing open tabs must refresh; existing custom receiver sessions must be stopped before starting OS mirroring.

## Verification

- 34 existing Cast protocol/catalog/playlist tests passed.
- Isolated source TypeScript check: 548 source/test files, zero errors. The initial standard typecheck collided with generated `.next/types` being replaced by the dev server; the isolated check omits generated artifacts.
- Pixel-sized Chrome emulation: garage, radio-only, drive and landscape dialog checks passed; car/camera/station/paused state unchanged; drive distance advanced after closing; focus restored; no custom `cast_sender.js` request. This is not physical Pixel certification.
- Physical La Sala discovery and a muted diagnostic launch verified reachability, receiver acknowledgement and advancing media time. The diagnostic session was stopped. That test does not measure video frame rate or certify screen-mirroring latency.
- Independent code review: `/root/cast_review`; platform capability research: `/root/mirror_feasibility`; dialog implementation: `/root/mirror_help_ui`. Review identified inherited pointer-event/player-style risk; the dialog now portals into `document.body`.

## Physical acceptance still needed

Refresh Cruise on the Pixel. Tap the mirroring icon, then Open screen cast. Select La Sala, approve screen sharing, return to Cruise and close the instructions. Confirm identical camera movement, car, station, menus and audio. If the intent is not handled by the device, follow the visible Quick Settings or Google Home instructions. Keep the phone awake and Cruise in the foreground. Do not claim one-tap automatic casting or fixed TV latency without this check.

## Platform references

- Android 15 Settings manifest marks the CAST_SETTINGS activity BROWSABLE and DEFAULT: https://android.googlesource.com/platform/packages/apps/Settings/+/refs/tags/android-15.0.0_r1/AndroidManifest.xml
- Chrome user-activated Android intents: https://developer.chrome.com/docs/android/intents
- Pixel screen projection: https://support.google.com/pixelphone/answer/2865484
- Google Home screen casting: https://support.google.com/chromecast/answer/6059461?hl=en

No new generated media, external services, or account settings are involved.
