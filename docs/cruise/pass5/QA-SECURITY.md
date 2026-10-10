# Pass 5 independent QA and security review

Date: 2026-10-10. Owner: `/root/qa_security` (Agent E). Runtime model identifier: unavailable in this agent context; no specific model claimed.

## BUILT / inspected

Read AGENTS.md and bounded Avenue API, fulfillment, migration, rate-limit, cast and Studio authentication code. No application files changed. At initial inspection the five modified tracked files were ConvertibleCar.tsx, DriveController.tsx, MiamiStreet.tsx, StreetEnvironment.tsx and master.css under components/cruise/master. Original route files were not modified in the tracked diff. Unrelated untracked work was preserved.

## VERIFIED (source review unless noted)

- Avenue phase defaults to hidden. Claim creation requires CRUISE_PLOTS_ENABLED=1 and a Stripe secret; prices are server authoritative. Public GET omits email and Stripe session IDs and masks pending owner content.
- Signed webhook events route Cruise plot sessions separately from inventory/order fulfillment. Amount, currency, asynchronous payment state, duplicate sessions and stale prices are handled. Webhook checks event mode against configured Stripe key mode.
- Migration enables RLS, revokes public/anon/authenticated RPC access, grants RPC execution to service_role, uses fixed search_path and an advisory transaction lock for repeated session delivery. These are source findings; current SQL execution was blocked by host allocation failures.
- Avenue moderation fails closed without STUDIO_PASSWORD and requires same-origin mutations. Drive-by endpoint hashes identifiers and has database deduplication plus explicitly best-effort per-instance limiting.
- Cast code has Presentation API sender/receiver messaging and an Apple screen-mirroring path. This is implementation evidence, not casting verification.

## FAILED / findings

1. Luis confirmed the leaked legacy key has NOT been rotated and affected deployments have NOT all been updated. Production deployment, publishing and production writes remain blocked.
2. Shared middleware.ts and lib/studio-auth.ts still fail open without STUDIO_PASSWORD. Middleware covers /studio only. Current API consumers actually live under /api/admin/* and /api/radio/tracks; there is no app/api/studio directory. A future auth fix must protect the actual routes as well as any /api/studio namespace.
3. Studio login stores the shared password itself in the httpOnly cookie. Signed expiring sessions remain unimplemented. No shared-auth modifications made in this pass.
4. `?avenue=preview` and `?avenue=1` are public query switches, not authorization. The requirement that previews are for authorized demos is not enforced. Claim disabling is separate and does not protect preview access.
5. Drive-by analytics write in hidden mode. Browser investigations must intercept mutations, including visit beacons, on production and on local servers whose backing configuration is not isolated. Lead notified before browser work.
6. Rate limits are in-memory per isolate; spoofable IP headers off trusted infrastructure and rotating client identifiers remain limitations. These counters are not verified audience metrics.

## Validation attempts

| Command | Result | Evidence / limit |
|---|---|---|
| npm test | FAILED, exit 1 | 27 passed; 3 file workers failed with V8 Fatal process out of memory: Zone. Failing files: checkout-payment, cruise-avenue-migration, cruise-avenue-routes. No successful full-suite claim. |
| npm run typecheck | FAILED, exit 1 | V8 allocation failure at approximately 400 MB live heap; no TypeScript diagnostics produced before crash. |
| npm test -- --test-concurrency=1 | FAILED, exit 1 | Retry also encountered WebAssembly.Memory allocation failure in PGlite and V8 memory failure. Concurrency flag appended by npm after test file pattern; do not claim this demonstrates successful single-worker execution. |

A separate PowerShell process also failed to initialize CLR (HRESULT 80004005), supporting a host resource problem rather than evidence that these code paths passed or failed assertions. Do not substitute the historical 60-pass report for current verification. No unrelated process was terminated.

## BLOCKERS

- Full Stripe TEST Checkout for plot 7: BLOCKED. .env.local exists, but no credential values were read, and no isolated test environment was verified. supabase/config.toml is absent. Existing route fixtures use PGlite, locally signed fake TEST events and a local PostgREST stand-in; they do not exercise actual Stripe Checkout, Stripe delivery or real Supabase. No services started, DB connected, checkout created or payment made.
- Desktop Chrome to Chromecast: **BLOCKED — PHYSICAL DEVICE REQUIRED**.
- Android Chrome to Chromecast: **BLOCKED — PHYSICAL DEVICE REQUIRED**.
- iPhone AirPlay mirroring with ?tv=1: **BLOCKED — PHYSICAL DEVICE REQUIRED**.
- Smart-TV browser visuals, controls and receiver audio: **BLOCKED — PHYSICAL DEVICE REQUIRED**.
- Test/typecheck completion: host memory allocation failures. Retry only after resource pressure is resolved and serialize heavy work.

## NEXT ACTION

Retire leaked key and verify replacements independently. Restore reliable local test execution; run Node test concurrency option before the file glob. Gate previews at a server-authorized boundary if authorized-only demos are required. Plan the shared Studio auth change separately with coverage of actual API consumers. Use only verified isolated Supabase plus Stripe TEST configuration for plot 7 checkout, moderation, ticker and rounded 1.5x buyout validation. No production writes or deployment authorized.

| Owner | Files | Status | Evidence | Blockers |
|---|---|---|---|---|
| Agent E /root/qa_security | docs/cruise/pass5/QA-SECURITY.md only | Review complete; recovered validation passed | Source review, initial allocation failures, successful sequential retry below | Key rotation, isolated TEST environment, physical cast hardware |

## Recovered validation after memory was freed

The user freed host memory and the lead stopped browser work. Agent E reran these sequentially:

- `npm run typecheck`: **PASS**, exit 0, no diagnostics.
- `node --import tsx --test --test-concurrency=1 "tests/**/*.test.ts"`: **PASS**, 60 tests, 60 passed, 0 failed, 0 skipped, 20.38 seconds.

