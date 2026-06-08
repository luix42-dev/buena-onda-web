# Buena Onda Frontend + Studio Audit

Date: 2026-06-08
Branch: `feat/frontend-launch`
Build baseline: `wsl bash -lc "cd /mnt/d/10-VENTURES/12-buena-onda/BuenaOnda_Audit/buena-onda-web && npm run build"` passes before fixes.

## Phase 0 Summary

This repo currently builds, but it is not launch-ready. The major issues are not compile errors; they are behavioral:

- Broken/dead public links exist.
- At least one live form is fake.
- Culture publishes slugs that imply a public detail URL, but no public culture detail route exists.
- Studio create/edit coverage is incomplete across multiple content types.
- The events editor appears wired for `playlist_url`, but the persistence issue needs direct schema verification against Supabase before calling it fully fixed.

## Public Route Inventory

Resolved routes present in app:

- `/`
- `/about`
- `/about/[era]`
- `/case-study`
- `/contact`
- `/culture`
- `/events`
- `/events/[slug]`
- `/items/[slug]`
- `/objects`
- `/radio`
- `/search`
- `/themes`
- `/themes/[slug]`
- `/checkout/[itemId]`
- `/order/success`

Known broken/dead route links found in code:

- Footer links to `/privacy` and `/terms`, but no matching routes exist.
  - Ref: `components/layout/Footer.tsx:134`
  - Ref: `components/layout/Footer.tsx:141`
- Objects page links live drops to `/objects/${drop.slug}`, but there is no `/objects/[slug]` page.
  - Ref: `app/(site)/objects/page.tsx:121`
- Culture notifications and integrations assume `/culture/[slug]`, but that public route does not exist yet.
  - Ref: `lib/culture-integrations.ts:146`

## Placeholder / Fake UI Findings

Launch blockers:

- `NotifyForm` is fake. It does not submit anywhere and only waits, then shows success.
  - Ref: `components/ui/NotifyForm.tsx:17`
- Culture page is a list page only. It shows published essays, but there is no reader route for the slugs Studio publishes.
  - Refs: `app/(site)/culture/page.tsx`, `lib/culture-integrations.ts:146`
- Events empty state is honest and acceptable.
  - Ref: `app/(site)/events/page.tsx:82`
- Radio empty state is honest and acceptable.
  - Ref: `app/(site)/radio/page.tsx:98`
- Culture empty state is honest and acceptable only when there are no published posts.
  - Ref: `app/(site)/culture/page.tsx:117`

## Forms / Submission Wiring

### Contact

Current state:

- UI posts to `/api/contact`.
  - Ref: `components/ui/ContactForm.tsx`
- API validates input with Zod and optionally sends via Resend.
  - Ref: `app/api/contact/route.ts`

Problem:

- User input is interpolated directly into HTML email content without escaping.
  - Ref: `app/api/contact/route.ts`

Required fix:

- Escape all user-controlled strings before inserting into HTML email markup.

### Newsletter / Transmission signup

Current state:

- Homepage and footer newsletter forms submit to `/api/newsletter`.
  - Refs: `components/ui/NewsletterForm.tsx`, `components/layout/FooterNewsletter.tsx`
- `/api/newsletter` writes to `newsletter_subscribers`.
  - Ref: `app/api/newsletter/route.ts`

Assessment:

- This path is real, not fake.
- Needs verification in final pass after end-to-end fixes.

### Reserve / sold notify

Current state:

- Reserve form posts to `/api/reserve`.
  - Refs: `components/ui/ReserveForm.tsx`, `app/api/reserve/route.ts`
- Sold notify form posts to `/api/notify`.
  - Refs: `components/ui/SoldNotifyForm.tsx`, `app/api/notify/route.ts`

Problem:

- Reserve email HTML also interpolates user input without escaping.
  - Ref: `app/api/reserve/route.ts`

## Layout / UX Findings

Code-level issues worth fixing:

- Footer bottom band uses two dead legal links; this is both a route issue and a launch trust issue.
- Home hero and newsletter sections use large fixed paddings and border-left spacing that should be checked at mobile/100% zoom.
  - Refs: `app/(site)/page.tsx:157`, `app/(site)/page.tsx:534`
- Home radio feature card is hidden on mobile, which is fine, but the surrounding sections use aggressive text sizing and spacing that should be tightened where needed.
  - Ref: `app/(site)/page.tsx:337`
- Navigation contains mojibake text artifacts that should be cleaned while touching launch polish.
  - Ref: `components/layout/Navigation.tsx`
- Several public pages contain mojibake glyphs in visible copy.

## Studio Audit

### Catalog / Items

What works now:

