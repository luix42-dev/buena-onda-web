# Frontend Design Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 8 design and code quality issues identified in the frontend audit — ranging from a broken font alias to hydration bugs and visual consistency gaps.

**Architecture:** Targeted, isolated fixes across globals.css, tailwind config, three page files, and two layout components. No new dependencies except one Google Font. Changes are independent — each task produces a working, shippable state.

**Tech Stack:** Next.js 14 (App Router), Tailwind CSS, TypeScript, next/font/google

---

## File Map

| File | Task(s) | Change |
|---|---|---|
| `app/layout.tsx` | 1 | Add Space Mono font loader, add CSS variable to body className |
| `app/globals.css` | 1 | Fix `--font-mono` to use `var(--font-mono-real)` |
| `tailwind.config.ts` | 1 | Fix `fontFamily.mono` to use `--font-mono` |
| `app/(site)/page.tsx` | 2, 5 | Fix duplicate pillar; add mobile hero accent |
| `app/(site)/radio/page.tsx` | 3, 4 | Fix waveform hydration; fix warm-sand token |
| `app/(site)/culture/page.tsx` | 6 | Improve placeholder image treatment |
| `components/layout/Navigation.tsx` | 7, 8 | Thicker active indicator; dark-page logo subtitle fix |

---

## Task 1: Add Space Mono — Fix font-mono alias

**Problem:** `--font-mono` resolves to Outfit (geometric sans). `font-mono` class in globals.css also uses `var(--font-sans)`. Archive labels, episode codes, emails, and timestamps look like body text instead of terminal/archive type.

**Files:**
- Modify: `app/layout.tsx:2` (import + loader)
- Modify: `app/layout.tsx:71` (add variable to body)
- Modify: `app/globals.css:15` (fix --font-mono)
- Modify: `app/globals.css:256` (fix .font-mono utility)
- Modify: `tailwind.config.ts:73` (fix fontFamily.mono)

- [ ] **Step 1: Add Space Mono font loader to `app/layout.tsx`**

  Change the import line and add the font below `instrumentSerif`:

  ```tsx
  // line 2 — add Space_Mono to the import
  import { Bebas_Neue, Outfit, Instrument_Serif, Space_Mono } from 'next/font/google'

  // after instrumentSerif block (around line 27)
  const spaceMono = Space_Mono({
    weight:   ['400', '700'],
    subsets:  ['latin'],
    variable: '--font-mono',
    display:  'swap',
  })
  ```

- [ ] **Step 2: Add the variable to `<body>` className**

  ```tsx
  // line 71 — append spaceMono.variable
  <body className={`${bebasNeue.variable} ${outfit.variable} ${instrumentSerif.variable} ${spaceMono.variable}`}>
  ```

- [ ] **Step 3: Remove the `--font-mono` declaration from `app/globals.css` `:root`**

  Find (line 15) and **delete** this line entirely:
  ```css
  --font-mono:    var(--font-sans);
  ```

  > **Why delete, not replace:** `next/font/google` injects the Space Mono CSS variable (`--font-mono`) onto `:root` via a `<style>` tag in `<head>`. If `globals.css` also declares `--font-mono` in `:root`, whichever declaration appears later in source order wins. In production, the stylesheet link comes after the injected style tag, so `globals.css` **overrides the font loader** — Space Mono never loads. The fix is to remove the declaration entirely and let next/font own the variable name.

- [ ] **Step 4: Fix the `.font-mono` utility class in `app/globals.css`**

  Find (around line 256):
  ```css
  .font-mono    { font-family: var(--font-sans); }
  ```
  Replace with:
  ```css
  .font-mono    { font-family: var(--font-mono); }
  ```

- [ ] **Step 5: Fix `fontFamily.mono` in `tailwind.config.ts`**

  ```ts
  // line 73
  mono: ['var(--font-mono)', 'SF Mono', 'Consolas', 'monospace'],
  ```