This supersedes the initial test/typecheck blocker above, while preserving the failed-attempt record. PGlite migration and local route fixtures now execute successfully, including plot 7 pending claim, duplicate handling, moderation, ticker masking and rounded 1.5x pricing. They still do not constitute a real Stripe TEST Checkout-to-webhook integration. Expected error logs came from deliberately failing fixture scenarios, not live payment operations.

The lead announced additional targeted UI changes after this run, so final typechecking should cover the final edited tree. Production/security, isolated external TEST environment and physical-device blockers remain.

## Proposed preview authorization acceptance checks (planned)

Keep the server boundary only in app/cruise/miami-test/page.tsx. Read the Studio cookie on the server, call existing fail-closed hasCruiseStudioAccess, and serialize only a boolean into a client dynamic wrapper. The client wrapper retains ssr:false for the Three.js scene. No secret or cookie value may be passed to the client. Cookie-based rendering must remain request-specific, never a shared cached authorization result.

Update the existing avenuePhase unit test with this explicit matrix; authorization below is the server-derived boolean, not a query parameter:

| Public phase env | Query | Authorized | Expected |
|---|---|---:|---|
| absent / hidden / invalid | absent | false or true | hidden |
| absent / hidden | avenue=preview | false | hidden |
| absent / hidden | avenue=1 | false | hidden |
| absent / hidden | avenue=preview | true | preview |
| absent / hidden | avenue=1 | true | preview |
| absent / hidden | avenue=open | true or false | hidden |
| preview | absent or preview alias | false | hidden |
| preview | absent or preview alias | true | preview |
| open | absent | false or true | open |

Decide and test open-env-plus-preview-query precedence explicitly. Recommendation: open remains open for public visitors; an authorized preview alias can remain a demo if desired. An unauthorized query must never grant any additional access. Existing missing/wrong/whitespace Studio cookie tests already cover fail-closed helper behavior.

Panel initialization must depend on authorized phase, not just the URL. Browser acceptance: unauthenticated ?avenue=preview and ?avenue=1 show no drawer/ticker/claim controls and the street continues driving; existing Start and radio controls still work. Authorized preview browser verification requires a deliberately local fixture password/cookie, not production credentials. Public plot GET remains public by design and claim/moderation APIs must retain their separate gates. This scoped fix does not resolve shared Studio password-cookie or fail-open behavior elsewhere.

## Production build safety recommendation (not executed by reviewer)

