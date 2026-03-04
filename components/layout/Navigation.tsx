'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
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

  // close menu on route change
  useEffect(() => { setOpen(false) }, [pathname])

  // trap focus / close on Escape
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
            ? 'bg-cream/90 backdrop-blur-sm shadow-[0_1px_0_rgba(192,168,128,0.2)]'
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.svg"
              alt="Buena Onda"
              style={{ height: '36px', width: 'auto' }}
              className="block"
            />
            <span className="archive-label text-[0.55rem] tracking-[0.2em] mt-1">
              AN ANALOG CULTURE HOUSE
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={[
                  'font-mono text-[0.7rem] tracking-[0.18em] uppercase transition-colors duration-200',
                  isActive(href)
                    ? 'text-near-black'
                    : 'text-stone-grey hover:text-burnished',
                ].join(' ')}
              >
                {label}
                {isActive(href) && (
                  <span className="block h-px bg-warm-sand mt-0.5 w-full" />
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
                'block h-px w-6 bg-near-black transition-all duration-300',
                open ? 'translate-y-[6px] rotate-45' : '',
              ].join(' ')}
            />
            <span
              className={[
                'block h-px w-6 bg-near-black transition-all duration-300',
                open ? 'opacity-0' : '',
              ].join(' ')}
            />
            <span
              className={[
                'block h-px w-6 bg-near-black transition-all duration-300',
                open ? '-translate-y-[6px] -rotate-45' : '',
              ].join(' ')}
            />
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      <div
        className={[
          'fixed inset-0 z-40 bg-cream flex flex-col justify-center px-8',
          'transition-all duration-400 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        aria-hidden={!open}
      >
        <nav className="flex flex-col gap-6">
          {links.map(({ href, label }, i) => (
            <Link
              key={href}
              href={href}
              className={[
                'font-display text-[2.2rem] leading-none transition-colors duration-200',
                isActive(href) ? 'text-burnished' : 'text-near-black hover:text-terracotta',
                open ? 'animate-fade-up' : 'opacity-0',
              ].join(' ')}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="mt-12">
          <p className="archive-label text-[0.6rem]">Miami · Est. 2019</p>
        </div>
      </div>
    </>
  )
}
