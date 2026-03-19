import type { Metadata } from 'next'
import ScanReveal from '@/components/ui/ScanReveal'

export const metadata: Metadata = {
  title: 'Culture',
  description: 'Essays, dispatches, and stories from the analog world.',
}

// Placeholder posts — in production these come from Supabase
const posts = [
  {
    slug:        'the-record-as-object',
    issue:       '001',
    title:       'The Record as Object',
    excerpt:     'Why the 12-inch still matters in an era of algorithmic playlists. A meditation on format, ritual, and the physics of sound.',
    tags:        ['Music', 'Objects', 'Culture'],
    date:        'March 2024',
    readTime:    '8 min',
    featured:    true,
  },
  {
    slug:        'miami-sound-map',
    issue:       '002',
    title:       'A Sound Map of Miami',
    excerpt:     'From Wynwood garages to Coral Gables courtyard sessions — tracing the veins of the city through its music.',
    tags:        ['Miami', 'Sound', 'City'],
    date:        'February 2024',
    readTime:    '12 min',
    featured:    false,
  },
  {
    slug:        'the-weight-of-leather',
    issue:       '003',
    title:       'The Weight of Leather',
    excerpt:     'What the patina on a well-used bag teaches us about time, and why we stopped buying things that refuse to age.',
    tags:        ['Objects', 'Craft'],
    date:        'January 2024',
    readTime:    '6 min',
    featured:    false,
  },
  {
    slug:        'slow-listening',
    issue:       '004',
    title:       'In Defense of Slow Listening',
    excerpt:     'The full album, front to back. No shuffle. No skip. A case for listening the way the artist intended.',
    tags:        ['Music', 'Practice'],
    date:        'December 2023',
    readTime:    '5 min',
    featured:    false,
  },
  {
    slug:        'analog-summer',
    issue:       '005',
    title:       'Analog Summer',
    excerpt:     'Shot entirely on 35mm, a dispatch from the longest June we can remember.',
    tags:        ['Photography', 'Miami', 'Summer'],
    date:        'July 2023',
    readTime:    '4 min',
    featured:    false,
  },
  {
    slug:        'the-cuban-connection',
    issue:       '006',
    title:       'The Cuban Connection',
    excerpt:     'How the Afro-Cuban diaspora shaped Miami&apos;s sound and what that means for culture today.',
    tags:        ['Music', 'History', 'Miami'],
    date:        'June 2023',
    readTime:    '10 min',
    featured:    false,
  },
]

export default function CulturePage() {
  const featured = posts.find(p => p.featured)!
  const rest     = posts.filter(p => !p.featured)

  return (
    <>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="pt-32 pb-16 bg-warm-page">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <ScanReveal>
            <span className="section-label">Culture</span>
            <h1
              className="font-display text-near-black mt-2"
              style={{ fontSize: 'clamp(2.2rem, 6vw, 4rem)' }}
            >
              Essays & Dispatches
            </h1>
          </ScanReveal>
        </div>
      </div>

      {/* ── Coming Soon Banner ─────────────────────────────────────────── */}
      <div className="bg-sand-bg border-y border-pale-stone py-4">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <p className="font-mono text-xs text-stone-grey text-center tracking-wide">
            Essays and dispatches launching soon.{' '}
            <a href="/#transmission" className="text-teal hover:text-burnished transition-colors underline underline-offset-2">
              Join The Transmission to read first.
            </a>
          </p>
        </div>
      </div>

      {/* ── Featured Post ──────────────────────────────────────────────── */}
      <section className="py-16 bg-cream">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <ScanReveal>
            <div className="opacity-70 grid md:grid-cols-[1fr_2fr] gap-8 items-start bg-linen-white p-8">
              {/* Image placeholder */}
              <div className="aspect-[4/5] bg-gradient-to-br from-sand-bg to-pale-stone
                              flex items-end p-4">
                <span className="archive-label text-[0.6rem]">F{featured.issue}</span>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <span className="archive-label text-[0.6rem] text-coral">Featured</span>
                  <span className="archive-label text-[0.6rem]">{featured.issue}</span>
                </div>
                <h2
                  className="font-display text-near-black"
                  style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.6rem)' }}
                >
                  {featured.title}
                </h2>
                <p className="text-charcoal leading-relaxed">{featured.excerpt}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {featured.tags.map(tag => (
                    <span
                      key={tag}
                      className="archive-label text-[0.6rem] border border-pale-stone px-2 py-1"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <span className="archive-label text-[0.6rem]">{featured.date}</span>
                  <span className="archive-label text-[0.6rem]">{featured.readTime} read</span>
                </div>
              </div>
            </div>
          </ScanReveal>
        </div>
      </section>

      {/* ── Post Grid ──────────────────────────────────────────────────── */}
      <section className="py-16 bg-cream">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <div className="opacity-70">
            <div className="grid md:grid-cols-3 gap-8">
              {rest.map(({ slug, issue, title, excerpt, tags, date, readTime }, i) => (
                <ScanReveal key={slug} delay={i * 80}>
                  <div className="block bg-sand-bg h-full flex flex-col">
                    {/* Image placeholder */}
                    <div className="aspect-[4/3] bg-gradient-to-br from-linen-white to-pale-stone
                                    flex items-end p-3">
                      <span className="archive-label text-[0.55rem]">{issue}</span>
                    </div>

                    <div className="p-5 flex flex-col gap-3 flex-1">
                      <div className="flex flex-wrap gap-1.5">
                        {tags.slice(0, 2).map(tag => (
                          <span
                            key={tag}
                            className="archive-label text-[0.58rem] text-teal-light"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <h3
                        className="font-display text-near-black"
                        style={{ fontSize: 'clamp(1rem, 1.8vw, 1.2rem)' }}
                      >
                        {title}
                      </h3>
                      <p className="text-charcoal text-sm leading-relaxed flex-1">{excerpt}</p>
                      <div className="flex items-center justify-between mt-2 pt-3 border-t border-pale-stone">
                        <span className="archive-label text-[0.58rem]">{date}</span>
                        <span className="font-mono text-xs text-teal-light">
                          {readTime}
                        </span>
                      </div>
                    </div>
                  </div>
                </ScanReveal>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
