import type { Metadata } from 'next'
import ScanReveal from '@/components/ui/ScanReveal'
import ContactSheet from '@/components/ui/ContactSheet'
import PullQuote from '@/components/ui/PullQuote'

export const metadata: Metadata = {
  title: 'Brand Archive — Case Study',
  description: 'A visual audit and brand identity analysis of Buena Onda across 5,764 images.',
}

// Generate placeholder frames for contact sheets
const archiveFrames = Array.from({ length: 16 }, (_, i) => ({
  src:     '',
  alt:     `Archive frame ${i + 1}`,
  frame:   `${String(i + 1).padStart(2, '0')}A`,
  caption: ['Warm Core', 'Studio', 'Airy', 'Moody', 'Drama', 'Golden Hr', 'Portrait', 'Lifestyle',
            'Objects', 'Radio', 'Culture', 'Miami', 'Night', 'Day', 'People', 'Space'][i],
}))

const palette = [
  { hex: '#C0A880', name: 'Warm Sand',      role: 'Base warm neutral',    group: 'primary'   },
  { hex: '#A88860', name: 'Terracotta Sand', role: 'Earthy mid-tone',      group: 'primary'   },
  { hex: '#786048', name: 'Burnished Brown', role: 'Dark anchor',          group: 'primary'   },
  { hex: '#906060', name: 'Dusty Rose-Brown', role: 'Skin/warmth tone',    group: 'primary'   },
  { hex: '#604830', name: 'Deep Umber',      role: 'Shadow tone',          group: 'primary'   },
  { hex: '#90A8C0', name: 'Sky Steel',       role: 'Cool counterpoint',    group: 'secondary' },
  { hex: '#A8C0D8', name: 'Hazy Blue',       role: 'Light cool accent',    group: 'secondary' },
  { hex: '#7890A8', name: 'Slate Blue',      role: 'Mid cool tone',        group: 'secondary' },
  { hex: '#C0D8E8', name: 'Pale Sky',        role: 'Airy accent',          group: 'secondary' },
  { hex: '#BE5582', name: 'Rose Magenta',    role: 'Energy accent',        group: 'accent'    },
  { hex: '#A87860', name: 'Warm Blush',      role: 'Skin highlight',       group: 'accent'    },
  { hex: '#E8C0A8', name: 'Linen Peach',     role: 'Light skin tone',      group: 'accent'    },
  { hex: '#202020', name: 'Near-Black',      role: 'Deep shadow, text',    group: 'neutral'   },
  { hex: '#606060', name: 'Charcoal',        role: 'Mid shadow',           group: 'neutral'   },
  { hex: '#A0A0A0', name: 'Stone Grey',      role: 'Neutral mid',          group: 'neutral'   },
  { hex: '#F8F8F8', name: 'Off-White',       role: 'Clean background',     group: 'neutral'   },
]

const clusters = [
  { id: 'A', name: 'Warm Lifestyle Core', pct: 29.1, count: 1676, primary: true,
    desc: 'Natural light editorial photography. Warm golden-hour skin tones, terracotta and rust accents, dusty rose overlays, faded indigo counterpoint.' },
  { id: 'B', name: 'High-Key Studio',     pct: 22.6, count: 1305, primary: false,
    desc: 'Product flat-lays, studio shots, app screenshots. Clean white or off-white backgrounds, minimal props, clinical composition.' },
  { id: 'C', name: 'Airy Minimal',        pct: 17.2, count: 991,  primary: false,
    desc: 'Bright, hazy, overcast-light images. Beach at noon, washed-out sand dunes, bleached linen textures. Very low contrast.' },
  { id: 'D', name: 'Moody Dark',          pct: 17.6, count: 1016, primary: false,
    desc: 'Night photography, dark interior shots, heavy shadows, low ambient light. Near-monochrome charcoal palette.' },
  { id: 'E', name: 'Dark Vivid / Drama',  pct: 13.5, count: 776,  primary: false,
    desc: 'Event photography, neon-lit environments, bold graphic posts. Dark backgrounds with hot-pink or crimson highlights.' },
]

const scorecard = [
  { dimension: 'Color consistency',    score: 6, note: 'Warm earth tones dominant but dark/cool content dilutes' },
  { dimension: 'Brightness consistency', score: 7, note: 'Well-centred around mid-tone; outliers are small'    },
  { dimension: 'Saturation discipline', score: 8, note: 'Mostly natural; hyper-vivid outliers are minor (2.4%)'},
  { dimension: 'Orientation discipline', score: 6, note: 'Portrait dominant but 18% landscape is too high'     },
  { dimension: 'Overall brand cohesion', score: 6.5, note: 'Strong core identity undermined by 31% dark content'},
]

