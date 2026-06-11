# Buena Onda Redesign — MOMA Catalog + Analog Warmth

## Overview

Full aesthetic pivot: from black/pink Miami nightclub → warm MOMA Design Store catalog with analog warmth. Every section gets touched. The reference is the physical MOMA catalog photos (clean hairline grids, large editorial serif headers, minimal white/cream backgrounds, product photography floating on white).

---

## Phase 1 — Foundation (Color + Typography + Logo)

### 1a. tailwind.config.ts — New warm analog palette

Replace the current hot-pink/black system with:

```
warm-sand:    #C4A87C   (warm gold — primary accent)
terracotta:   #C4724A   (earthy — headings, CTAs)
burnished:    #8B6848   (deep warm brown)
dusty-rose:   #C85A7C   (muted rose — "EXCLUSIVE"/"NEW" tags, like MOMA coral)
deep-umber:   #3D2B1F   (rich dark brown)

near-black:   #1A1A18   (warm black, NOT pure #000)
charcoal:     #4A4A48   (body text on cream)
stone-grey:   #9A9590   (captions, metadata)
pale-stone:   #D8D2C8   (borders, hairlines)

cream:        #FAF6F0   (primary background)
sand-bg:      #F2ECE2   (alt section background)
linen-white:  #F5F0E8   (card backgrounds)
off-white:    #FFFDF8   (brightest white)
linen-peach:  #EDE0D0   (warm neutral)
```

### 1b. globals.css — Typography overhaul

**Fonts**: Swap from DM Serif Display / Inter / DM Mono to:
- **Playfair Display** (serif) — headings, editorial statements
- **Space Grotesk** (geometric sans) — body, UI
- **Space Mono** (monospace) — labels, metadata, catalog numbers

Google Fonts import:
```
Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&
Space+Grotesk:wght@300;400;500;600;700&
Space+Mono:wght@400;700
```

Body: `background: #FAF6F0; color: #1A1A18;`
Scrollbar: cream track, terracotta thumb
Selection: warm rose tint
All hardcoded `rgba(255,32,132,...)` → warm sand/terracotta equivalents

### 1c. Logo fix

