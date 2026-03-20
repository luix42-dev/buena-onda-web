'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/',            label: 'Home'      },
  { href: '/about',       label: 'About'     },
  { href: '/culture',     label: 'Culture'   },
  { href: '/themes',      label: 'Catalog'   },
  { href: '/radio',       label: 'Radio'     },
  { href: '/contact',     label: 'Contact'   },
]

export default function Navigation() {
  const pathname   = usePathname()
  const [open, setOpen]           = useState(false)
  const [scrolled, setScrolled]   = useState(false)
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <>
      <header
        ref={navRef}
        className={[
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          scrolled
            ? 'bg-warm-page/95 backdrop-blur-sm shadow-[0_1px_0_rgba(42,157,157,0.15)]'
            : 'bg-transparent',
        ].join(' ')}
      >
        <div className="max-w-site mx-auto px-5 md:px-10 h-[64px] flex items-center justify-between">

          {/* Logo */}
          <Link
            href="/"
            className="flex flex-col leading-none group"
            aria-label="Buena Onda — Home"
          >
            <Image
              src="/NEW LOGO BUENA ONDA revectorized OG COLOR.png"
              alt="Buena Onda"
              width={160}
              height={40}
              style={{ height: '40px', width: 'auto' }}
              className="block"
              priority
            />
            <span
              className="text-[0.55rem] tracking-[0.2em] mt-1 uppercase"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--teal-light)' }}
            >
              ANALOG CULTURE HOUSE
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={[
                  'text-[0.7rem] tracking-[0.3em] uppercase font-semibold transition-colors duration-200',
                  isActive(href)
                    ? 'text-charcoal'
                    : 'text-gray hover:text-teal',
                ].join(' ')}
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                {label}
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
              </Link>
            ))}
          </nav>

          {/* Hamburger */}
          <button
            className="md:hidden flex flex-col gap-[5px] p-2 -mr-2"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <span
              className={[
                'block h-px w-6 transition-all duration-300',
                open ? 'translate-y-[6px] rotate-45' : '',
              ].join(' ')}
              style={{ background: 'var(--charcoal)' }}
            />
            <span
              className={[
                'block h-px w-6 transition-all duration-300',
                open ? 'opacity-0' : '',
              ].join(' ')}
              style={{ background: 'var(--charcoal)' }}
            />
            <span
              className={[
                'block h-px w-6 transition-all duration-300',
                open ? '-translate-y-[6px] -rotate-45' : '',
              ].join(' ')}
              style={{ background: 'var(--charcoal)' }}
            />
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      <div
        className={[
          'fixed inset-0 z-40 flex flex-col justify-center px-8',
          'transition-all duration-400 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        style={{ background: 'var(--warm-page)' }}
        aria-hidden={!open}
      >
        <nav className="flex flex-col gap-6">
          {links.map(({ href, label }, i) => (
            <Link
              key={href}
              href={href}
              className={[
                'text-[2.2rem] leading-none uppercase transition-colors duration-200',
                isActive(href) ? 'text-teal' : 'text-charcoal hover:text-teal',
                open ? 'animate-fade-up' : 'opacity-0',
              ].join(' ')}
              style={{ fontFamily: 'var(--font-display)', animationDelay: `${i * 60}ms` }}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="mt-12">
          <p className="text-[0.6rem] tracking-[0.2em] uppercase text-gray" style={{ fontFamily: 'var(--font-sans)' }}>
            Miami · Est. 2014
          </p>
        </div>
      </div>
    </>
  )
}
