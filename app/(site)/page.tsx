import type { Metadata } from 'next'
import Link from 'next/link'
import ScanReveal from '@/components/ui/ScanReveal'
import NewsletterForm from '@/components/ui/NewsletterForm'
import HeroGrid from '@/components/HeroGrid'
import { createPublicClient } from '@/lib/supabase/public'
import type { Episode } from '@/types'

export const metadata: Metadata = {
  title: 'Buena Onda - Analog Culture House',
}

export const revalidate = 300

const pillars = [
  {
    name: 'Objects',
    headline: 'Things built to outlive their moment.',
    text: 'Garments, furniture, and objects chosen for how they age. Everything in the catalog was sourced with reason.',
    href: '/themes',
  },
  {
    name: 'Culture',
    headline: 'Essays from the analog world.',
    text: 'Dispatches on music, objects, and the Miami that runs below the surface. Long reads.',
    href: '/culture',
  },
  {
    name: 'Radio',
    headline: 'The signal is always on.',
    text: 'Mixes, live sessions, and field recordings from Little Havana and Wynwood. Front to back.',
    href: '/radio',
  },
  {
    name: 'Live Events',
    headline: 'The floor is the archive.',
    text: 'Onda Tropical, Open Decks, and recurring formats hosted under the Buena Onda name. Miami. Documented.',
    href: '/events',
  },
]

type SiteSettingValue = Record<string, unknown>

type SiteSettingRow = {
  key: string
  value: SiteSettingValue | null
}

type LatestRadioEpisode = Pick<Episode, 'title' | 'slug' | 'description' | 'published_at'>

const DEFAULT_HERO = {
  title: 'Buena Onda',
  subtitle: 'An Analog Culture House',
  cta: 'Explore the house',
}

const DEFAULT_SOCIAL = {
  instagram: 'https://instagram.com/buenaondalifestyle',
  mixcloud: '',
  spotify: '',
}

const DEFAULT_CONTACT = {
  email: 'hello@buenaonda.com',
  city: 'Miami, FL',
}

const DEFAULT_NEWSLETTER = {
  enabled: true,
  provider: 'resend',
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback
}

function splitHeroTitle(title: string) {
  const words = title.trim().split(/\s+/).filter(Boolean)
  if (words.length <= 1) return [title, ''] as const
  return [words[0], words.slice(1).join(' ')] as const
}

async function loadHomepageSettings() {
  try {
    const supabase = createPublicClient()
    const { data, error } = await supabase
      .from('site_settings')
      .select('key,value')
      .in('key', ['hero', 'social', 'contact', 'newsletter'])

    if (error) throw error

    const byKey = new Map((data ?? []).map((setting: SiteSettingRow) => [setting.key, setting.value ?? {}]))

    return {
      hero: (byKey.get('hero') ?? {}) as SiteSettingValue,
      social: (byKey.get('social') ?? {}) as SiteSettingValue,
      contact: (byKey.get('contact') ?? {}) as SiteSettingValue,
      newsletter: (byKey.get('newsletter') ?? {}) as SiteSettingValue,
    }
  } catch {
    return {
      hero: DEFAULT_HERO,
      social: DEFAULT_SOCIAL,
      contact: DEFAULT_CONTACT,
      newsletter: DEFAULT_NEWSLETTER,
    }
  }
}