The current `logo.svg` is a placeholder `<text>` element (Georgia italic, fill #D4006A) that renders inconsistently. There's a proper PNG at `public/NEW LOGO BUENA ONDA revectorized OG COLOR.png` (3972x1387 RGBA).

**Fix**: Switch Navigation.tsx to use the PNG logo instead of the SVG. Use Next/Image for optimization. Set height ~40px, auto width.

### 1d. EST. 2014

Change every occurrence of "2019" to "2014" (hero label, about page timeline, metadata).

---

## Phase 2 — Hero + Manifesto Treatment

### 2a. Hero section redesign

- Background: `bg-cream` (warm white)
- Remove radial pink glow → replace with subtle warm radial: `rgba(196,168,124,0.12)`
- "Miami · Est. 2014" label in `text-terracotta`
- "Buena Onda" heading in `text-near-black` (warm black), Playfair Display
- **"AN ANALOG CULTURE HOUSE"** — THE MANIFESTO LINE:
  - Full-width, `font-size: clamp(5rem, 10vw, 10rem)`
  - Font: Playfair Display, weight 900 (Black) or Space Grotesk 700
  - `text-near-black`, uppercase, `tracking-tight`
  - Spans the full viewport width with edge-to-edge padding
  - NOT a subtitle. A declaration. Positioned below "Buena Onda" or as the primary hero statement
- CTA buttons: `bg-terracotta text-cream` primary, `border-terracotta text-terracotta` secondary

### 2b. Contact sheet strip

Keep dark treatment — it already works as a visual break. Just ensure frame numbers use `text-stone-grey`.

---

## Phase 3 — Product Section (MOMA Catalog Grid)

New section on homepage, positioned after the manifesto section. Uses the MOMA design pattern from the photos:

### Layout:
- Section header: "Objects & Editions" in large Playfair Display (mixed weight like MOMA — heavy title word, lighter descriptor)
- Clean grid: `grid-cols-3` on desktop (like MOMA left page)
- **Hairline borders** between cells (1px `border-pale-stone`) — THIS is the key MOMA pattern
- Each cell: product image centered on white/cream bg, product name below in small Space Grotesk, price in Space Mono, status tag in `text-dusty-rose` ("EXCLUSIVE" / "SOLD OUT" / "NEW")
- Images float on clean backgrounds (no decorative elements)
- Generous padding within cells

### Products (from existing drops data):
- DROP·04: The Buena Onda Field Bag — $285
- DROP·03: The Guayabera Edit — $195
- DROP·02: The Record Crate — $140
- DROP·01: The Market Tote — $65
- Plus 2 placeholder catalog items to fill 6-cell grid

### Implementation:
- New inline section in page.tsx (no separate component needed)
- Styled with Tailwind grid + hairline border pattern
- Gradient placeholders for product images (until real images available)

---

## Phase 4 — YouTube + SoundCloud Embeds

### 4a. YouTube section — "Club Jolt Radio"

New section on homepage or replace the current Radio CTA section:
- Section label: "Club Jolt Radio · 80s Sessions"
- Heading: "Turn it up." or "The signal is always on."
- Embedded YouTube player using `<iframe>` with proper aspect ratio
- Use a placeholder YouTube embed URL (user can swap in real channel/video)
- Warm dark background section (`bg-near-black` warm) to set it apart
- Optional: 2-3 video thumbnails in a row

### 4b. SoundCloud section — Mixes

- Section label: "Mixes & Sessions"
- Embedded SoundCloud player widget (`<iframe>`)
- Use SoundCloud's oEmbed format
- Styled to match the warm aesthetic (SoundCloud widget supports color customization)
- Positioned below or alongside YouTube section

### 4c. Remove Spotify

- Remove Spotify from Footer.tsx social links
- Remove any Spotify references from radio page footer text
- Keep Mixcloud reference (or replace with SoundCloud)

---

## Phase 5 — Sound Effects Enhancement

### 5a. Expand ClickSound.tsx

Currently generates a single mechanical click. Enhance with multiple sound types:

1. **Page turn** — softer, papery swoosh (filtered noise, longer decay ~80ms, lower freq)
2. **Typewriter strike** — sharp, metallic tick (higher freq ~2400Hz, very short ~20ms)
3. **Vinyl crackle** — continuous subtle background crackle (loop, very low volume)
4. **Mechanical click** — keep current click for buttons/CTAs

All procedurally generated via Web Audio API (no audio files needed).

### 5b. Sound triggers:
- Route changes → page turn sound
- Button/link clicks → typewriter strike
- Hover on product cards → soft mechanical click
- Optional: vinyl crackle ambient (toggle-able, very subtle)

---

## Phase 6 — Section-by-Section Color Updates

### Navigation:
- Scrolled state: `bg-cream/95 backdrop-blur` (warm white, not black)
- Logo: PNG file, naturally colored
- Links: `text-charcoal hover:text-terracotta`
- Active: `text-near-black` with `bg-terracotta` underline
- Mobile menu: `bg-cream`
- Hamburger lines: `bg-near-black`

### Manifesto section:
- `bg-sand-bg` (warm sand)
- Heading: `text-near-black`
- Body: `text-charcoal`
- Pull quote: `border-terracotta`, text in `text-burnished italic`
- Stats: `text-terracotta` numbers, `text-stone-grey` labels
- CTA link: `text-terracotta hover:text-dusty-rose`

### Culture teaser:
- `bg-cream` background
- White/linen cards with `border border-pale-stone` (hairline like MOMA)
- Card titles: `text-near-black hover:text-terracotta`
- Issue numbers: `text-dusty-rose` (like MOMA coral tags)
- Read CTA: `text-terracotta`

### Radio CTA:
- Keep dark (`bg-near-black` warm) as contrast
- Label: `text-warm-sand`
- Heading: `text-cream`
- Button: `border-warm-sand text-warm-sand`

### Themes section:
- `bg-sand-bg`
- Catalog ordinals: `text-warm-sand/60`
- Titles: `hover:text-terracotta`

### Items section:
- `bg-cream`
- Titles: `text-near-black hover:text-terracotta`
- Thumbnails: warm-toned gradient placeholders

### Newsletter:
- `bg-linen-white border-t border-pale-stone`
- Input: `bg-cream border-pale-stone`
- Button: `bg-terracotta text-cream hover:bg-burnished`

### Footer:
- `bg-near-black` (warm black)
- Brand name: `text-cream`
- Links: `hover:text-warm-sand`
- Newsletter button: `bg-warm-sand text-near-black`
- Remove Spotify link, keep Mixcloud + SoundCloud

---

## Phase 7 — Final Touches

- Update app/layout.tsx: `themeColor: '#FAF6F0'`, `colorScheme: 'light'`
- Update globals.css `@layer components` — all component color refs to warm palette
- Update Footer.tsx — remove Spotify, add SoundCloud
- Update radio page footer text — "Available on Mixcloud and SoundCloud" (no Spotify)
- NewsletterForm.tsx — cream input, terracotta button
- FooterNewsletter.tsx — warm-sand button
- Film grain overlay: change `mix-blend-mode: multiply` (works better on light bg)

---

## Files to modify:

1. `tailwind.config.ts` — color palette
2. `app/globals.css` — fonts, variables, body, all component colors
3. `app/layout.tsx` — themeColor, fonts import
4. `app/(site)/page.tsx` — ALL sections (hero, manifesto, products, YouTube, SoundCloud, culture, radio, themes, items, newsletter)
5. `components/layout/Navigation.tsx` — logo, colors, mobile menu
6. `components/layout/Footer.tsx` — remove Spotify, update colors
7. `components/layout/FooterNewsletter.tsx` — warm colors
8. `components/ui/NewsletterForm.tsx` — warm colors
9. `components/ui/ClickSound.tsx` — expand sound types
10. `public/logo.svg` — replaced by PNG reference

## Files NOT modified:
- ScanReveal, ContactSheet, PullQuote, FilmGrain — these use CSS classes/variables that will automatically update
- Supabase client, API routes, admin pages — no visual changes needed
