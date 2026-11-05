# Three-build founder comparison

October 10, 2026. Luis confirmed retirement/replacement of the exposed key and explicitly authorized a separate preview. This records founder confirmation, not an independent credential audit.

## BUILT

Vercel preview `dpl_EeyK4jpiuPZsBFgy9yQqu3D7dQwi`, source `911b734` (Nightdrive implementation `7050af6`). Uploaded a clean tracked-source export, excluding local settings, credentials, scratch worktrees, recordings and unrelated untracked work. Included required `categories.json`. Existing dependency lockfile used; no new dependencies. Export configuration removes production cron jobs.

- [Original](https://buena-onda-fgo8ea1p2-luis-manjarres-projects.vercel.app/cruise)
- [Miami Test](https://buena-onda-fgo8ea1p2-luis-manjarres-projects.vercel.app/cruise/miami-test)
- [Nightdrive](https://buena-onda-fgo8ea1p2-luis-manjarres-projects.vercel.app/cruise/miami-test/nightdrive)

Vercel authentication remains enabled. Sign in with the project's authorized account. No production-domain promotion and no remote branch push.

Deployment-scoped `CRUISE_COMPARISON_PREVIEW=1` rejects non-GET/HEAD requests, all API reads except `/api/radio/tracks`, and Studio access. Supabase uses a dummy endpoint with no service-role key; checkout and Studio are disabled. The Avenue remains hidden. Miami retains its local structural sign seed when its plot read is denied; preview visits cannot become sponsorship impressions. Owned radio uses existing read-only listing/playback, without Supabase metadata overrides.

## VERIFIED

- Vercel build completed and deployment reports Ready.
- Six targeted preview isolation and Studio-auth tests passed.
- All three routes returned HTTP200, accepted Start and rendered a Canvas without page errors in desktop Edge154, 1440x900. This is a hosted smoke check, not a new performance benchmark or physical-device test.
- Miami reported owned radio playing, analysis source `groove` (fallback, not live FFT). Nightdrive reported Jolt playing, source `live`, ambiance running.
- Hosted claim POST and plot GET returned403. Earlier deployment also verified reconciliation GET403; the final guard retains that same blanket API denial.
- Actual original, Miami and Nightdrive screenshots inspected. Default conditions differ (original day, Miami sunset, Nightdrive night); these screenshots prove deployment rendering, not a matched visual scorecard.
- Original route and LaunchExperience remain identical to origin/main.

[Final browser data](preview-final/results.json), [Original image](preview-final/original.png), [Miami image](preview-final/miami.png), [Nightdrive image](preview-final/nightdrive.png).

## FAILED

First export omitted a required tracked JSON file, causing a build failure; corrected. Second preview's guard returned a successful empty plot list, removing structural records and causing Miami's scene error boundary. Corrected to deny the read so the existing client fallback survives. Final three-route recheck passed. Failed evidence remains in `preview/`.

## BLOCKERS

Existing visual, memory, casting and physical-device limitations in RESULTS.md remain. Preview npm installation reported35 dependency audit findings (including2 critical); no broad dependency upgrade was performed. This preview is not a production-readiness declaration. Human audible output and long hosted runs were not verified.

## NEXT ACTION

Founder compares the three links, preferably one active tab at a time to avoid shared-GPU contention. Main-scene migration, broader art work and production promotion still require approval.

| Owner | Files | Status | Evidence | Blockers |
|---|---|---|---|---|
| `/root` | middleware.ts, comparison test, preview documentation | Published isolated preview; verified all three starts | Six tests, Vercel Ready, browser JSON/screenshots, HTTP403 checks | Founder review; existing quality limits |

No additional agents used for this narrow publication task. Exact runtime model variant unavailable.