async function loadLatestRadioEpisode() {
  try {
    const supabase = createPublicClient()
    const { data, error } = await supabase
      .from('episodes')
      .select('title,slug,description,published_at')
      .eq('published', true)
      .order('published_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data as LatestRadioEpisode | null
  } catch {
    return null
  }
}

export default async function HomePage() {
  const { hero, social, contact, newsletter } = await loadHomepageSettings()
  const latestRadioEpisode = await loadLatestRadioEpisode()

  const heroTitle = asString(hero.title, DEFAULT_HERO.title)
  const heroSubtitle = asString(hero.subtitle, DEFAULT_HERO.subtitle)
  const [heroLineOne, heroLineTwo] = splitHeroTitle(heroTitle)

  const contactEmail = asString(contact.email, DEFAULT_CONTACT.email)
  const contactCity = asString(contact.city, DEFAULT_CONTACT.city)
  const newsletterEnabled = asBoolean(newsletter.enabled, DEFAULT_NEWSLETTER.enabled)

  const socialLinks = [
    { label: 'Instagram', href: asString(social.instagram, DEFAULT_SOCIAL.instagram) },
    { label: 'Mixcloud', href: asString(social.mixcloud, DEFAULT_SOCIAL.mixcloud) },
    { label: 'Spotify', href: asString(social.spotify, DEFAULT_SOCIAL.spotify) },
  ].filter(link => !!link.href)

  return (
    <>
      <section
        className="relative min-h-screen overflow-hidden grid grid-cols-1 md:grid-cols-[55%_45%] pt-16"
        style={{ background: '#F8F7F3' }}
      >
        <div className="relative flex flex-col justify-center pl-10 md:pl-20 pr-8 md:pr-10 py-20 pb-12 md:py-32">
          <div
            className="absolute left-0 top-0 bottom-0"
            style={{ width: '5px', background: '#1A9E9E' }}
            aria-hidden="true"
          />

          <h1
            className="font-display leading-none mb-6 animate-fade-up"
            style={{ fontSize: 'clamp(5rem, 10vw, 8rem)', animationDelay: '250ms' }}
          >
            <span style={{ color: '#1A9E9E', display: 'block' }}>{heroLineOne}</span>
            {heroLineTwo ? (
              <span style={{ color: '#E8176A', display: 'block' }}>{heroLineTwo}</span>
            ) : null}
          </h1>

          <p
            className="animate-fade-up mb-10"
            style={{
              fontFamily: 'var(--font-sans)',
              fontWeight: 400,
              fontSize: 'clamp(1rem, 1.5vw, 1.3rem)',
              color: '#2F2F2D',
              maxWidth: '26ch',
              lineHeight: 1.55,
              letterSpacing: '0.02em',
              animationDelay: '400ms',
              whiteSpace: 'pre-line',
            }}
          >
            {heroSubtitle}
          </p>

          <div className="animate-fade-up" style={{ animationDelay: '550ms' }}>
            <Link href="/themes" className="btn-hollow-coral">
              Shop Analog →
            </Link>
          </div>

          {socialLinks.length > 0 ? (
            <div className="animate-fade-up flex flex-wrap gap-5 mt-6" style={{ animationDelay: '620ms' }}>
              {socialLinks.map(link => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-sans text-[0.68rem] tracking-[0.22em] uppercase transition-colors hover:text-[var(--hover-color)]"
                  style={{ color: '#2F2F2D', fontWeight: 500, '--hover-color': '#E8176A' } as React.CSSProperties}
                >
                  {link.label} ↗
                </a>
              ))}
            </div>
          ) : null}

          <p
            className="font-sans text-[0.6rem] tracking-[0.3em] uppercase mt-16 animate-fade-up"
            style={{ color: '#2F2F2D', animationDelay: '700ms', fontWeight: 500 }}
          >
            {contactCity}
            {contactEmail ? (
              <>
                {' '}·{' '}
                <a
                  href={`mailto:${contactEmail}`}
                  className="hover:text-[var(--hover-color)] transition-colors"
                  style={{ '--hover-color': '#1A9E9E' } as React.CSSProperties}
                >
                  {contactEmail}
                </a>
              </>
            ) : null}
          </p>

          <div className="md:hidden flex h-2 mt-10 -ml-10 -mr-8" aria-hidden="true">
            <div className="flex-1" style={{ background: '#1A9E9E' }} />
            <div className="flex-1" style={{ background: '#C46D63' }} />
            <div className="flex-1" style={{ background: '#0F6E6E' }} />
            <div className="flex-1" style={{ background: '#E8176A' }} />
          </div>
        </div>

        <div className="relative flex items-center justify-center overflow-hidden px-5 pb-10 md:px-0 md:pb-0">
          <HeroGrid
            images={[]}
            fallback={['/images/hero/01.jpg', '/images/hero/02.jpg', '/images/hero/06.jpg']}
          />
        </div>
      </section>

      <section id="pillars" style={{ background: '#0F6E6E' }}>
        <div className="flex" style={{ height: '8px' }}>
          <div className="flex-1" style={{ background: '#1A9E9E' }} />
          <div className="flex-1" style={{ background: '#C46D63' }} />
          <div className="flex-1" style={{ background: '#0F6E6E' }} />
          <div className="flex-1" style={{ background: '#E8176A' }} />
        </div>

        <div className="max-w-site mx-auto px-5 md:px-10 py-24">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {pillars.map(({ name, headline, text, href }, i) => (
              <ScanReveal key={name} delay={i * 80}>
                <Link
                  href={href}
                  className={`pillar-card ${i % 2 === 0 ? 'pillar-odd' : 'pillar-even'} block p-7 h-full`}
                  style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <div className="inline-block mb-4">
                    <p
                      className="font-display text-white uppercase"
                      style={{ fontSize: '1.4rem', letterSpacing: '0.05em' }}
                    >
                      {name}
                    </p>
                    <div style={{ width: '100%', height: '2px', marginTop: '6px', background: '#E8176A', boxShadow: '0 0 6px #E8176A, 0 0 12px rgba(232,23,106,0.6), 0 0 24px rgba(232,23,106,0.3)' }} />
                  </div>
                  <h3
                    className="font-serif italic mb-4"
                    style={{ color: 'white', fontSize: '1rem', lineHeight: 1.5, fontWeight: 600 }}
                  >
                    {headline}
                  </h3>
                  <p
                    className="font-sans text-sm leading-relaxed mb-6"
                    style={{ color: 'white', fontWeight: 400 }}
                  >
                    {text}
                  </p>
                  <span
                    className="pillar-read font-sans text-xs tracking-[0.15em] uppercase transition-colors duration-200"
                    style={{ color: 'white' }}
                  >
                    Read →
                  </span>
                </Link>
              </ScanReveal>
            ))}
          </div>
        </div>
      </section>

      <div className="vice-strip" />

      <section style={{ background: '#2F2F2D' }}>
        <div className="max-w-site mx-auto px-5 md:px-10 py-20">
          <ScanReveal>
            <div className="grid md:grid-cols-[1fr_auto] gap-12 items-center">
              <div>
                <p
                  className="font-display mb-6"
                  style={{
                    color: '#E8176A',
                    fontSize: '0.75rem',
                    letterSpacing: '0.3em',
                    textShadow: '0 0 8px rgba(232,23,106,0.25)',
                  }}
                >
                  NOW PLAYING
                </p>
                <h2
                  className="font-display text-white mb-4"
                  style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)' }}
                >
                  The signal is always on.
                </h2>
                <p
                  className="font-sans text-sm leading-relaxed mb-10 max-w-xl"
                  style={{ color: '#F8F7F3', fontWeight: 300 }}
                >
                  Curated mixes, live sessions, and field recordings. Front to back.
                </p>
                <Link href="/radio" className="btn-hollow-coral group">
                  Enter the archive
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </Link>
              </div>

              <Link
                href="/radio"
                className="hidden md:block w-72 p-8 transition-colors hover:border-[var(--hover-border-color)] hover:bg-black/10"
                style={{ border: '1px solid rgba(248,247,243,0.1)', '--hover-border-color': '#E8176A' } as React.CSSProperties}
                aria-label={latestRadioEpisode ? `Listen to ${latestRadioEpisode.title}` : 'Radio archive'}
              >
                <p
                  className="font-mono mb-3"
                  style={{ color: 'rgba(232,23,106,0.7)', fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}
                >
                  Radio
                </p>
                {latestRadioEpisode ? (
                  <>
                    <p className="font-display text-white text-lg mb-2 text-balance">
                      {latestRadioEpisode.title}
                    </p>
                    <p className="font-sans text-xs leading-relaxed" style={{ color: '#F8F7F3' }}>
                      {latestRadioEpisode.description?.trim() || 'Published archive live.'}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-display text-white text-lg mb-2">Nothing broadcasting yet.</p>
                    <p className="font-sans text-xs leading-relaxed" style={{ color: '#F8F7F3' }}>
                      The archive is quiet for the moment. Publish an episode in Studio and it will
                      appear here automatically.
                    </p>
                  </>
                )}
              </Link>
            </div>
          </ScanReveal>
        </div>

        <div
          className="h-px opacity-40"
          style={{ background: 'linear-gradient(to right, #E8176A, #08CCFC, #E8176A)' }}
        />
      </section>

      <section className="relative overflow-hidden py-32" style={{ background: '#2F2F2D' }}>
        <div
          className="absolute pointer-events-none"
          aria-hidden="true"
          style={{
            bottom: '-10%',
            left: '-10%',
            width: '50vw',
            height: '50vw',
            background: 'radial-gradient(ellipse, rgba(232,23,106,0.08) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute pointer-events-none"
          aria-hidden="true"
          style={{
            top: '-10%',
            right: '-10%',
            width: '50vw',
            height: '50vw',
            background: 'radial-gradient(ellipse, rgba(8,204,252,0.06) 0%, transparent 70%)',
          }}
        />

        <div className="grain-overlay" aria-hidden="true" />

        <div
          className="absolute pointer-events-none"
          aria-hidden="true"
          style={{ top: '5%', right: '-5%' }}
        >
          <div
            style={{
              width: '28vw',
              height: '28vw',
              border: '1px solid rgba(8,204,252,0.15)',
              boxShadow: '0 0 20px rgba(8,204,252,0.05)',
              borderRadius: '50%',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '20%',
                left: '20%',
                width: '18vw',
                height: '18vw',
                border: '1px solid rgba(196,109,99,0.15)',
                boxShadow: '0 0 15px rgba(196,109,99,0.05)',
                borderRadius: '50%',
              }}
            />
          </div>
        </div>

        <div className="max-w-site mx-auto px-5 md:px-10 relative z-10">
          <ScanReveal>
            <div className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr] gap-16">
              <div>
                <blockquote
                  className="font-display uppercase"
                  style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', color: 'white', lineHeight: 1.1 }}
                >
                  The future already existed. We’re bringing it back.
                </blockquote>
              </div>

              <div className="flex flex-col justify-center">
                <p
                  className="font-sans mb-8"
                  style={{ color: '#F8F7F3', fontWeight: 300, fontSize: '0.9rem', lineHeight: 1.7 }}
                >
                  Buena Onda explores the future as it was once imagined: bold, optimistic, tactile, and built to last. Every object, mix, and story carries that vision forward.
                </p>
                <cite
                  className="font-display not-italic block"
                  style={{
                    fontSize: '0.9rem',
                    color: '#08CCFC',
                    letterSpacing: '0.2em',
                    textShadow: '0 0 8px rgba(8,204,252,0.4)',
                  }}
                >
                  — Buena Onda, {contactCity || 'Miami, FL'}
                </cite>
              </div>
            </div>
          </ScanReveal>
        </div>
      </section>

      <section className="relative" style={{ background: '#2F2F2D' }}>
        <div
          className="h-px opacity-30"
          style={{ background: 'linear-gradient(to right, #E8176A, #08CCFC)' }}
        />

        <div className="max-w-site mx-auto px-5 md:px-10 py-24">
          <ScanReveal>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
              <div>
                <span
                  className="font-display block mb-4"
                  style={{
                    color: '#E8176A',
                    fontSize: '0.75rem',
                    letterSpacing: '0.3em',
                    textShadow: '0 0 8px rgba(232,23,106,0.25)',
                  }}
                >
                  STAY CLOSE
                </span>
                <h2
                  className="font-display text-white uppercase mb-4"
                  style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)' }}
                >
                  Slow mail. Worth reading.
                </h2>
                <p className="font-sans text-sm" style={{ color: '#F8F7F3', fontWeight: 300 }}>
                  Drops, mixes, and what is happening in the house. Curated by hand.
                </p>

                <div className="flex flex-wrap gap-5 mt-8">
                  {contactEmail ? (
                    <a
                      href={`mailto:${contactEmail}`}
                      className="font-sans text-[0.68rem] tracking-[0.22em] uppercase transition-colors hover:text-[var(--hover-color)]"
                      style={{ color: '#F8F7F3', fontWeight: 500, '--hover-color': '#E8176A' } as React.CSSProperties}
                    >
                      {contactEmail}
                    </a>
                  ) : null}
                  {socialLinks.map(link => (
                    <a
                      key={`transmission-${link.label}`}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-sans text-[0.68rem] tracking-[0.22em] uppercase transition-colors hover:text-[var(--hover-color)]"
                      style={{ color: '#F8F7F3', fontWeight: 500, '--hover-color': '#E8176A' } as React.CSSProperties}
                    >
                      {link.label} ↗
                    </a>
                  ))}
                </div>
              </div>

              <div
                className="border-t pt-8 md:border-t-0 md:border-l md:pt-0 pl-0 md:pl-16 flex flex-col justify-center"
                style={{ borderColor: 'rgba(248,247,243,0.08)' }}
              >
                {newsletterEnabled ? (
                  <NewsletterForm layout="stack" variant="dark" />
                ) : (
                    <p className="font-sans text-sm leading-relaxed" style={{ color: '#F8F7F3', fontWeight: 300 }}>
                    The newsletter is paused for now. Reach out at{' '}
                    {contactEmail ? (
                      <a
                        href={`mailto:${contactEmail}`}
                        className="transition-colors hover:text-[var(--hover-color)]"
                        style={{ color: '#F8F7F3', '--hover-color': '#E8176A' } as React.CSSProperties}
                      >
                        {contactEmail}
                      </a>
                    ) : (
                      'the studio email'
                    )}
                    .
                  </p>
                )}
              </div>
            </div>
          </ScanReveal>
        </div>
      </section>
    </>
  )
}