AGENTS.md requires evidence, route isolation and accurate verification but does not itself mandate next build. The user's performance/build requirements support running one. An ordinary Next build is not guaranteed offline: Next loads local environment files and can execute static route generation. In the sampled source, events generateStaticParams reads Supabase through createPublicServiceClient; homepage and culture static rendering also query Supabase. No production write was found in those sampled paths, but this bounded review cannot certify every application import free of side effects.

Use a sanitized isolated child environment with explicit dummy local Supabase URL/keys, claims disabled and no production credentials; keep actual .env.local untouched. Where available, deny external network for that process as an additional guarantee. Override every relevant environment input so Next cannot fall back to real local-file values. Serialize the build after browser/performance work because earlier parallel workers exhausted host memory. Record resulting artifact as an isolated local production build, never a deployed production verification.

## Implemented preview gate: independent source review

Reviewed the lead's actual diff: server page reads cookies and invokes hasCruiseStudioAccess, serializing only previewAuthorized boolean to StreetClient. StreetClient retains the dynamic ssr:false scene boundary. avenuePhase now denies unauthorized query aliases and environment preview; explicit env open takes precedence. Initial panel state depends on non-hidden authorized phase. No Original route or shared Studio authentication edits appear in the changed-path list.

Source review verdict: **PASS** for the scoped UI preview gate. The earlier missing-preview-authorization finding is now **implemented**, pending final tests and browser verification. Critical helper test assertions were updated; no tests ran during the performance freeze. Existing Studio auth limitations and key-rotation blocker remain unchanged.

Prepared scripts/cruise-pass5-isolated-build.mjs and checked its syntax only. It overrides .env key names without copying/logging original values, inherits only OS environment essentials, disables claims/telemetry, sets dummy service configuration and preloads a guard against outgoing Node TCP/TLS/fetch. Local IPC is allowed. It supports build and localhost start on 3041. This is an application-level network guard, not an OS firewall; build/start had not been executed by this reviewer at the time of this entry.

## Final scoped source review

Reviewed current application diffs including the five inherited Pass 5 files, preview boundary, phase helper, pulse smoothing and helper tests. No new release-blocking logic issue was found in this bounded review. Start gate, modal/visibility/cast resume conditions and loop reset use a common current-state gate; manual steering is removed; hidden empty plots do not stop the ride; unsolicited public shop cards are suppressed. Reduced-motion treatment smooths and reduces analysis levels and disables beat impulses without changing audio playback. Desktop retains real headlights while Mobile uses the decal.

Tracked changed paths remain experimental-route/master components and helper tests; no Original page/shared Studio authentication changes. No credential value was found in the reviewed scoped source diffs; credential files were never displayed. git diff --check passed (line-ending conversion warnings only). This is source review, not a substitute for final execution results. The lead reported 31 functional checks passed; Agent E did not rerun browser tests.

Minor remaining interaction inconsistency: the dock can display 'Signal lost · tap to retry', but tapping the station tile opens the station panel rather than directly retrying playback. This is not assessed as a release blocker. Portrait reframing was separately verified from pixels in VISUAL-REVIEW.md.

The first isolated production build exposed an existing Studio next/font Google download requirement. On the lead's instruction, the runner was adjusted to permit **build-only HTTPS GET** requests to fonts.googleapis.com and fonts.gstatic.com, with scoped hostname/port checks at HTTP/fetch and TCP/TLS layers. Other network traffic remains blocked; isolated start blocks all outgoing traffic. Syntax check passed after this adjustment; reviewer did not launch the build. No application config or Studio source was changed to accommodate fonts.

## Final frozen-tree execution: PASS

After the lead reported the isolated production build completed with exit 0, Agent E ran final checks sequentially with no browser workload:

- `npm run typecheck`: **PASS**, exit 0.
- `node --import tsx --test --test-concurrency=1 "tests/**/*.test.ts"`: **PASS**, exit 0; 60 tests passed, 0 failed, 0 skipped, **24.95 seconds**.

Sanitized UTF-8 command output is in [final-checks.log](final-checks.log). This final execution includes the authorization helper updates and final source tree, superseding the earlier pre-refinement run. The isolated Next build was executed by the lead, not this reviewer. Neither unit fixtures nor the build verify physical devices, real Stripe TEST delivery, production key revocation or shared Studio authentication remediation.
