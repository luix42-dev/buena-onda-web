# Cruise visual Cast receiver — setup and validation gate

The mobile release does not enable public Cast. The real Custom Receiver application is now registered as `4B58AA3F`, and the user's Google TV Streamer (4K) is registered for testing. The app remains unpublished; production still has no receiver-verified station list enabled. See the [hardware follow-up and current evidence](../cast-hardware-20261105/validation.md) for completed and pending checks.

The misleading OS mirroring instructions are removed. The button appears only in a compatible secure Chromium browser after the official sender SDK initializes, with both settings below present.

## Required external setup

1. Registration is complete in the [Google Cast SDK Developer Console](https://cast.google.com/publish/): **Custom Receiver**, application ID `4B58AA3F`. The intended production URL is `https://www.buenaondalifestyle.com/cruise/receiver`. During the hardware follow-up, the unpublished app temporarily uses an isolated LAN receiver; restore and test the production HTTPS URL before publishing. There is no default-receiver fallback.
2. On an isolated test build, configure `NEXT_PUBLIC_CRUISE_CAST_APP_ID` with that ID and `NEXT_PUBLIC_CRUISE_CAST_STATIONS` with comma-separated candidate station IDs. Sender and receiver must use matching lists. A candidate list is for validation only; enable a production station only after actual receiver playback is verified. Both values require a rebuild.
3. Test Chrome Android and desktop on the same network as the receiver: real picker, cancellation, receiver launch, receiver WebGL, each world/car/mood, playback, pause, volume/mute, rapid station changes, reconnect, disconnect, device name, and loss of network. Check TV audio and the phone for duplicate playback. Measure sustained receiver FPS and memory on the weakest supported hardware.
4. Test each station's real HTTPS URL including redirects, audio codecs, HLS manifests/segments where applicable, cross-origin response headers, and actual receiver playback. Playlist URLs are resolved by the same existing radio hook on the receiver. Never put blob URLs in the station allowlist or assume an HLS stream works because it works on desktop.
5. Publish the custom receiver and enable the validated settings in Production only after the hardware gates pass. Until then, mobile fixes can ship with Cast hidden.

## Implementation and boundaries

The official Web Sender SDK opens `CastContext.requestSession()` from a button tap. Its session lifecycle supports joining an existing origin-scoped session. The receiver loads the official CAF receiver SDK and hosts an independent low-tier Cruise scene in a same-origin frame. It does not mirror pixels and is not an audio-only default receiver. The existing adaptive quality controller remains active; hardware capability and performance are not yet verified.

Custom namespace: `urn:x-cast:com.buenaonda.cruise.v1`. Commands carry version 1, monotonically increasing sequence, type (`sync`, `play`, `pause`, `station`, `volume`, `status`), and optional station ID, playback, volume/mute and scene (world, car, mood). The receiver validates station IDs against the allowlist, ignores stale sequence numbers, validates scene choices, and reports readiness, station, playback, volume/mute and errors. Commands to the scene are restricted to its parent and same origin. Phone controls use the existing radio selection hook. The receiver starts muted; only receiver-confirmed playback transfers ownership, pauses local audio, and restores the requested receiver volume/mute. Canceling the picker leaves local playback untouched.

Automated checks cover sender lifecycle with a mock SDK; they do not establish device compatibility or actual picker behavior. Physical device testing, reconnect/loss scenarios and Cast-stream certification remain required before enabling this path.

## HTTP probes (not receiver certification)

- Jolt Radio: HTTPS 200, `audio/mpeg`, CORS allows the requested Buena Onda origin. No HTTP redirect observed.
- Nightride: HEAD returns 405; bounded GET returns HTTPS 200, `audio/mpeg`, `Access-Control-Allow-Origin: *`. GET intentionally stops after three seconds because it is a continuous stream.
- Other stations have not been certified on Cast. The verified station list stays empty.

Official references: [Web sender integration](https://developers.google.com/cast/docs/web_sender/integrate), [custom receiver](https://developers.google.com/cast/docs/web_receiver/basic), [custom channels](https://developers.google.com/cast/docs/web_receiver/core_features), [registration](https://developers.google.com/cast/docs/registration).
