# Prototype business integration

Wrap only the new prototype route with `PrototypeBusinessBridge` from `components/experience/PrototypeBusinessBridge.tsx`. Its only prop is `children: ReactNode`. Existing Cruise routes are not wrapped or edited by this change.

The wrapper supplies the existing default campaign and an optional local-demo contract to `CampaignBridge`. Without that option the existing legacy behavior is preserved. With it, legacy analytics are inactive; exposure and CTA calls are bypassed, and world activation invokes a business inspection callback instead of opening the old route. This does not disable unrelated telemetry owned elsewhere in the application.

The optional Along the drive directory appears after leaving the garage, outside radio focus and other native dialogs. Its own native dialog contains existing campaign/place copy with HOUSE or DEMO labels. Escape and Back to drive close the dialog. Radio remains owned by the parent and is not restarted. No payments, claims, transfers, cross-device controls, invented businesses or new destinations are introduced.

Local observations distinguish a qualified geometric opportunity from a deliberate inspection. Qualification reuses the existing visibility, occlusion and continuous two-second readability checks. One opportunity is emitted per continuous placement encounter; losing qualification permits a later new encounter. Repeated activations within 600 milliseconds are suppressed. These are test observations, not unique people, proven readability or billable impressions. They are unrelated to the numbered Avenue drive-by counter and its server deduplication.

The latest 100 observations remain in React memory and can be downloaded as JSON. Their explicit fields are DEMO / TEST label, event type, campaign ID, placement ID, surface and relative timestamp. No station, song, listener or persistent session identifiers are included; the recorder performs no network or storage access. Closing or reloading the page loses these observations.

Validation: three focused recorder tests pass, covering continuous encounter deduplication, deliberate activation suppression, independent placements, disappearance/obscuration resets and allowed event fields. `git diff --check` passed. No browser interaction, performance benchmark or full application build was run for this bounded change; integration type checks and visual/focus validation remain required.