- [ ] **Step 6: Verify visually**

  Start dev server: `npm run dev` in `buena-onda-web/`

  Check these locations in the browser:
  - `/radio` → episode numbers (`EP·18`) and duration (`2h 04m`) should now appear in a monospaced font
  - `/contact` → email addresses (`hello@buenaonda.com`) should appear in a monospaced font
  - `/about` → timeline years should appear in monospaced

  Before/after: body text uses Outfit (proportional), these elements should now use Space Mono (fixed-width).

- [ ] **Step 7: Commit**

  ```bash
  git add app/layout.tsx app/globals.css tailwind.config.ts
  git commit -m "fix: replace font-mono alias with Space Mono — archive labels now render in monospace"
  ```

---

## Task 2: Fix Duplicate Radio Pillar

**Problem:** The Four Pillars array in `page.tsx` has "Sound" (→ `/radio`) and "Radio" (→ `/radio`) as two distinct cards. Both link to the same page — two of the four pillar slots drive to the same destination. Culture and Drops have no cards.

**Fix:** The current array has Objects, Sound, Culture, Radio. "Sound" is the duplicate — it links to `/radio` and so does "Radio." Replace "Sound" with a "Drops" card (the brand's seasonal releases pillar), giving four cards with four distinct identities. Radio keeps its slot as the audio archive link. Culture already has a card and correct link — no change needed there.

**Files:**
- Modify: `app/(site)/page.tsx:12–37`

- [ ] **Step 1: Update the `pillars` array**

  Replace the entire array (lines 12–37) with:

  ```tsx
  const pillars = [
    {
      name:     'Objects',
      headline: 'Things built to outlive their moment.',
      text:     'Curated objects, garments, and furniture selected for design integrity and cultural weight. Every piece in the catalog earned its place.',
      href:     '/themes',
    },
    {
      name:     'Culture',
      headline: 'Essays from the analog world.',
      text:     'Dispatches on music, objects, and analog culture. Long reads. Take your time.',
      href:     '/culture',
    },
    {
      name:     'Radio',
      headline: 'The signal is always on.',
      text:     'Curated mixes, live sessions, and field recordings broadcast from Little Havana and Wynwood.',
      href:     '/radio',
    },
    {
      name:     'Drops',
      headline: 'Limited objects. No restock.',
      text:     'Seasonal releases announced without warning. When it\'s gone, it\'s gone.',
      href:     '/radio',
    },
  ]
  ```

  > Note: "Drops" uses `/radio` as a placeholder href until a `/drops` page exists. Update the href when that page is built.

- [ ] **Step 2: Verify visually**

  Navigate to `/` in the browser. The Four Pillars section should show: Objects, Culture, Radio, Drops — four distinct cards, no duplicates.

- [ ] **Step 3: Commit**

  ```bash
  git add app/(site)/page.tsx
  git commit -m "fix: replace duplicate Radio pillar with Culture + Drops"
  ```

---

## Task 3: Fix Radio Waveform Hydration Mismatch

**Problem:** `app/(site)/radio/page.tsx:134` uses `Math.random()` inside JSX to set bar heights. React renders different values on server vs. client, causing a hydration mismatch warning in the console. The waveform is also only visible when `activeEpisode` is set — and all `audioUrl` values are `null`, so the play state is unreachable via the UI. The random logic is dead code that creates a silent runtime error.

**Files:**
- Modify: `app/(site)/radio/page.tsx`

- [ ] **Step 1: Add a static waveform constant at the top of the file (after imports)**

  ```tsx
  // Static waveform heights — avoids SSR hydration mismatch from Math.random()
  const WAVEFORM_HEIGHTS = [8, 14, 6, 18, 10, 20, 12, 16, 8, 14, 10, 20, 6, 18, 12, 14, 8, 16, 10, 14]
  ```

- [ ] **Step 2: Replace the `Math.random()` call**

  Find (around line 131):
  ```tsx
  {Array.from({length: 20}).map((_, i) => (
    <div
      key={i}
      className="w-0.5 bg-neon-pink rounded-full"
      style={{ height: `${Math.random() * 16 + 4}px`, opacity: 0.7 }}
    />
  ))}
  ```

  Replace with:
  ```tsx
  {WAVEFORM_HEIGHTS.map((h, i) => (
    <div
      key={i}
      className="w-0.5 bg-neon-pink rounded-full"
      style={{ height: `${h}px`, opacity: 0.7 }}
    />
  ))}
  ```

- [ ] **Step 3: Verify no hydration warning**

  Open browser DevTools → Console. Navigate to `/radio`. Confirm no "Hydration failed" or "Text content did not match" warnings appear.

- [ ] **Step 4: Commit**

  ```bash
  git add app/(site)/radio/page.tsx
  git commit -m "fix: replace Math.random() waveform with static heights — eliminates SSR hydration mismatch"
  ```

---

## Task 4: Fix `warm-sand` Color Token in Radio Page

**Problem:** `app/(site)/radio/page.tsx:48` uses `text-warm-sand` (`#C4A87C`, a golden-tan) for episode number labels. This is a legacy token that predates the Miami Synthesis palette and visually clashes with the dark Radio page's teal/coral/neon system.

**Files:**
- Modify: `app/(site)/radio/page.tsx:48`

- [ ] **Step 1: Replace the legacy token**

  Find (line 48):
  ```tsx
  <span className="archive-label text-[0.58rem] text-warm-sand">
  ```

  Replace with:
  ```tsx
  <span className="archive-label text-[0.58rem] text-teal-light">
  ```

- [ ] **Step 2: Verify visually**

  Navigate to `/radio`. Episode number labels (`EP·18`, `EP·17`, etc.) should now appear in teal-light (`#5ABFBF`) instead of the golden-tan.

- [ ] **Step 3: Commit**

  ```bash
  git add app/(site)/radio/page.tsx
  git commit -m "fix: replace legacy warm-sand token with teal-light on Radio episode labels"
  ```

---

## Task 5: Mobile Hero Visual Weight

**Problem:** The right panel of the hero (`HeroGrid`) is `hidden md:flex`. On mobile, the hero is plain black-on-cream text with no visual anchor. The brand's Miami heat is invisible on mobile.

**Fix:** Add a left-edge teal accent bar (already used in the desktop layout), and add a subtle warm gradient to the bottom of the mobile hero section to create visual depth without adding image weight.

**Files:**
- Modify: `app/(site)/page.tsx:46–121`

- [ ] **Step 1: Add a bottom color strip inside the left panel of the hero**

  The hero `<section>` uses a 2-column CSS grid (`grid-cols-1 md:grid-cols-[55%_45%]`). Do **not** add the color bar as a third sibling inside the grid — it would occupy a new grid row. Instead, place it as the **last child of the left panel `<div>`** (before the `</div>` that closes the left panel, around line 101).

  ```tsx
  {/* Mobile-only 4-color accent bar — brand palette anchor on small viewports */}
  <div className="md:hidden flex h-2 mt-10 -ml-10 -mr-8" aria-hidden="true">
    <div className="flex-1" style={{ background: '#2A9D9D' }} />
    <div className="flex-1" style={{ background: '#D9685A' }} />
    <div className="flex-1" style={{ background: '#1A7070' }} />
    <div className="flex-1" style={{ background: '#E8927F' }} />
  </div>
  ```

  The left panel starts at line 51 (`<div className="relative flex flex-col justify-center...">`) and closes around line 101. Add this block just before that closing `</div>`. The `-mx-10` negative margin bleeds the bar to the full section width, matching the section padding.

- [ ] **Step 2: Verify visually on mobile viewport**

  In browser DevTools, toggle to mobile viewport (375px wide). The hero should show the teal-coral-teal-coral-light 4-segment color bar at the bottom of the hero section, mirroring the 4-color bar used at the top of the Pillars section.

- [ ] **Step 3: Verify desktop is unchanged**

  Switch back to desktop viewport (>768px). The color bar should be invisible (`md:hidden`) and the HeroGrid right panel should still show normally.

- [ ] **Step 4: Commit**

  ```bash
  git add app/(site)/page.tsx
  git commit -m "feat: add mobile hero color bar — brand palette anchor on small viewports"
  ```

---

## Task 6: Culture Page Placeholder Image Treatment

**Problem:** Culture card image placeholders use `bg-gradient-to-br from-sand-bg to-pale-stone`. Both color values are `#F5F2ED` — the gradient is flat cream-to-cream. The cards look blank rather than designed.

**Fix:** Replace the empty gradients with a visually intentional treatment: teal-tinted gradient with the issue number rendered large and centered as a typographic placeholder. This works as design even before images land.

**Files:**
- Modify: `app/(site)/culture/page.tsx:112–115` (featured image placeholder)
- Modify: `app/(site)/culture/page.tsx:158–161` (grid card image placeholders)

- [ ] **Step 1: Update the featured post image placeholder**

  Find (lines 112–115):
  ```tsx
  <div className="aspect-[4/5] bg-gradient-to-br from-sand-bg to-pale-stone
                  flex items-end p-4">
    <span className="archive-label text-[0.6rem]">F{featured.issue}</span>
  </div>
  ```

  Replace with:
  ```tsx
  <div
    className="aspect-[4/5] flex flex-col items-center justify-center p-4 relative overflow-hidden"
    style={{ background: 'linear-gradient(135deg, #e8f4f4 0%, #f5f2ed 100%)' }}
  >
    <span
      className="font-display text-teal/20 select-none"
      style={{ fontSize: 'clamp(4rem, 10vw, 8rem)', lineHeight: 1 }}
      aria-hidden="true"
    >
      {featured.issue}
    </span>
    <span className="archive-label text-[0.6rem] text-teal absolute bottom-4 left-4">
      F{featured.issue}
    </span>
  </div>
  ```

- [ ] **Step 2: Update the grid card image placeholders**

  Find (lines 158–161):
  ```tsx
  <div className="aspect-[4/3] bg-gradient-to-br from-linen-white to-pale-stone
                  flex items-end p-3">
    <span className="archive-label text-[0.55rem]">{issue}</span>
  </div>
  ```

  Replace with:
  ```tsx
  <div
    className="aspect-[4/3] flex flex-col items-center justify-center p-3 relative overflow-hidden"
    style={{ background: 'linear-gradient(135deg, #e8f4f4 0%, #f5f2ed 100%)' }}
  >
    <span
      className="font-display text-teal/15 select-none"
      style={{ fontSize: '4rem', lineHeight: 1 }}
      aria-hidden="true"
    >
      {issue}
    </span>
    <span className="archive-label text-[0.55rem] text-teal absolute bottom-3 left-3">
      {issue}
    </span>
  </div>
  ```

- [ ] **Step 3: Verify visually**

  Navigate to `/culture`. The featured card and grid cards should now show a teal-tinted gradient with a large ghost issue number, rather than a flat cream rectangle.

- [ ] **Step 4: Commit**

  ```bash
  git add app/(site)/culture/page.tsx
  git commit -m "feat: typographic issue-number placeholder for culture cards — editorial feel before real images"
  ```

---

## Task 7: Nav Active State — Increase Indicator Weight

**Problem:** The active page indicator in `Navigation.tsx` is a 1px neon-pink line under the label. At the top of the page (transparent nav, near-white background), this is nearly invisible.

**Fix:** Replace the 1px line with a 2px line + small leading dot, giving the active state more presence on both light and dark backgrounds.

**Files:**
- Modify: `components/layout/Navigation.tsx:94–101`

- [ ] **Step 1: Update the active indicator**

  Find (lines 94–101):
  ```tsx
  {isActive(href) && (
    <span
      className="block h-px mt-0.5 w-full"
      style={{
        background: 'var(--neon-pink)',
        boxShadow: '0 0 6px rgba(255,60,142,0.25)',
      }}
    />
  )}
  ```

  Replace with:
  ```tsx
  {isActive(href) && (
    <span
      className="block mt-1 w-full"
      style={{
        height: '2px',
        background: 'var(--neon-pink)',
        boxShadow: '0 0 8px rgba(255,60,142,0.5), 0 0 16px rgba(255,60,142,0.2)',
      }}
    />
  )}
  ```

- [ ] **Step 2: Verify visually**

  Navigate to any page, scroll so the nav is transparent (at page top). The active nav label should have a clearly visible 2px neon-pink underline with a visible glow. Also verify on scrolled state (opaque nav background) — should look the same or better.

- [ ] **Step 3: Commit**

  ```bash
  git add components/layout/Navigation.tsx
  git commit -m "fix: increase nav active indicator to 2px with stronger neon glow — visible on transparent nav"
  ```

---

## Task 8: Logo Subtitle Contrast on Dark Backgrounds

**Problem:** The "ANALOG CULTURE HOUSE" subtitle under the logo uses `var(--teal)` (`#2A9D9D`). On transparent nav over dark page sections (Radio header `#0D0D0D`, Manifesto section), this teal-on-black combination (`#2A9D9D` on `#0D0D0D`) has a contrast ratio of ~4.1:1 — below the 4.5:1 WCAG AA threshold and visually weak at small sizes.

**Fix:** Switch the subtitle to `var(--teal-light)` (`#5ABFBF`) which has contrast ratio ~6.1:1 against `#0D0D0D` and reads clearly on both light and dark backgrounds.

**Files:**
- Modify: `components/layout/Navigation.tsx:73`

- [ ] **Step 1: Update subtitle color**

  Find (line 73):
  ```tsx
  style={{ fontFamily: 'var(--font-display)', color: 'var(--teal)' }}
  ```

  Replace with:
  ```tsx
  style={{ fontFamily: 'var(--font-display)', color: 'var(--teal-light)' }}
  ```

- [ ] **Step 2: Verify on light and dark contexts**

  - Navigate to `/` — subtitle should be readable on the warm-white header background
  - Navigate to `/radio` — subtitle should be visible against the dark hero background
  - Scroll down the homepage to the Manifesto section (`#0D0D0D`) — subtitle should remain legible

- [ ] **Step 3: Commit**

  ```bash
  git add components/layout/Navigation.tsx
  git commit -m "fix: switch logo subtitle to teal-light for WCAG AA contrast on dark section backgrounds"
  ```

---

## Final Verification Checklist

After all tasks are complete, do a full pass:

- [ ] `/` — Four Pillars shows Objects / Culture / Radio / Drops (no duplicates)
- [ ] `/` mobile (375px) — hero shows 4-color accent bar at bottom
- [ ] `/culture` — placeholder cards show teal-gradient + ghost issue numbers
- [ ] `/radio` — browser console shows no hydration warnings
- [ ] `/radio` — episode numbers (`EP·18`) appear in teal-light, Space Mono font
- [ ] `/contact` — email addresses render in Space Mono
- [ ] Any page — nav active indicator is a visible 2px neon-pink line
- [ ] `/radio` at page top — "ANALOG CULTURE HOUSE" subtitle visible in nav

---

## Scope Intentionally Excluded

These were noted in the audit but excluded to keep this plan focused on clear, testable changes:

- **Newsletter form deduplication** — requires product decision on whether they serve the same list
- **Culture/Radio "coming soon" redesign** — content-level decision, no clear spec yet
- **Four Pillars "Drops" page** — placeholder href used; building `/drops` is a separate feature