export default function CaseStudyPage() {
  return (
    <>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="pt-32 pb-20 bg-near-black text-pale-stone">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <ScanReveal>
            <span className="section-label text-stone-grey">Brand Archive · Case Study</span>
            <h1
              className="font-display text-linen-peach mt-3 max-w-[18ch]"
              style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}
            >
              Visual Identity Analysis
            </h1>
            <p className="text-stone-grey mt-4 text-sm max-w-prose">
              A statistical audit across 5,764 images from Instagram and Google Drive.
              KMeans cluster analysis on brightness, contrast, and saturation.
            </p>
          </ScanReveal>

          {/* Dataset stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px mt-14 bg-charcoal/30">
            {[
              { stat: '5,764',  label: 'Images analysed' },
              { stat: '3,942',  label: 'Instagram source' },
              { stat: '1,822',  label: 'Google Drive source' },
              { stat: '5',      label: 'Visual clusters identified' },
            ].map(({ stat, label }) => (
              <ScanReveal key={label}>
                <div className="bg-near-black p-6">
                  <p
                    className="font-display text-warm-sand leading-none mb-2"
                    style={{ fontSize: 'clamp(1.8rem, 3vw, 2.4rem)' }}
                  >
                    {stat}
                  </p>
                  <p className="archive-label text-[0.6rem]">{label}</p>
                </div>
              </ScanReveal>
            ))}
          </div>
        </div>
      </div>

      {/* ── Contact Sheet Archive ──────────────────────────────────────── */}
      <section aria-label="Visual archive sample">
        <ContactSheet images={archiveFrames} columns={8} />
      </section>

      {/* ── Dominant Aesthetic ─────────────────────────────────────────── */}
      <section className="py-24 bg-sand-bg">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <ScanReveal>
            <span className="section-label mb-6 block">Dominant Aesthetic</span>
            <PullQuote>
              Naturally lit, medium-dark editorial photography in warm amber and rose tones,
              with a cool dusty-blue counterpoint. Portrait-first. Muted-to-natural saturation.
              Soft contrast, no harsh shadows.
            </PullQuote>
          </ScanReveal>

          <div className="mt-14 grid md:grid-cols-5 gap-2">
            {clusters.map((c, i) => (
              <ScanReveal key={c.id} delay={i * 70}>
                <div className={[
                  'p-5 h-full flex flex-col gap-3',
                  c.primary ? 'bg-near-black text-pale-stone' : 'bg-linen-white',
                ].join(' ')}>
                  <div className="flex items-start justify-between">
                    <span className={[
                      'font-mono text-xs tracking-wider px-2 py-1',
                      c.primary ? 'bg-warm-sand text-near-black' : 'bg-pale-stone text-charcoal',
                    ].join(' ')}>
                      {c.id}
                    </span>
                    <span className="archive-label text-[0.6rem] text-stone-grey">
                      {c.pct}%
                    </span>
                  </div>
                  <h3 className={[
                    'font-display text-sm leading-snug',
                    c.primary ? 'text-linen-peach' : 'text-near-black',
                  ].join(' ')}>
                    {c.name}
                  </h3>
                  <p className={[
                    'text-xs leading-relaxed flex-1',
                    c.primary ? 'text-stone-grey' : 'text-charcoal',
                  ].join(' ')}>
                    {c.desc}
                  </p>
                  <p className="archive-label text-[0.58rem] text-stone-grey">
                    {c.count.toLocaleString()} images
                  </p>
                  {c.primary && (
                    <span className="archive-label text-[0.58rem] text-rose-magenta">
                      ★ Primary Brand Voice
                    </span>
                  )}
                </div>
              </ScanReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Color Palette ──────────────────────────────────────────────── */}
      <section className="py-24 bg-cream">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <ScanReveal>
            <span className="section-label mb-10 block">Official Color Palette</span>
          </ScanReveal>

          {['primary', 'secondary', 'accent', 'neutral'].map(group => {
            const groupPalette = palette.filter(p => p.group === group)
            const groupLabel   = { primary: 'Primary', secondary: 'Secondary', accent: 'Accent', neutral: 'Neutral Foundation' }[group]
            return (
              <ScanReveal key={group} className="mb-10">
                <p className="archive-label text-[0.62rem] mb-4">{groupLabel}</p>
                <div className="flex flex-wrap gap-3">
                  {groupPalette.map(({ hex, name, role }) => (
                    <div key={hex} className="flex flex-col gap-2 w-[calc(50%-6px)] sm:w-auto">
                      <div
                        className="w-full sm:w-16 h-12 sm:h-16 rounded-sm paper-hover"
                        style={{ backgroundColor: hex }}
                        title={hex}
                      />
                      <div>
                        <p className="font-mono text-[0.62rem] text-near-black">{hex}</p>
                        <p className="archive-label text-[0.58rem] mt-0.5">{name}</p>
                        <p className="archive-label text-[0.55rem] text-stone-grey">{role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScanReveal>
            )
          })}
        </div>
      </section>

      {/* ── Scorecard ──────────────────────────────────────────────────── */}
      <section className="py-24 bg-near-black text-pale-stone">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <ScanReveal>
            <span className="section-label text-stone-grey mb-10 block">Summary Scorecard</span>
          </ScanReveal>

          <div className="flex flex-col gap-3">
            {scorecard.map(({ dimension, score, note }, i) => (
              <ScanReveal key={dimension} delay={i * 60}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 py-4 border-b border-charcoal/40">
                  <div className="flex-shrink-0 w-full sm:w-56">
                    <p className="font-mono text-xs tracking-wide text-pale-stone">{dimension}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-1">
                    {/* Bar */}
                    <div className="flex-1 h-1 bg-charcoal/40 rounded-full">
                      <div
                        className="h-full bg-warm-sand rounded-full transition-all duration-700"
                        style={{ width: `${(score / 10) * 100}%` }}
                      />
                    </div>
                    <span className="font-display text-linen-peach text-lg leading-none w-8 text-right">
                      {score}
                    </span>
                  </div>
                  <p className="text-stone-grey text-xs sm:w-72">{note}</p>
                </div>
              </ScanReveal>
            ))}
          </div>

          <ScanReveal delay={300}>
            <div className="mt-12 p-7 border border-warm-sand/30 max-w-2xl">
              <p className="archive-label text-[0.6rem] text-warm-sand mb-3">Primary Action</p>
              <p className="text-pale-stone text-sm leading-relaxed">
                Audit and reduce the 1,792 dark images (Clusters D + E) to under 20% of
                published content. This single action would raise brand cohesion from
                6.5 to approximately 8/10.
              </p>
            </div>
          </ScanReveal>
        </div>
      </section>
    </>
  )
}