- List view exists.
- Drawer supports create, edit, image upload, reorder, cover selection, availability, status, and save/delete.
  - Refs: `app/studio/(shell)/catalog/CatalogClient.tsx`, `app/studio/(shell)/catalog/ItemDrawer.tsx`

Gap:

- Public item page depends on `why_chosen` and structured `details`, but Studio item drawer does not expose those fields.
  - Refs: `app/(site)/items/[slug]/page.tsx:39`
  - Ref: `app/(site)/items/[slug]/page.tsx:64`

Assessment:

- Catalog create/edit is only partially complete for the live product model.

### Culture

What works now:

- Create and edit UI exists in Studio.
  - Ref: `app/studio/(shell)/culture/CultureClient.tsx`
- Admin API create/update exists.
  - Refs: `app/api/admin/posts/route.ts`, `app/api/admin/posts/[id]/route.ts`

Known bug confirmed:

- Editing uses `slug: slugify(title.trim())`, so title edits regenerate the slug and break existing URLs.
  - Ref: `app/studio/(shell)/culture/CultureClient.tsx:112`

Additional gap:

- Public culture detail route is missing, even though the system treats post slugs as public URLs.

### Transmission

What works now:

- List page loads issues and subscribers.
- Create issue flow exists.
  - Refs: `app/studio/(shell)/transmission/page.tsx`, `app/studio/(shell)/transmission/TransmissionClient.tsx`

Gap:

- No edit path in the UI.
- No update/delete admin API for transmission issues.

Assessment:

- Not fully working for create + edit + save end to end.

### Radio

What works now:

- Upload/create flow exists.
- Publish/unpublish toggle exists.
  - Refs: `app/studio/(shell)/radio/RadioClient.tsx`, `app/api/admin/episodes/[id]/route.ts`

Gap:

- No edit UI for existing episode metadata.
- API supports full `PUT`, but Studio does not expose it.

Assessment:

- Not fully working for create + edit + save end to end.

### Timeline

What works now:

- Existing rows can be opened and edited.
  - Refs: `app/studio/(shell)/timeline/page.tsx`, `app/studio/(shell)/timeline/TimelineClient.tsx`

Gaps / bugs:

- No obvious create button in the UI.
- Fallback-to-database create path is broken: POST returns a real row id, but client state only maps by the temporary fallback id and never inserts the new saved row.
  - Ref: `app/studio/(shell)/timeline/TimelineClient.tsx:45`
  - Ref: `app/studio/(shell)/timeline/TimelineClient.tsx:68`

Assessment:

- Edit exists; create is incomplete.

### Events

What works now:

- Create/edit UI exists.
- API accepts `event_date` and `playlist_url`.
  - Refs: `app/studio/(shell)/events/[id]/EventEditor.tsx:179`
  - Ref: `app/studio/(shell)/events/[id]/EventEditor.tsx:184`
  - Ref: `app/api/admin/events/route.ts:79`
  - Ref: `app/api/admin/events/route.ts:84`
  - Ref: `app/api/admin/events/[id]/route.ts:74`
  - Ref: `app/api/admin/events/[id]/route.ts:79`

Diagnosis status:

- Code path for `playlist_url` looks correct in UI and API.
- Migration file includes `playlist_url`.
  - Ref: `supabase/migrations/events_migration.sql:15`
- Because the reported failure contradicts the code path, the most likely remaining cause is a production schema drift or column mismatch in Supabase, not a frontend omission. I will keep fixing everything else and, if schema intervention is required, I will output SQL for manual execution instead of running migrations.

### Player

Known bug confirmed:

- Leftover debug `console.log` is still present.
  - Ref: `app/studio/(shell)/player/PlayerClient.tsx:432`

Constraint reminder:

- Player and Radio must remain separate features.

## Prioritized Punch List

### P0

- Add real public culture detail route at `/culture/[slug]`.
- Preserve existing culture slug on edit; only generate slug on first create.
- Replace fake `NotifyForm` behavior with a real launch-safe path or an honest disabled state.
- Fix dead footer legal links.
- Remove dead `/objects/[slug]` link path or add a real destination strategy.
- Escape all user input in contact and reserve HTML emails.

### P1

- Complete Studio edit coverage for Transmission.
- Complete Studio edit coverage for Radio.
- Complete Studio create coverage for Timeline and fix fallback row replacement bug.
- Complete Catalog editor coverage for `why_chosen` and product `details`.
- Remove player debug log.

### P2

- Add public product feed route for Meta/Google ingestion.
- Use production-domain absolute HTTPS item links and image links.
- Document final feed URL in this file.

## Final Deliverables To Add Back Into This File

- What was fixed
- Feed URL
- Any SQL Luis must run manually in Supabase SQL Editor
- Anything still needing manual action
- Final short launch-readiness checklist
