# deps_and_env.md — Buena Onda Web

Generated: 2026-03-20

---

## 1. External Package Imports & Versions

| Package | Version in package.json | Pinned? | Used in |
|---|---|---|---|
| `next` | `14.2.15` | ✅ exact | entire app |
| `react` | `^18.3.0` | ⚠️ wildcard | entire app |
| `react-dom` | `^18.3.0` | ⚠️ wildcard | entire app |
| `@supabase/supabase-js` | `^2.45.0` | ⚠️ wildcard | `lib/supabase/` |
| `@supabase/ssr` | `^0.5.2` | ⚠️ wildcard | `lib/supabase/server.ts` |
| `@anthropic-ai/sdk` | `^0.79.0` | ⚠️ wildcard | `scripts/sync-products.mjs` |
| `resend` | `^4.0.0` | ⚠️ wildcard | `app/api/contact/route.ts`, `app/api/reserve/route.ts` |
| `framer-motion` | `^11.5.0` | ⚠️ wildcard | components |
| `react-hook-form` | `^7.53.0` | ⚠️ wildcard | form components |
| `zod` | `^3.23.8` | ⚠️ wildcard | API routes |
| `slugify` | `^1.6.6` | ⚠️ wildcard | admin scripts |
| `sharp` | `^0.33.5` | ⚠️ wildcard | image processing |
| `chokidar` | `^5.0.0` | ⚠️ wildcard | dev scripts |
| `node-notifier` | `^10.0.1` | ⚠️ wildcard | optional, dev scripts |
| `tailwindcss` | `^3.4.12` | ⚠️ wildcard | build |
| `typescript` | `^5.5.4` | ⚠️ wildcard | build |
| `eslint-config-next` | `14.2.15` | ✅ exact | build |

**Recommendation:** Pin `react`, `react-dom`, `@supabase/supabase-js`, and `resend` to exact versions for production stability.

---

## 2. Environment Variables Used in Code

| Variable | File(s) | In .env.example? | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/supabase/client.ts`, `lib/supabase/server.ts`, `scripts/sync-products.mjs` | ✅ | Required |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `lib/supabase/client.ts`, `lib/supabase/server.ts` | ✅ | Required |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase/server.ts`, `scripts/sync-products.mjs` | ✅ | Secret — server-side only |
| `NEXT_PUBLIC_SITE_URL` | `app/layout.tsx` | ✅ | Falls back to `https://buenaonda.com` |
| `NEXT_PUBLIC_API_BASE_URL` | `lib/api/client.ts` | ✅ | Falls back to `http://localhost:4000/v1` |
| `ADMIN_PASSWORD` | `middleware.ts`, `app/api/admin/auth/route.ts` | ✅ | Secret — if unset, /admin is open |
| `RESEND_API_KEY` | `app/api/contact/route.ts`, `app/api/reserve/route.ts` | ✅ | Optional — email skipped if unset |
| `CONTACT_EMAIL` | `app/api/contact/route.ts`, `app/api/reserve/route.ts` | ✅ | ⚠️ Had hardcoded fallback (fixed) |
| `ANTHROPIC_API_KEY` | `scripts/sync-products.mjs` | ❌ MISSING | Added to .env.example |

---

## 3. Issues Found & Fixed

### ❌ Hardcoded personal email (FIXED)
- **File:** `app/api/contact/route.ts:28`
- **Was:** `process.env.CONTACT_EMAIL ?? 'luix42@gmail.com'`
- **Fix:** Removed fallback. `CONTACT_EMAIL` must be set for emails to deliver. If unset, the send is skipped (same behavior as missing `RESEND_API_KEY`).

### ❌ Missing ANTHROPIC_API_KEY in .env.example (FIXED)
- **File:** `scripts/sync-products.mjs` uses `process.env.ANTHROPIC_API_KEY`
- **Fix:** Added to `.env.example` with placeholder.

---

## 4. Clean Checklist

- [x] All env vars documented in .env.example
- [x] No hardcoded secrets or personal data in code
- [x] Anyone who clones can run `cp .env.example .env.local` and fill in values
- [ ] Optional: pin wildcard `^` versions for stricter reproducibility
