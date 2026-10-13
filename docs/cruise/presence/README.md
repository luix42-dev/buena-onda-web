# Live cruisers presence

A pill reading `● N cruising now`, backed by Supabase Realtime Presence. No tables, no polling, no login, no new paid infrastructure.

## Files
- `components/real-miami/presence/usePresence.ts`: hook plus the pure reducer `countPresence`.
- `components/real-miami/presence/LiveCruisers.tsx` and `live-cruisers.module.css`: the pill.
- `tests/presence.test.ts`: reducer tests.

Usage: `<LiveCruisers enabled={boolean} className?={string} />`. The parent positions it through `className`.

## How it works
- One Realtime channel, `cruise:presence`, opened through the repo's existing browser client (`createClient()` in `lib/supabase/client.ts`).
- Each tab joins with a presence key from `sessionStorage` (`buena-onda:tab:v1`, `crypto.randomUUID`). It also tracks `{ visitor }`, taken from `localStorage` (`buena-onda:visitor:v1`).
- The hook returns `sessions` (tabs) and `visitors` (unique visitor ids). The UI shows `visitors`.
- A tab tracks only while `document.visibilityState` is visible. It calls `untrack()` when hidden and `track()` again when visible. Hidden tabs are therefore not counted.
- On unmount and on `pagehide` the tab untracks and calls `removeChannel`. Supabase also drops presence for closed sockets on its own.
- The viewer counts themself, so the minimum shown is 1.

## What is counted
- Concurrent, visible browser tabs, which is `sessions`.
- Unique browsers among those tabs, which is `visitors`. Two tabs of one browser count as one visitor.
- Nothing is seeded or padded. A tab with no visitor id counts as its own visitor.

## When the pill hides
The pill renders nothing when any of these is true:
- `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` is missing.
- The channel is not `SUBSCRIBED` within 8 seconds.
- The channel reports `CHANNEL_ERROR`, `TIMED_OUT` or `CLOSED`, including after a count was already showing.
- `enabled` is false.

It never shows 0 or a stale number as live. There is no automatic reconnect; the pill stays hidden until the page remounts it.

## Known limits
- Supabase Realtime, Free plan, from https://supabase.com/docs/guides/realtime/limits (checked 2026-10-13): 200 concurrent connections, 100 messages per second, 100 channel joins per second, 100 channels per connection, 20 presence messages per second, 10 presence keys per object. Every open tab is one connection, so about 200 simultaneous tabs is the ceiling. Past that, new tabs fail to join and the pill hides for them. Presence join and leave events are also rate limited, so a burst of arrivals can delay counts. Confirm against the live docs and your plan before a traffic spike.
- Private or incognito windows have their own `localStorage`, so each counts as a separate visitor. So does a different browser or device, and so does a user who cleared storage.
- Duplicating a tab can copy `sessionStorage` in some browsers. Both tabs then share a presence key and count as one session.
- The count is a client-side signal over an anonymous public channel. Anyone with the anon key can join it, so it is not tamper-proof and should not be used as a business metric.
- Realtime must be enabled on the Supabase project, and the anon role must be allowed to use Broadcast and Presence. If public channels are blocked, the pill simply hides.

## Verify manually
1. Run the app with the Supabase env vars set, open the page that mounts `<LiveCruisers enabled />`, and wait a second or two. The pill should read `1 cruising now`.
2. Open a second tab of the same browser. Both tabs still show `1`, because `visitors` dedupes by browser. DevTools shows two keys in `channel.presenceState()`, which is `sessions`.
3. Open a private window, or a different browser, on the same page. Both sides should read `2 cruising now`.
4. Switch the private window to another tab. The other side drops to `1` within seconds, and it returns to `2` when you switch back.
5. Close the private window. The other side drops to `1`.
6. Go offline in DevTools, or remove the env vars and reload. The pill disappears and never shows `0`.
