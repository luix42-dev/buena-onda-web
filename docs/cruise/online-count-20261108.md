# Live online counter

Cruise displays an anonymous live browser count in the garage, drive and listening
views. It uses the existing Supabase Realtime service and a separate environment
channel (`cruise:online:v1:<environment>`), with no new service or database table.
The previous optional presence experiment remains separate.

A random browser ID deduplicates tabs. Each mounted page has its own presence
key; refreshing or closing one tab cannot remove another tab's membership.
Heartbeat leases refresh every 15 seconds and expire after 45 seconds. Hidden
pages untrack, pagehide removes the channel, pageshow restores it, and connection
failures retry automatically. The UI shows Connecting instead of inventing a
count while unavailable. Cast receiver frames are excluded to avoid counting
the TV as another person. This is an active-browser estimate, not authenticated
unique people or a historical audience figure.

Verified with real Supabase connections in Chrome: one browser sees 1; two
independent contexts see 2; another tab in the first context still sees 2;
network loss removes the disconnected browser and recovery restores it; closing
that browser returns the other to 1. Seven existing presence reducer/expiry tests
pass. Source TypeScript: 571 files, zero errors.

Mobile layout checks at widths 320 and 412 verify the garage badge fits between
the brand and Cast button. It remains visible after starting a drive. Desktop
layout checked at 1366x900. Browser emulation is not physical Pixel validation.
Workspace evidence: `.tmp/cast-check-20261107/online-proof.json` and
`online-{desktop,mobile-320,mobile-412,mobile-drive}.png`.
