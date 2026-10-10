# Pass 6 Studio authentication and commerce gate

Owner: `/root/qa_security`, inherited model identifier unavailable; no Astra participation claimed. Date: 2026-10-10. Followed AGENTS.md; no original Cruise experience files changed. No deployment, production writes, external payment calls or credential values displayed.

## BUILT

- Shared Studio and Avenue authorization now fail closed in every environment when STUDIO_PASSWORD is absent/blank. All guarded callers await verification; previously synchronous API/pages were updated.
- Login issues a random-nonce, HMAC-SHA256 signed cookie with issued/expiry timestamps and a 12-hour lifetime. The password is not the cookie value. Verification rejects malformed, tampered, expired, future-issued and old raw-password cookies. Signing uses a domain-separated existing STUDIO_PASSWORD, requiring no additional secret. Rotating that password invalidates every session.
- Middleware protects /studio, /api/studio and the existing /api/admin namespace. Login/auth-start/logout remain reachable; protected APIs return 401 and pages redirect to login. Original /cruise is outside the matcher. Radio tracks' existing mutation auth also awaits signed verification while its public reads remain unchanged.
- Login and logout require an exact same-origin Origin header. Login uses constant-work string comparison and narrows return paths to /studio or /studio/... . Cookie remains HttpOnly, SameSite=Lax, Secure in production. Logout clears it.
- Experimental preview server page passes only the awaited authorization boolean to its client; no credential is serialized.

## VERIFIED

`node --import tsx --test --test-concurrency=1 tests/studio-auth.test.ts tests/cruise-avenue-unit.test.ts tests/cruise-avenue-routes.test.ts`: **26 passed, 0 failed**, 13.73 seconds.

Meaningful new tests cover token uniqueness, no password in token, raw-cookie rejection, signature tampering, expiry, future issuance, password rotation, missing-password page/API denial, valid page/API session, Original route exclusion, login issuance/cookie flags, invalid login, cross-origin/missing-Origin login/logout refusal, logout expiry and signed-session Avenue moderation. Existing route fixtures still use local PGlite and locally signed dummy Stripe events; no real payment.

Repository-wide auth call-site search found no unawaited guard conditions. An isStudioAuthorized helper directly returns the verifier promise intentionally. Root owns final typecheck/build/browser regression after all source edits settle.

## FAILED / LIMITS

- Full new-auth browser login/deployment not independently verified here. Current production was not changed.
- Stateless logout removes the browser cookie but does not revoke a copied bearer token before expiry. Password rotation revokes all sessions; no per-session server-side revocation store was added.
- Existing shared-password authentication still depends on choosing a strong secret; it is not individual user identity or MFA. No auth infrastructure dependency was added.

## BLOCKERS

The leaked Supabase key's rotation remains unconfirmed. This code cannot revoke it. Production writes/deployment remain blocked pending Luis's security confirmation and explicit deployment authorization.

Full Stripe TEST plot #7 flow remains **BLOCKED — isolated test environment not established**. Inventory inspected names only: .env.local contains VERCEL_OIDC_TOKEN and R2 configuration names, but no STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or STUDIO_PASSWORD names. .env.example lists placeholders; it does not establish working configuration. supabase/config.toml is absent. Inherited process credentials were not used or inspected as values.

Read docs/checkout-remediation/STATE.md and RELEASE-GATE.md: these describe production checkout remediation, processor account access and preview missing payment secrets. They do not prove an isolated non-production Supabase project plus Stripe TEST webhook destination. Recent successful storefront checkout is not authorization to write production plots. No additional question was required; do not improvise the missing environment.

## NEXT ACTION

Complete root's final typecheck/build and local browser regression. Before any authorized deployment, confirm STUDIO_PASSWORD is configured and communicate that **all existing sessions must log in again**; old password cookies intentionally stop working. New sessions expire after 12 hours, previously the cookie lasted 30 days. Confirm key rotation separately. Establish explicit isolated Supabase and Stripe TEST credentials before real plot #7 Checkout-to-webhook testing.

| Owner | Files | Status | Evidence | Blockers |
|---|---|---|---|---|
| Agent E /root/qa_security | middleware; shared/Avenue auth; login/logout; eight necessary auth callers; three auth/Avenue test files; this report | Implemented, targeted tests passed | 26/26 local tests; awaited-call audit | Final integration, key rotation, isolated payment environment, deployment approval |

## Runtime-origin correction

The lead's first isolated production-server smoke found a real integration failure: a browser-equivalent login using Origin http://127.0.0.1:3041 received 403 because Next normalized request.url to localhost:3041. Four other fail-closed smoke checks passed, but login did not. The initial unit fixture had not reproduced that authority mismatch.

Corrected the shared origin check to use the actual Host header plus request.url's protocol, falling back to URL host when Host is absent. It explicitly ignores x-forwarded-host and validates the parsed authority. Added regression coverage for localhost URL with 127.0.0.1 Host/Origin, foreign Origin, wrong scheme and spoofed forwarded host. Targeted Studio tests: **5/5 passed**, 0.72 seconds. These ran before the subsequent GPU execution hold arrived; no further execution under that hold.

Status: correction **implemented and unit verified**, fresh build and real-server login/logout smoke **pending**. Do not present the initial 403 as a successful login or infer runtime success from this unit result.

## Final integration status

Lead-reported final results after the Host correction:

- Isolated Next production build: **PASS**, exit 0.
- Full sequential repository test suite: **62/62 PASS**, 0 failures, **20.49 seconds**.
- Runtime auth smoke: **5/5 PASS**, [auth/smoke.json](auth/smoke.json). Initial failed run is retained in [auth/initial-smoke.json](auth/initial-smoke.json).

These supersede the pending final-build/runtime-empty-configuration checks above. Runtime smoke verifies empty-configuration fail-closed behavior after the origin fix. It does **not** verify a real browser signing into configured Studio and navigating authenticated pages. Signed login issuance and authenticated route behavior passed local tests calling the real route handlers; browser signed-login remains unverified. Agent E recorded these final results from the lead and did not execute additional commands, tests or browsers during sustained GPU measurement.

Key revocation, isolated real Stripe TEST end-to-end, and deployment authorization remain separate blockers. No production deployment or production write occurred as part of this work.
