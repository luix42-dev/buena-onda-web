# Buena Onda — An Analog Culture House

Production website for **Buena Onda**, an analog culture house rooted in Miami.
Built with **Next.js 14** · **Supabase** · **Tailwind CSS** · deployed on **Vercel**.

---

## Architecture Decision

| Concern        | Choice                          | Rationale |
|----------------|---------------------------------|-----------|
| Framework      | Next.js 14 (App Router)         | RSC for fast static pages, API routes for backend |
| Database       | Supabase (Postgres + Storage)   | Instant REST + realtime, Row Level Security built-in |
| Styling        | Tailwind CSS + custom CSS       | Brand tokens in tailwind.config; analog micro-interactions in globals.css |
| Animations     | CSS + IntersectionObserver      | Zero JS bundle cost for scan-reveal; framer-motion available for complex motion |
| Fonts          | Google Fonts (DM Serif Display, DM Mono, Inter) | Editorial serif + technical mono matches brand |
| Email          | Resend (optional)               | Reliable transactional email; contact form works without it |
| Deployment     | Vercel                          | Zero-config for Next.js; automatic preview deployments |

---

## Project Structure

```
buena-onda-web/
├── app/
│   ├── (site)/                  # Public-facing pages
│   │   ├── page.tsx             # Home
│   │   ├── about/page.tsx
│   │   ├── culture/page.tsx
│   │   ├── radio/page.tsx
│   │   ├── objects/page.tsx
│   │   ├── case-study/page.tsx
│   │   └── contact/page.tsx
│   ├── admin/                   # CMS admin panel
│   │   ├── layout.tsx
│   │   ├── page.tsx             # Dashboard
│   │   ├── posts/page.tsx
│   │   ├── episodes/page.tsx
│   │   └── drops/page.tsx
│   ├── api/                     # API routes
│   │   ├── posts/route.ts
│   │   ├── episodes/route.ts
│   │   ├── drops/route.ts
│   │   └── contact/route.ts
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── layout/
│   │   ├── Navigation.tsx       # Sticky nav + mobile drawer
│   │   └── Footer.tsx
│   └── ui/
│       ├── FilmGrain.tsx        # Fixed grain overlay
│       ├── ClickSound.tsx       # Web Audio API page-turn sound
│       ├── ScanReveal.tsx       # IntersectionObserver clip-path reveal
│       ├── ContactSheet.tsx     # Film contact-sheet photo grid
│       ├── ArchiveLabel.tsx     # Monospace uppercase label
│       └── PullQuote.tsx        # Bordered editorial pull quote
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # Browser client
│   │   └── server.ts            # Server-side client (SSR)
│   └── utils.ts
├── types/index.ts               # TypeScript interfaces
├── supabase/schema.sql          # Full database schema + RLS policies
├── tailwind.config.ts           # Brand color tokens
├── .env.example
└── next.config.ts
```

---

## Local Setup

### 1. Clone & install

```bash
git clone https://github.com/your-org/buena-onda-web.git
cd buena-onda-web
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in the values:

| Variable                          | Where to find it |
|-----------------------------------|------------------|
| `NEXT_PUBLIC_SUPABASE_URL`        | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY`       | Supabase Dashboard → Settings → API |
| `RESEND_API_KEY`                  | resend.com → API Keys (optional) |
| `CONTACT_EMAIL`                   | Your inbox for contact form submissions |

### 3. Database

1. Create a free Supabase project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor → New Query**
3. Paste the contents of `supabase/schema.sql` and run it
4. Storage buckets (`images`, `audio`) are created by the schema; verify under **Storage**

### 4. Run dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)
Admin panel: [http://localhost:3000/admin](http://localhost:3000/admin)

---

## Design System

### Color Palette

Derived from KMeans analysis of 5,764 brand images:

| Token           | Hex       | Role |
|-----------------|-----------|------|
| `warm-sand`     | `#C0A880` | Base warm neutral |
| `terracotta`    | `#A88860` | Earthy mid-tone |
| `burnished`     | `#786048` | Dark anchor |
| `dusty-rose`    | `#906060` | Skin/warmth tone |
| `sky-steel`     | `#90A8C0` | Cool counterpoint |
| `rose-magenta`  | `#BE5582` | Energy accent (use sparingly) |
| `near-black`    | `#202020` | Primary text/dark bg |
| `cream`         | `#FAF6F0` | Primary background |
| `sand-bg`       | `#F2ECE2` | Section alternate background |

### Typography

- **Display:** DM Serif Display (Georgia fallback) — headings, pull quotes
- **Body:** Inter (system-ui fallback) — paragraphs, descriptions
- **Mono:** DM Mono (Consolas fallback) — labels, metadata, nav, buttons

### Analog Micro-interactions

| Interaction | Implementation |
|-------------|----------------|
| Film grain | SVG `feTurbulence` noise fixed overlay (`grain-overlay` class) |
| Page-turn click sound | Web Audio API noise burst — `ClickSound.tsx` |
| Paper hover shift | CSS `transform: translate(-2px, -3px) rotate(-0.3deg)` — `paper-hover` class |
| Scan-line reveal | `clip-path: inset(0 0 100% 0)` → `inset(0 0 0% 0)` via IntersectionObserver |
| Contact sheet grid | CSS Grid with 1px gap on `#1a1a1a` background, per-cell archive labels |

---

## Database Tables

| Table                    | Purpose |
|--------------------------|---------|
| `posts`                  | Culture essays and dispatches |
| `episodes`               | Radio archive entries |
| `drops`                  | Objects and limited editions |
| `media_assets`           | Image/audio/video asset registry |
| `site_settings`          | Key-value config (hero text, social links, etc.) |
| `newsletter_subscribers` | Email list |

All tables have Row Level Security enabled. Public users can read published content; writes require Supabase Auth.

---

## Deployment (Vercel)

### First deploy

```bash
npm install -g vercel
vercel
```

Follow the CLI prompts. When asked for environment variables, add all values from `.env.local`.

### Subsequent deploys

```bash
vercel --prod
```

Or connect the GitHub repo to Vercel for automatic deployments on push.

### Environment variables in Vercel

Go to **Vercel Dashboard → Your Project → Settings → Environment Variables** and add:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY` (optional)
- `CONTACT_EMAIL`
- `NEXT_PUBLIC_SITE_URL` (set to your production domain)

### Custom domain

In **Vercel Dashboard → Domains**, add your domain (e.g., `buenaonda.com`) and follow the DNS instructions.

---

## Extending the Project

### Adding a new page

1. Create `app/(site)/your-page/page.tsx`
2. Export a `metadata` object and a default React component
3. Add the route to `components/layout/Navigation.tsx`

### Adding a new API resource

1. Create `app/api/resource/route.ts` following the pattern in `app/api/posts/route.ts`
2. Add the table to `supabase/schema.sql` and run the migration
3. Add the TypeScript interface to `types/index.ts`

### Connecting real images

Replace the placeholder `div` elements in pages with `<Image>` from `next/image` using URLs from Supabase Storage:

```tsx
import Image from 'next/image'

<Image
  src={post.cover_image}
  alt={post.title}
  fill
  sizes="(min-width: 768px) 50vw, 100vw"
  className="object-cover"
/>
```

---

## License

Private — Buena Onda, Miami FL. All rights reserved.
