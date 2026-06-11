'use client'

import { useEffect, useState } from 'react'
import { useToast } from '@/components/studio/Toast'
import { getHeroImages } from '@/lib/getHeroImages'

type Props = {
  heroPool: string[]
  hero: Record<string, unknown>
  social: Record<string, unknown>
  contact: Record<string, unknown>
  newsletter: Record<string, unknown>
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback
}

export default function HomepageClient({
  heroPool,
  hero,
  social,
  contact,
  newsletter,
}: Props) {
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [heroTitle, setHeroTitle] = useState(asString(hero.title, 'Buena Onda'))
  const [heroSubtitle, setHeroSubtitle] = useState(asString(hero.subtitle, 'An Analog Culture House'))
  const [heroCta, setHeroCta] = useState(asString(hero.cta, 'Read Culture'))
  const [instagram, setInstagram] = useState(asString(social.instagram))
  const [mixcloud, setMixcloud] = useState(asString(social.mixcloud))
  const [spotify, setSpotify] = useState(asString(social.spotify))
  const [email, setEmail] = useState(asString(contact.email, 'hello@buenaonda.com'))
  const [city, setCity] = useState(asString(contact.city, 'Miami, FL'))
  const [newsletterEnabled, setNewsletterEnabled] = useState(asBoolean(newsletter.enabled, true))
  const [newsletterProvider, setNewsletterProvider] = useState(asString(newsletter.provider, 'resend'))
  const [loadedHeroPool, setLoadedHeroPool] = useState(heroPool)

  useEffect(() => {
    let mounted = true

    getHeroImages()
      .then(images => {
        if (mounted) setLoadedHeroPool(images)
      })
      .catch(() => {})

    return () => {
      mounted = false
    }
  }, [])

  const save = async () => {
    setSaving(true)
    const res = await fetch('/api/admin/site-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hero: { title: heroTitle, subtitle: heroSubtitle, cta: heroCta },
        social: { instagram, mixcloud, spotify },
        contact: { email, city },
        newsletter: { enabled: newsletterEnabled, provider: newsletterProvider },
      }),
    })
    setSaving(false)

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast((err as { error?: string }).error ?? 'Could not save homepage settings.')
      return
    }

    toast('Homepage settings saved.')
  }

  return (
    <>
      <div className="hp">
        <div className="hpcard in">
          <div className="hk">Schema</div>
          <div className="hl">Using existing `site_settings`</div>
          <div className="hs">
            The public homepage is still static JSX, but the hero, social, contact, and newsletter
            settings are editable here without introducing a new table.
          </div>
          <div className="hb">
            <span className="hvis">No migration needed</span>
            <span className="hvis">{loadedHeroPool.length} hero images found</span>
          </div>
        </div>

        <div className="hpcard in">
          <div className="hk">Save</div>
          <div className="hl">Edit settings inline</div>
          <div className="hs">
            Changes update the existing `site_settings` rows for hero, social, contact, and newsletter.
          </div>
          <div className="hb">
            <span className="hvis">Direct write to `site_settings`</span>
            <button type="button" className="btn coral" onClick={save} disabled={saving}>
              {saving ? 'Saving...' : 'Save settings'}
            </button>
          </div>
        </div>
      </div>

      <div className="hp" style={{ marginTop: 18 }}>
        <div className="hpcard in">
          <div className="hk">Hero</div>
          <div className="field">
            <label htmlFor="hp-hero-title">Title</label>
            <input id="hp-hero-title" type="text" value={heroTitle} onChange={e => setHeroTitle(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="hp-hero-subtitle">Subtitle</label>
            <textarea id="hp-hero-subtitle" rows={3} value={heroSubtitle} onChange={e => setHeroSubtitle(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="hp-hero-cta">CTA</label>
            <input id="hp-hero-cta" type="text" value={heroCta} onChange={e => setHeroCta(e.target.value)} />
          </div>
        </div>

        <div className="hpcard in">
          <div className="hk">Social</div>
          <div className="field">
            <label htmlFor="hp-instagram">Instagram</label>
            <input id="hp-instagram" type="text" value={instagram} onChange={e => setInstagram(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="hp-mixcloud">Mixcloud</label>
            <input id="hp-mixcloud" type="text" value={mixcloud} onChange={e => setMixcloud(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="hp-spotify">Spotify</label>
            <input id="hp-spotify" type="text" value={spotify} onChange={e => setSpotify(e.target.value)} />
          </div>
        </div>

        <div className="hpcard in">
          <div className="hk">Contact</div>
          <div className="field">
            <label htmlFor="hp-email">Email</label>
            <input id="hp-email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="hp-city">City</label>
            <input id="hp-city" type="text" value={city} onChange={e => setCity(e.target.value)} />
          </div>
        </div>

        <div className="hpcard in">
          <div className="hk">Newsletter</div>
          <div className="field">
            <label htmlFor="hp-newsletter-enabled">Enabled</label>
            <input
              id="hp-newsletter-enabled"
              type="checkbox"
              checked={newsletterEnabled}
              onChange={e => setNewsletterEnabled(e.target.checked)}
            />
          </div>
          <div className="field">
            <label htmlFor="hp-provider">Provider</label>
            <input
              id="hp-provider"
              type="text"
              value={newsletterProvider}
              onChange={e => setNewsletterProvider(e.target.value)}
            />
          </div>
        </div>
      </div>
    </>
  )
}
