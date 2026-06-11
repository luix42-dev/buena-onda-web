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

## What Was Fixed

### Frontend launch-readiness

- Added live public culture detail pages at `/culture/[slug]`.
- Updated the culture index so published essays resolve to real public URLs.
- Added public `/privacy` and `/terms` pages so footer links no longer 404.
- Replaced the fake drop notification flow with a real `/api/newsletter` submission path.
- Replaced the dead `/objects/[slug]` CTA with an honest disabled launch state instead of a broken link.
- Escaped user-controlled HTML in both contact and reserve email templates before interpolation.
- Tightened the homepage newsletter section layout on mobile by moving the divider to a top rule on small screens.
- Converted `/case-study` from a placeholder-heavy public page into an honest launching-soon state.

### Studio completion

- Fixed Culture slug preservation on edit. Slugs are now generated on first create and preserved on later title edits.
- Added Transmission issue edit/delete support in Studio and added the missing `/api/admin/transmission-issues/[id]` API route.
- Added Radio episode metadata editing and delete support in Studio while keeping Radio separate from Player.
- Added Timeline era creation in Studio and fixed the create/save bug where draft or fallback entries were not replaced correctly after save.
- Expanded Catalog item editing so Studio can now edit `why_chosen` and structured public-facing item details (`era`, `dimensions`, `material`, `condition`, `origin`).
- Removed the leftover player debug `console.log`.

### Events / playlist_url diagnosis

- Verified directly against the live Supabase project on 2026-06-08 that the `events` table currently includes both `event_date` and `playlist_url`.
- Verified at least one live event row already has a persisted `playlist_url`.
- Conclusion: the current repo no longer points to a missing-column schema problem for `playlist_url`; no migration SQL is required from the codebase state audited here.

### Product feed

- Added a public XML feed route at `/feed.xml`.
- Feed sources published items from Supabase and emits Google-style product XML suitable for Meta Commerce Manager ingestion.
- Implemented required mappings for `id`, `title`, `description`, `availability`, `condition`, `price`, `link`, and `image_link`.
- Included recommended fields where available: `additional_image_link`, `brand`, `product_type`, and `item_group_id`.

## Feed URL

- Production feed URL: `https://buenaondalifestyle.com/feed.xml`

## SQL For Luis

- No SQL is required from this implementation pass.
- No Supabase migration was run.

## Still Needing Manual Action

- Review the branch in Studio with your real admin session, especially the Events editor save flow, since browser automation was intentionally not used.
- If you want `/objects` to become a live reservation flow rather than an honest disabled state, that needs a real `/objects/[slug]` product/detail implementation.

## Launch-Readiness Checklist

- WSL build passes.
- Main public nav routes resolve.
- Footer legal links resolve.
- Culture slugs resolve publicly and remain stable after edit.
- Contact and reserve emails no longer interpolate raw HTML.
- Newsletter and drop-notify signup submit to a real endpoint.
- Placeholder dead links to nowhere were removed or replaced with honest disabled states.
- Studio create/edit/save coverage now exists for Catalog, Culture, Transmission, Radio, and Timeline.
- Product feed route exists and is ready for Commerce Manager ingestion.

## 2026-06-08 Playlist Trace

### Phase 0: Read-only write-path trace

Studio form field:

- File: `app/studio/(shell)/events/[id]/EventEditor.tsx`
- Field label: `YouTube Playlist URL`
- Input id: `event-playlist`
- State binding: `const [playlistUrl, setPlaylistUrl] = useState(event?.playlist_url ?? '')`
- Input writes to state with `onChange={e => setPlaylistUrl(e.target.value)}`

Submit path:

- Same file, `saveEvent()`
- On edit, the client sends `PATCH /api/admin/events/${event.id}`
- On create, the client sends `POST /api/admin/events`
- The payload explicitly includes `playlist_url: playlistUrl.trim() || null`
- The field is not renamed or omitted in the client payload

Server path:

- Edit route: `app/api/admin/events/[id]/route.ts`
- Create route: `app/api/admin/events/route.ts`
- Both routes destructure `playlist_url` from the request body
- Both routes write `playlist_url: playlist_url || null` into the Supabase mutation object

Supabase mutation shape:

