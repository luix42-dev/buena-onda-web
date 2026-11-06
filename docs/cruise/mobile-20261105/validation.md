# Cruise mobile release — 2026-11-05

Baseline: production `089a41d794d17a7dbb708fd1bbf078916f153f9c`, inspected before editing. Implementation tested on Vercel preview `132f7072a3fde41bf93800418ded38f2c325964d` at `https://buena-onda-d8ll9booe-luis-manjarres-projects.vercel.app`. Nav v2, the Radio fallback fix, worlds, car assets and station catalogue are retained.

## What changed and why

- Mobile inherited the desktop deck and multiple independent promotional/Nova surfaces. A measured, safe-area-aware player now owns the bottom space. Previous/play/next are immediate; station selection and secondary settings use modal sheets. Branding and Garage retain comfortable targets.
- Station stepping uses the selectable station order and synchronous selection ref, retaining the existing abort/revision guards, playback intent, volume and mute. Media Session routes to the same station action.
- Promotions previously had inconsistent close behavior and component-local dismissal. The shared overlay slot and session campaign IDs prevent duplicates and reappearance after remounts. Retrowave now passes actual campaign IDs rather than inferring identity from a URL shared by multiple campaigns.
- Show ads controls overlay and promotional billboard content in Retrowave, Highway and City, including the optional native City variant. Hidden billboards cannot receive promotional clicks. Environmental signs remain.
- Mobile Nova companion and hologram are opt-in, with local preferences. The Retrowave station suggestion exists in the station picker rather than over the drive.
- The native City regression exposed a loading overlay waiting on the inactive R3F renderer. Native City readiness now releases that overlay directly.
- Fake Cast/mirroring instructions were removed. The SDK/custom visual receiver implementation is gated off without a registered application and receiver-tested station allowlist. See [Cast setup and hardware gates](cast-setup.md). No physical Cast result is claimed.

## Performed checks

Chrome 156.0.8078.80 on Windows through Playwright 1.51.1. Mobile viewport/touch emulation, DPR 1, no network or CPU throttling. This is not physical phone, steering-wheel, lock-screen, or TV testing.

- 360×844, 390×844, 430×844, 844×390 landscape, 1440×900 desktop: all browser matrix cases pass; no page errors.
- Mobile starts without the suggestion panel or Nova badge/dialogue. Screenshots show no unsolicited hologram. Desktop retains its existing deck.
- Previous/next targets meet 44×44; selection follows the picker order and wraps. Eight rapid paused selections preserve pause. Volume 0.37 and mute persist through selection. World changes preserve station.
- Jolt's media element loads and advances playback after a user tap. Rapid playing selections leave at most one active HTML audio element. This verifies browser playback state, not audible output from a physical device.
- Chrome Media Session next handler is registered and changes station through the shared action. Actual hardware controls remain untested.
- More/station sheets trap focus; Escape closes and returns focus. Ads sit above the measured player. Closing a promotion opens no new tab; the campaign remains dismissed even when another placement uses a different URL, and the dismissal survives reload.
- Show ads hides Retrowave screens and promotional overlays. Native City scene inspection confirms the named promotional billboard group toggles visible → hidden → visible. Default City, Highway driving, car selection, Garage return, radio-only mode and classic Cruise were exercised successfully.
- Radio archive remains at `/radio?fallback=1`, renders its archive heading and audio elements, and has no overlapping active audio. Homepage Radio cards and Tune in links target `/cruise`.
- HTTP HEAD: `/`, `/cruise`, `/cruise?mode=classic`, `/radio?fallback=1` return 200; `/radio` returns 307 with `Location: /cruise`.
- TypeScript passes. Local production build and Vercel preview build pass. Full unit suite: 204 pass, 4 fail out of 208. The four unchanged checkout tests fail because `revalidatePath` runs without a Next.js static-generation store; checkout test and webhook sources are unchanged from main. The new mock Cast lifecycle test passes and is included in the 204.

Two browser harness assumptions were corrected during testing: default City is the district renderer, not the separately selected `?city=source` renderer; the Radio page's heading is THE ARCHIVE and its shared shell mounts more than one audio element. Tests now check the actual route and active playback, rather than those incorrect assumptions. The native City loading problem was an application failure and was fixed before the final preview checks.

## Evidence

| View | Before | After |
| --- | --- | --- |
| 360 px | [Before](before-360.png) | [After](after-360.png) |
| 390 px | [Before](before-390.png) | [After](after-390.png) |
| 430 px | [Before](before-430.png) | [After](after-430.png) |

[Landscape](after-landscape.png), [desktop](after-desktop.png), [More](more-sheet.png), [station picker](station-sheet.png), [native City with ads off](city-ads-off.png), [Garage](garage.png).

Raw results: [browser matrix](browser-results.json), [HTTP](http-results.json), [navigation](navigation-results.json), [15-second emulated performance sample](performance-results.json). The performance sample describes this Windows browser only, not expected phone performance.

Reproduction scripts: `mobile-test.cjs`, `mobile-regression.cjs`, `http-check.cjs`. Run with Playwright 1.51.1 available to Node and Chrome installed, passing base URL and artifact prefix. Protected Vercel previews additionally need `VERCEL_AUTOMATION_BYPASS_SECRET` in the process environment; no secret is stored in this evidence directory.

Preview authentication now goes through `preview-access.cjs`. It accepts only the reviewed deployment hostnames listed there, HTTPS on the default port, and a plain origin without credentials, paths, queries or fragments. Before adding a new preview hostname, use the authenticated Vercel deployment API or dashboard to verify that the exact hostname belongs to Buena Onda project `prj_dilGb9csckSnNGMn5EdOg0yNvyaj`, then add that exact hostname to the allowlist. A `vercel.app` suffix or a similar project name is insufficient. Canonical production and loopback development origins never receive the preview secret.

Browser checks send the bypass header once in a request that cannot follow redirects, require secure, HttpOnly cookies scoped to the exact host, and verify cookie-only access before opening pages. They do not install browser-wide bypass headers or header overrides that survive redirects. HTTP checks send HEAD requests only to the validated origin and keep redirects manual. Authentication errors are reported without Playwright request logs, which may contain credentials. Mocked security regressions are in `tests/preview-automation.test.ts`; they make no network requests.

## Deployment checks and rollback

Production domains `buenaondalifestyle.com` and `www.buenaondalifestyle.com` are verified on the existing Vercel project; the apex redirects to www. Production Cruise was already enabled. Production environment variables are unchanged by this release.

Cloudflare Pages is an independent duplicate with only `buena-onda-web.pages.dev` assigned. Its failure logs report `NEXT_PUBLIC_SUPABASE_URL is required` during prerendering. No DNS, required-check settings, or Cloudflare configuration were changed. GitHub reports no main branch protection/rulesets requiring this duplicate deployment.

Pre-release rollback deployment: `dpl_8r6x6h21gZBHBUhFkNPFJeK1zeEh`, `buena-onda-8ntlpkyre-luis-manjarres-projects.vercel.app`, commit `089a41d794d17a7dbb708fd1bbf078916f153f9c`. Release requires the Vercel build to finish, followed by verification on the actual production domain. The final deployed SHA and production results are reported with the release.
