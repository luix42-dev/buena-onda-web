# Pass 5 delivery ledger

Date: 2026-10-10. No deployment, push, purchases, new dependencies or production writes authorized or performed in this pass. Luis confirmed the leaked legacy credential rollover is **not completed**. This does not prevent permitted local development.

Agent identities are the actual task names below. All are Codex agents using the inherited session model; an exact runtime model identifier was not exposed, so no specific variant is claimed. Roles were combined/reused to respect the four-agent concurrency limit.

| Owner | Files / responsibility | Status | Evidence | Blockers |
|---|---|---|---|---|
| `/root` lead | Integration, route wrapper, preview helper/tests, CSS, browser scripts, final docs | Implemented; interaction and visual regression passed | 31/31 real Next browser checks; before/after and matched DAY PNG/WebM | Final optimized FPS result below; external security/device gates |
| `/root/ux_music` C + D | MiamiStreet, DriveController, pulse; UX/music report | Implemented; bounded evidence independently reviewed | Live Jolt/banner response, both-orientation preset clicks, recovery and dock checks | Audio audibility, every decorative animation and physical touch not verified |
| `/root/performance` B | ConvertibleCar, light-profile script, performance report | Implemented and measured | Controlled A/B/A and sustained before/after night samples | Production desktop cockpit 28.97 FPS; physical Android unavailable |
| `/root/qa_security` E, then A | QA/security, independent pixel reviews, isolated-build runner | Source/pixels reviewed; final checks passed | Typecheck exit 0; 60/60 sequential tests; complete portrait radio confirmed | Security rollover, shared auth, real Stripe flow and physical casting |

## Intake

HEAD was `fb9e967`, later than the handoff's cited `4e6e8fd`. Exactly five tracked files were modified: ConvertibleCar.tsx, DriveController.tsx, MiamiStreet.tsx, StreetEnvironment.tsx, master.css. They matched the uncommitted Pass 5 handoff. Existing unrelated untracked experiments were preserved. Public captures are of the current served routes, not a claim that the server still runs `4e6e8fd`.

The inherited Pass 5 changes came from Claude's handoff. Its exact model and external participants were not independently established by this pass. Existing REVIEW.md and Vite images are historical evidence, not Next.js validation.

## Milestone 1 — integration

Initial parallel test workers and typecheck crashed from machine memory allocation failures. After Luis freed memory, typecheck passed and `node --import tsx --test --test-concurrency=1 "tests/**/*.test.ts"` passed 60/60. No unrelated application was terminated. The existing Next dev server at 127.0.0.1:3040 served local captures.

## Milestone 2 — comparison and priorities

Public Original, public Miami Test and integrated local Pass 5 were captured at 390×844, 844×390 and 1440×900. Camera comparisons use chase and cockpit. Default Original is day/Island Trail with adaptive quality; default Miami is sunset/convertible/Mobile. Sunset and manual quality selection are N/A on Original. Thus default screenshots establish first impressions, not identical lighting or vehicle tests. Separate matched DAY captures and sustained night measurements were completed.

Ranked by visitor impact, confidence from evidence, and implementation effort (judgments, not scientific scores):

1. Restore automatic travel after cards/tab return/restart; remove remaining manual controls. High impact, direct source evidence, small change.
2. Keep unsolicited store cards off the hidden public experience and ignore non-actionable hidden plot clicks. High impact, screenshot/source evidence, small change. Store signs and Garage remain deliberate entry points.
3. Compact the portrait dock while preserving usable controls and landscape head unit. High impact, screenshot evidence, small CSS change.
4. Measure night headlights, retain Desktop lighting and use cheaper Mobile illumination if the evidence supports it. High impact, measurement required.
5. Slow reduced-motion visual responses and stop automatic camera cuts under that preference. Medium impact, direct code evidence, bounded change.
6. Make preview require server-side Studio authorization. Requirement compliance, independent security review, isolated experimental-route change.

A truly continuous repeating street and major vehicle/environment reconstruction are not small repairs. Preserve the existing fade/reset, verify its behavior and report the limitation honestly.

## Verification boundary

Before/local captures already contain the resume integration fixes; they precede dock compaction, preview gating and any measured lighting fallback. Public before/live captures represent the served pre-Pass-5 interface. Reports must not attribute every difference to a single small refinement.

All automated visits block non-GET/HEAD requests (including drive-by beacons) and analytics. These visits are not production audience evidence. Browser capture confirms visual/playback state, not audible output or physical casting.

## Final verification milestone

| Owner | Files | Status | Evidence | Blockers |
|---|---|---|---|---|
| Lead + performance | Production night JSON, build log, report | Verified locally | Optimized build passed; night cockpit 28.97 / 59.75 / 59.60 FPS at desktop / portrait / landscape; 60 seconds each | Desktop misses 30; no physical phone |
| QA + lead | final-checks.log, functional/results.json | Passed | Typecheck, 60/60 tests, 31/31 browser checks | Scope limits in report |
| Lead | Documentation and explicit project paths | Local delivery only | Original route unchanged; no publish or deployment | Leaked key, shared auth, isolated Stripe TEST and casting hardware |

An optional resolution experiment was prepared but never launched: temporary-directory permission failure followed by an aborted browser approval request. No DPR policy was changed and no benchmark is claimed. Its unvalidated scratch script is excluded from the delivery commit.