- Create uses `insert(...).select().single()` on `events`
- Edit uses `update(...).eq('id', id).select().single()` on `events`
- This is not an upsert
- There is no `onConflict` column because no upsert is used
- Edit targets exactly one existing row by `id`
- This path should update the row in place and should not create a duplicate

Supabase client and key:

- The events admin routes call `createServiceClient()` from `lib/supabase/server.ts`
- `createServiceClient()` uses `createServerClient(...)`
- URL: `NEXT_PUBLIC_SUPABASE_URL`
- Key: `SUPABASE_SERVICE_ROLE_KEY`
- This is the service-role key, not the anon key

Studio auth gate:

- The route is protected by `isStudioAuthorized(request)` in `lib/studio-auth.ts`
- Authorization is cookie/password based for studio access
- Once authorized, the actual database write still executes with the service-role key on the server

Events table / RLS:

- Repo migration `supabase/migrations/events_migration.sql` defines the `playlist_url TEXT` column
- The repo does not define any `events` RLS policies
- Direct policy introspection through PostgREST was not available from this repo session because the policy catalog is not exposed in the project API schema
- For the actual studio save path traced here, RLS is not the deciding factor because the write uses the service-role key, which bypasses row-level policy checks

Live schema spot-check:

- On 2026-06-08, a direct service-role read of live `events` rows confirmed `playlist_url` is present in the live table
- Existing row sample:
  - `BUENA ONDA OPEN DECKS`
  - id `f3fad7de-36e9-44ab-baac-1d6c59d07933`
  - stored `playlist_url` already equals `https://www.youtube.com/playlist?list=PLXAw0NByz6xAgHl7mLQvxgU4GhNWbIvUQ`

Phase 0 diagnosis:

- The code path does not currently show a dropped field, a renamed payload key, an upsert conflict issue, or an anon/RLS write path.
- The most likely remaining failure mode was that the prior fix had never been proven against the exact service-role write path, which Phase 1 isolates directly.

### Phase 1: Direct DB write proof

Diagnostic script:

- Temporary script created: `scripts/diag-playlist-write.ts`
- Client used: `createServerClient` from `@supabase/ssr`
- URL used: `NEXT_PUBLIC_SUPABASE_URL`
- Key used: `SUPABASE_SERVICE_ROLE_KEY`
- This matches the effective client/key pattern used by the studio events admin routes

Known row used:

- Event id: `f811a290-bc86-4f69-ae70-47646abbac85`
- Slug: `onda-tropical`

Test write result:

- Before: `playlist_url = null`
- Update to test playlist URL succeeded
- Read-back immediately after update returned the written playlist URL
- Rows affected: `1`
- Restore back to original value also succeeded
- Restore read-back matched the original value
- No error was returned on before-read, update, after-read, restore, or restored-read

Phase 1 conclusion:

- The DB layer is proven good under the exact service-role save pattern used by the studio events routes.
- Root cause is not:
  - missing column
  - RLS denial
  - insufficient permissions
  - bad `onConflict`
  - duplicate-row behavior
- No SQL is required for `playlist_url` persistence from the current repo state.

### Playlist bug-fix changes after proof

- Added client-state resync in `app/studio/(shell)/events/[id]/EventEditor.tsx` so the editor state rehydrates cleanly from the server-provided event record when props change.
- Added `revalidatePath('/events')` and detail-page revalidation in:
  - `app/api/admin/events/route.ts`
  - `app/api/admin/events/[id]/route.ts`
- Removed `runtime = 'edge'` from the events admin routes so server-side revalidation can run correctly.
- Updated live event embed normalization in `app/(site)/events/[slug]/page.tsx`:
  - `youtube.com/playlist?list=ID` -> `https://www.youtube.com/embed/videoseries?list=ID`
  - `youtube.com/watch?v=VID&list=ID` -> `https://www.youtube.com/embed/VID?list=ID`
  - bare `watch?v=VID` -> `https://www.youtube.com/embed/VID`

Working root-cause statement:

- The previously-suspect `playlist_url` persistence bug was not a DB permission problem. The save path already writes with the service-role key and succeeds. The actionable fixes were to harden the editor refresh/revalidation path and to correct the live YouTube embed URL normalization.
