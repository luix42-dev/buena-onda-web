import type { Metadata } from 'next'
import Link from 'next/link'
import ScanReveal from '@/components/ui/ScanReveal'
import NewsletterForm from '@/components/ui/NewsletterForm'
import HeroGrid from '@/components/HeroGrid'
import { getHeroImages } from '@/lib/getHeroImages'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

export const metadata: Metadata = {
  title: 'Buena Onda - Analog Culture House',
}

export const dynamic = 'force-dynamic'

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
    const supabase = await createClient()
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

export default async function HomePage() {
  const heroPool = getHeroImages()
  const { hero, social, contact, newsletter } = await loadHomepageSettings()

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
        style={{ background: '#FAF8F5' }}
      >
        <div className="relative flex flex-col justify-center pl-10 md:pl-20 pr-8 md:pr-10 py-24 md:py-32">
          <div
            className="absolute left-0 top-0 bottom-0"
            style={{ width: '5px', background: '#A8C9C3' }}
            aria-hidden="true"
          />

          <h1
            className="font-display leading-none mb-6 animate-fade-up"
            style={{ fontSize: 'clamp(5rem, 10vw, 8rem)', animationDelay: '250ms' }}
          >
            <span style={{ color: '#2A9D9D', display: 'block' }}>{heroLineOne}</span>
            {heroLineTwo ? (
              <span style={{ color: '#D4547A', display: 'block' }}>{heroLineTwo}</span>
            ) : null}
          </h1>

          <p
            className="animate-fade-up mb-10"
            style={{
              fontFamily: 'var(--font-sans)',
              fontWeight: 400,
              fontSize: 'clamp(1rem, 1.5vw, 1.3rem)',
              color: '#555',
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
                  className="font-sans text-[0.68rem] tracking-[0.22em] uppercase transition-colors hover:text-[#D4547A]"
                  style={{ color: '#666', fontWeight: 500 }}
                >
                  {link.label} ↗
                </a>
              ))}
            </div>
          ) : null}

          <p
            className="font-sans text-[0.6rem] tracking-[0.3em] uppercase mt-16 animate-fade-up"
            style={{ color: '#AAA', animationDelay: '700ms', fontWeight: 500 }}
          >
            {contactCity}
            {contactEmail ? (
              <>
                {' '}·{' '}
                <a href={`mailto:${contactEmail}`} className="hover:text-[#2A9D9D] transition-colors">
                  {contactEmail}
                </a>
              </>
            ) : null}
          </p>

          <div className="md:hidden flex h-2 mt-10 -ml-10 -mr-8" aria-hidden="true">
            <div className="flex-1" style={{ background: '#2A9D9D' }} />
            <div className="flex-1" style={{ background: '#D9685A' }} />
            <div className="flex-1" style={{ background: '#1A7070' }} />
            <div className="flex-1" style={{ background: '#E8927F' }} />
          </div>
        </div>

        <div className="relative hidden md:flex items-center justify-center overflow-hidden">
          <HeroGrid
            images={heroPool}
            fallback={['/images/hero/01.jpg', '/images/hero/02.jpg', '/images/hero/06.jpg']}
          />

          <div
            className="absolute bottom-8 right-8 animate-fade-up"
            style={{ animationDelay: '650ms' }}
            aria-hidden="true"
          >
            <div style={{ width: '60px', height: '8px', background: '#D9685A', marginBottom: '4px' }} />
            <div style={{ width: '40px', height: '8px', background: '#E8927F', marginBottom: '4px', marginLeft: '20px' }} />
            <div style={{ width: '20px', height: '8px', background: '#F2C4BB', marginLeft: '40px' }} />
          </div>
        </div>
      </section>

      <section id="pillars" style={{ background: '#1A7070' }}>
        <div className="flex" style={{ height: '8px' }}>
          <div className="flex-1" style={{ background: '#2A9D9D' }} />
          <div className="flex-1" style={{ background: '#D9685A' }} />
          <div className="flex-1" style={{ background: '#1A7070' }} />
          <div className="flex-1" style={{ background: '#E8927F' }} />
        </div>

        <div className="max-w-site mx-auto px-5 md:px-10 py-24">
          <ScanReveal>
            <div className="grid md:grid-cols-2 gap-8 mb-16">
              <div>
                <span
                  className="font-display block mb-3"
                  style={{ color: '#7DC8C8', fontSize: '0.75rem', letterSpacing: '0.25em' }}
                >
                  THE HOUSE
                </span>
                <h2 className="font-display text-white" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
                  Four Pillars
                </h2>
              </div>
              <div className="flex items-center">
                <p className="font-sans leading-relaxed" style={{ color: 'white', fontWeight: 400, fontSize: '0.95rem' }}>
                  Four disciplines. Built to last.
                </p>
              </div>
            </div>
          </ScanReveal>

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
                    <div style={{ width: '100%', height: '2px', marginTop: '6px', background: '#FF3C8E', boxShadow: '0 0 6px #FF3C8E, 0 0 12px rgba(255,60,142,0.6), 0 0 24px rgba(255,60,142,0.3)' }} />
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

      <section style={{ background: '#0D0D0D' }}>
        <div className="max-w-site mx-auto px-5 md:px-10 py-20">
          <ScanReveal>
            <div className="grid md:grid-cols-[1fr_auto] gap-12 items-center">
              <div>
                <p
                  className="font-display mb-6"
                  style={{
                    color: '#FF3C8E',
                    fontSize: '0.75rem',
                    letterSpacing: '0.3em',
                    textShadow: '0 0 8px rgba(255,60,142,0.25)',
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
                  style={{ color: '#777', fontWeight: 300 }}
                >
                  Curated mixes, live sessions, and field recordings. Front to back.
                </p>
                <Link href="/radio" className="btn-hollow-coral group">
                  Enter the archive
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </Link>
              </div>

              <div
                className="hidden md:block w-72 p-8"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <p
                  className="font-mono mb-3"
                  style={{ color: 'rgba(255,60,142,0.4)', fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}
                >
                  Radio
                </p>
                <p className="font-display text-white text-lg mb-2">Published archive live</p>
                <p className="font-sans text-xs leading-relaxed" style={{ color: '#555' }}>
                  New episodes appear here as soon as they are published in Studio.
                </p>
              </div>
            </div>
          </ScanReveal>
        </div>

        <div
          className="h-px opacity-40"
          style={{ background: 'linear-gradient(to right, #FF3C8E, #00D4FF, #FF3C8E)' }}
        />
      </section>

      <section className="relative overflow-hidden py-32" style={{ background: '#0D0D0D' }}>
        <div
          className="absolute pointer-events-none"
          aria-hidden="true"
          style={{
            bottom: '-10%',
            left: '-10%',
            width: '50vw',
            height: '50vw',
            background: 'radial-gradient(ellipse, rgba(255,60,142,0.08) 0%, transparent 70%)',
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
            background: 'radial-gradient(ellipse, rgba(0,212,255,0.06) 0%, transparent 70%)',
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
              border: '1px solid rgba(0,212,255,0.15)',
              boxShadow: '0 0 20px rgba(0,212,255,0.05)',
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
                border: '1px solid rgba(255,179,71,0.15)',
                boxShadow: '0 0 15px rgba(255,179,71,0.05)',
                borderRadius: '50%',
              }}
            />
          </div>
        </div>

        <div className="max-w-site mx-auto px-5 md:px-10 relative z-10">
          <ScanReveal>
            <span
              className="font-sans block mb-10"
              style={{ color: '#5ABFBF', fontSize: '0.7rem', letterSpacing: '0.3em', textTransform: 'uppercase' }}
            >
              Manifesto
            </span>

            <div className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr] gap-16">
              <div>
                <blockquote
                  className="font-display uppercase"
                  style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', color: 'white', lineHeight: 1.1 }}
                >
                  The analog world runs forward.
                  <br />It is{' '}
                  <span
                    style={{
                      color: '#FFB347',
                      textShadow: '0 0 10px rgba(255,179,71,0.3)',
                    }}
                  >
                    INEVITABLE.
                  </span>
                </blockquote>
              </div>

              <div className="flex flex-col justify-center">
                <p
                  className="font-sans mb-8"
                  style={{ color: '#777', fontWeight: 300, fontSize: '0.9rem', lineHeight: 1.7 }}
                >
                  We are building a present with weight and duration. Every object, mix, and essay is
                  chosen to outlast the year it was made.
                </p>
                <cite
                  className="font-display not-italic block"
                  style={{
                    fontSize: '0.9rem',
                    color: '#00D4FF',
                    letterSpacing: '0.2em',
                    textShadow: '0 0 8px rgba(0,212,255,0.4)',
                  }}
                >
                  - Buena Onda, {contactCity || 'Miami, FL'}
                </cite>
              </div>
            </div>
          </ScanReveal>
        </div>
      </section>

      <section className="relative" style={{ background: '#161416' }}>
        <div
          className="h-px opacity-30"
          style={{ background: 'linear-gradient(to right, #FF3C8E, #00D4FF)' }}
        />

        <div className="max-w-site mx-auto px-5 md:px-10 py-24">
          <ScanReveal>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
              <div>
                <span
                  className="font-display block mb-4"
                  style={{
                    color: '#FF3C8E',
                    fontSize: '0.75rem',
                    letterSpacing: '0.3em',
                    textShadow: '0 0 8px rgba(255,60,142,0.25)',
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
                <p className="font-sans text-sm" style={{ color: '#777', fontWeight: 300 }}>
                  Drops, mixes, and what is happening in the house. Curated by hand.
                </p>

                <div className="flex flex-wrap gap-5 mt-8">
                  {contactEmail ? (
                    <a
                      href={`mailto:${contactEmail}`}
                      className="font-sans text-[0.68rem] tracking-[0.22em] uppercase transition-colors hover:text-[#FF3C8E]"
                      style={{ color: '#9A9A9A', fontWeight: 500 }}
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
                      className="font-sans text-[0.68rem] tracking-[0.22em] uppercase transition-colors hover:text-[#FF3C8E]"
                      style={{ color: '#9A9A9A', fontWeight: 500 }}
                    >
                      {link.label} ↗
                    </a>
                  ))}
                </div>
              </div>

              <div className="border-l border-white/5 pl-8 md:pl-16 flex flex-col justify-center">
                {newsletterEnabled ? (
                  <NewsletterForm layout="stack" variant="dark" />
                ) : (
                  <p className="font-sans text-sm leading-relaxed" style={{ color: '#777', fontWeight: 300 }}>
                    The newsletter is paused for now. Reach out at{' '}
                    {contactEmail ? (
                      <a href={`mailto:${contactEmail}`} className="text-white transition-colors hover:text-[#FF3C8E]">
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
