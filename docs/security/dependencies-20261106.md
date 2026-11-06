# Dependency security review — 2026-11-06

The final online npm audit reports **zero production dependency findings**. The complete development tree reports **two high findings**, both representing the same remaining Zod advisory in the local IMG.LY background-removal tool. These are retained and documented below; the full audit has not been suppressed or described as clean.

## Verified versions

| Dependency | Final version / treatment |
| --- | --- |
| Next.js, eslint-config-next, @next/third-parties | 15.5.29, aligned |
| React / React DOM and their types | 19.3.1 / 19.3.1; types 19.3.0 |
| React Three Fiber / Drei | 9.8.2 / 10.7.9, compatible with the App Router's React 19 runtime |
| @anthropic-ai/sdk | 0.91.1 |
| Resend | 6.37.0 |
| @react-email/render | 2.2.0; its declared peers support React 18 and 19 |
| Web application Zod | 4.6.6 |
| sharp, including the local worker's copy | 0.35.5 |
| PostCSS, including the copy resolved by Next.js | 8.5.32 |
| node-notifier's UUID dependency | Scoped override to 11.1.1, preserving its CommonJS API |
| typescript-estree's minimatch dependency | Scoped override to 11.0.5 |
| brace-expansion 1.x | Override to patched 1.1.21; other major versions preserved |
| IMG.LY's lodash / Zod | Scoped overrides to 4.18.1 / 3.25.76 |

The declared Node requirement is `>=20.19.0`, covering the updated renderer and image tooling. This validation ran on Node 24.14.0. Configure hosting/build environments to satisfy the declared requirement.

Ordinary `npm audit fix` was run first. The post-framework baseline contained 37 package findings, including one critical finding. Compatible fixes, reviewed direct upgrades, and scoped overrides reduced this to the two development findings below. No `npm audit fix --force` was used. A global PostCSS override and `npm update postcss` were necessary because the initial scoped override left Next's existing nested PostCSS 8.4.31 lock entry in place. The final smoke test resolves PostCSS from Next's own module location and verifies 8.5.32.

## Remaining development finding

The registry's latest `@imgly/background-removal-node` remains 1.4.5. It requires Zod 3 APIs, specifically `z.function().args().returns()`. Forcing Zod 4 into that package breaks module initialization. Its Zod dependency was updated from the older pinned 3.21 branch to compatible 3.25.76, which removes the older Zod denial-of-service advisory but still falls within [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5).

That advisory concerns allocation of validation errors while processing oversized collections. The inspected IMG.LY schema validates configuration strings, booleans, an optional callback and a small output-options object; it does not declare array, map or set schemas. The only application call is in `worker/intake-worker.ts`, which calls `removeBackground(Buffer.from(sourceBuffer))` with default configuration. It does not accept arbitrary user-supplied configuration. IMG.LY is a development dependency used by the separate local worker, not imported by website routes. The public website uses patched Zod 4.6.6 and bounded request bodies.

This is an assessment of the current call path, not a claim that the dependency is patched. Full npm audit still reports the nested Zod package and its IMG.LY parent as two high package findings for the same advisory. Revisit this exception when IMG.LY releases a compatible update or before exposing worker configuration to untrusted input. Do not force a major Zod override or silently remove the worker to obtain a clean audit count.

## Legacy Cloudflare preview

Production deployment remains Next.js on Vercel. The obsolete `@cloudflare/next-on-pages` development adapter and the `pages:build` npm script were removed; their dependency tree contained unpatched findings and is not required by the Vercel build. `npm run build` and `npm run start` remain the supported application build/start commands.

`npm run pages:build` is no longer available. The retained `wrangler.toml` and historical preview notes do not constitute a supported Cloudflare deployment workflow after this change. Restoring a Cloudflare preview requires a separately reviewed adapter/runtime migration; reinstalling the old adapter would reintroduce its dependency risks. Existing Cloudflare R2/KV integrations remain in place.

## Recorded validation

- Final `npm audit --omit=dev --offline=false`: **0 findings**.
- Final `npm audit --offline=false`: **2 high findings**, only IMG.LY and its nested Zod dependency described above.
- `node scripts/security-dependency-check.mjs`: passed again after the React 19 update. It verifies 3×2 image encoding/decoding with sharp, IMG.LY's compatible configuration-validation path, notifier UUID generation/import, a mocked Anthropic messages request, Next-resolved PostCSS, and React 19 email rendering. It prohibits external network calls and does not download inference models or send notifications.
- The focused API/form/payment/Avenue suites passed **37/37** after the Zod, SDK and image dependency upgrades. The final renderer/PostCSS adjustments were additionally checked by the dependency smoke. Full final application suite, typecheck and production-build outcomes are tracked in [the main review](./review-20261106.md).

Primary compatibility references: [Zod migration guide](https://zod.dev/v4/changelog), [sharp 0.35.5 release notes](https://sharp.pixelplumbing.com/changelog/v0.35.5/), and [UUID release notes](https://github.com/uuidjs/uuid/releases). Package versions, peer requirements and final audit results were checked against the npm registry during this review.

The hosted browser check caught a renderer mismatch that typechecking alone did not detect: Next 15's App Router uses React 19, while Fiber 8 expected React 18. React, Fiber and Drei were aligned, and the required ref/JSX type annotations were updated. The repaired hosted preview renders Cruise's 3D canvas and loads the homepage and Studio login without page errors or failed scripts. See the [Next 15 React compatibility notes](https://nextjs.org/blog/next-15) and [Fiber 9 migration guide](https://r3f.docs.pmnd.rs/tutorials/v9-migration-guide).
