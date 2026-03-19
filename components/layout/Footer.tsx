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
]

const swatches = [
  { color: '#2A9D9D', label: 'teal',      href: '/themes',  title: 'Catalog'  },
  { color: '#D9685A', label: 'coral',     href: '/radio',   title: 'Radio'    },
  { color: '#2E2E2E', label: 'charcoal',  href: '/culture', title: 'Culture'  },
  { color: '#FF3C8E', label: 'neon-pink', href: '/about',   title: 'About'    },
  { color: '#00D4FF', label: 'neon-blue', href: '/contact', title: 'Contact'  },
]

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer style={{ background: 'var(--warm-page)' }}>
      {/* Editorial rule top */}
      <div className="editorial-rule" />

      {/* Main band */}
      <div className="max-w-site mx-auto px-5 md:px-10 pt-16 pb-12 grid grid-cols-1 md:grid-cols-3 gap-10">

        {/* Brand column */}
        <div className="flex flex-col gap-4">
          <Link href="/" className="inline-block group">
            <span
              className="text-[1.5rem] leading-none tracking-[-0.03em] transition-colors"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--charcoal)' }}
            >
              Buena Onda
            </span>
            <br />
            <span
              className="text-[0.55rem] tracking-[0.2em] mt-0.5 block uppercase"
              style={{ fontFamily: 'var(--font-sans)', color: 'var(--gray-muted)' }}
            >
              Analog Culture House
            </span>
          </Link>
          <p className="text-sm leading-relaxed max-w-[22ch]" style={{ color: 'var(--gray)' }}>
            Music, objects, and a lifestyle built to last. Based in Miami.
          </p>

          {/* Palette swatches */}
          <div className="flex gap-2 mt-2" aria-label="Brand palette">
            {swatches.map(({ color, label, href, title }) => (
              <Link
                key={label}
                href={href}
                title={title}
                aria-label={title}
                style={{ background: color, width: 14, height: 14, display: 'block', flexShrink: 0 }}
                className="hover:scale-125 transition-transform duration-200"
              />
            ))}
          </div>
        </div>

        {/* Nav column */}
        <div>
          <p
            className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase mb-4"
            style={{ fontFamily: 'var(--font-sans)', color: 'var(--teal)' }}
          >
            Navigate
          </p>
          <ul className="flex flex-col gap-2">
            {navLinks.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="text-xs tracking-wider uppercase transition-colors hover:text-coral"
                  style={{ fontFamily: 'var(--font-sans)', color: 'var(--gray)' }}
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
            <p
              className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase mb-4"
              style={{ fontFamily: 'var(--font-sans)', color: 'var(--teal)' }}
            >
              Follow
            </p>
            <ul className="flex flex-col gap-2">
              {socialLinks.map(({ href, label }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs tracking-wider uppercase transition-colors hover:text-coral"
                    style={{ fontFamily: 'var(--font-sans)', color: 'var(--gray)' }}
                  >
                    {label} ↗
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p
              className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase mb-3"
              style={{ fontFamily: 'var(--font-sans)', color: 'var(--teal)' }}
            >
              Newsletter
            </p>
            <FooterNewsletter />
          </div>
        </div>
      </div>

      {/* Bottom band */}
      <div className="border-t" style={{ borderColor: 'rgba(42,157,157,0.2)' }}>
        <div className="max-w-site mx-auto px-5 md:px-10 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p
            className="text-[0.6rem] tracking-[0.15em] uppercase"
            style={{ fontFamily: 'var(--font-sans)', color: 'var(--gray-dark)' }}
          >
            © {year} Buena Onda · Miami, FL · All rights reserved
          </p>
          <div className="flex gap-5">
            <Link
              href="/privacy"
              className="text-[0.6rem] tracking-[0.15em] uppercase transition-colors hover:text-gray"
              style={{ fontFamily: 'var(--font-sans)', color: 'var(--gray-dark)' }}
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-[0.6rem] tracking-[0.15em] uppercase transition-colors hover:text-gray"
              style={{ fontFamily: 'var(--font-sans)', color: 'var(--gray-dark)' }}
            >
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
