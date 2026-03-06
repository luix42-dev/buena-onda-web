import Link from 'next/link'
import FooterNewsletter from './FooterNewsletter'

const navLinks = [
  { href: '/about',   label: 'About'   },
  { href: '/culture', label: 'Culture' },
  { href: '/themes',  label: 'Catalog' },
  { href: '/radio',   label: 'Radio'   },
  { href: '/search',  label: 'Search'  },
  { href: '/contact', label: 'Contact' },
]

const socialLinks = [
  { href: 'https://instagram.com/buenaondalifestyle', label: 'Instagram' },
  { href: '#',                                        label: 'Mixcloud'  },
  { href: '#',                                        label: 'SoundCloud' },
]

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-near-black text-pale-stone">
      {/* Top band */}
      <div className="max-w-site mx-auto px-5 md:px-10 pt-16 pb-12 grid grid-cols-1 md:grid-cols-3 gap-10">

        {/* Brand column */}
        <div className="flex flex-col gap-4">
          <Link href="/" className="inline-block group">
            <span className="font-display text-[1.5rem] text-cream leading-none tracking-[-0.03em] group-hover:text-warm-sand transition-colors">
              Buena Onda
            </span>
            <br />
            <span className="archive-label text-[0.55rem] tracking-[0.2em] text-stone-grey mt-0.5 block">
              An Analog Culture House
            </span>
          </Link>
          <p className="text-stone-grey text-sm leading-relaxed max-w-[22ch]">
            Music, objects, and a lifestyle built to last. Based in Miami.
          </p>
        </div>

        {/* Nav column */}
        <div>
          <p className="archive-label mb-4">Navigate</p>
          <ul className="flex flex-col gap-2">
            {navLinks.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="font-mono text-xs tracking-wider text-stone-grey hover:text-warm-sand transition-colors uppercase"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Social + newsletter column */}
        <div className="flex flex-col gap-6">
          <div>
            <p className="archive-label mb-4">Follow</p>
            <ul className="flex flex-col gap-2">
              {socialLinks.map(({ href, label }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs tracking-wider text-stone-grey hover:text-warm-sand transition-colors uppercase"
                  >
                    {label} ↗
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="archive-label mb-3">Newsletter</p>
            <FooterNewsletter />
          </div>
        </div>
      </div>

      {/* Bottom band */}
      <div className="border-t border-charcoal/40">
        <div className="max-w-site mx-auto px-5 md:px-10 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="archive-label text-[0.6rem] text-charcoal">
            © {year} Buena Onda · Miami, FL · All rights reserved
          </p>
          <div className="flex gap-5">
            <Link href="/privacy" className="archive-label text-[0.6rem] text-charcoal hover:text-stone-grey transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="archive-label text-[0.6rem] text-charcoal hover:text-stone-grey transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
