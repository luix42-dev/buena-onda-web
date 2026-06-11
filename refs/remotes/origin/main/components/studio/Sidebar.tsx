'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

type NavSpec = {
  slug:  string
  label: string
  icon:  ReactNode
}

const NAV: NavSpec[] = [
  {
    slug:  'intake',
    label: 'Intake',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 4h16l-2 10H6z" />
        <path d="M6 14h4a2 2 0 004 0h4v6H6z" />
      </svg>
    ),
  },
  {
    slug:  'catalog',
    label: 'Catalog',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    slug:  'transmission',
    label: 'Transmission',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" />
        <path d="M3 7l9 6 9-6" />
      </svg>
    ),
  },
  {
    slug:  'events',
    label: 'Live Events',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 5h16v14H4z" />
        <path d="M7 9h10M7 13h6" />
        <path d="M8 3v4M16 3v4" />
      </svg>
    ),
  },
  {
    slug:  'radio',
    label: 'Radio',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="2.5" />
        <path d="M7.8 7.8a6 6 0 000 8.4M16.2 7.8a6 6 0 010 8.4M5 5a10 10 0 000 14M19 5a10 10 0 010 14" />
      </svg>
    ),
  },
  {
    slug:  'player',
    label: 'Player',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="1.6" />
        <path d="M12 3v4M12 17v4" />
      </svg>
    ),
  },
  {
    slug:  'culture',
    label: 'Culture',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 3h10l4 4v14H5z" />
        <path d="M15 3v4h4M8 12h8M8 16h6" />
      </svg>
    ),
  },
  {
    slug:  'timeline',
    label: 'Timeline',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 6h14M5 12h14M5 18h10" />
        <circle cx="4" cy="6" r="1.25" />
        <circle cx="4" cy="12" r="1.25" />
        <circle cx="4" cy="18" r="1.25" />
      </svg>
    ),
  },
  {
    slug:  'homepage',
    label: 'Homepage',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 11l9-7 9 7" />
        <path d="M5 10v10h14V10" />
      </svg>
    ),
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()

  async function onLock() {
    await fetch('/studio/logout', { method: 'POST', redirect: 'manual' }).catch(() => {})
    router.push('/studio/login')
    router.refresh()
  }

  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <span className="bo">BUENA ONDA</span>
        <div className="st">Studio</div>
      </div>

      <nav className="nav" aria-label="Studio sections">
        {NAV.map((item) => {
          const href = `/studio/${item.slug}`
          const active =
            pathname === href || pathname?.startsWith(`${href}/`)
          return (
            <Link
              key={item.slug}
              href={href}
              className={`nav-item${active ? ' on' : ''}`}
              data-s={item.slug}
            >
              {item.icon}
              <span className="nm">{item.label}</span>
              <span className="ct" />
            </Link>
          )
        })}
      </nav>

      <div className="sb-foot">
        <a href="https://www.buenaondalifestyle.com" target="_blank" rel="noopener noreferrer">
          View live site ↗
        </a>
        <button type="button" onClick={onLock}>Lock studio</button>
      </div>
    </aside>
  )
}
