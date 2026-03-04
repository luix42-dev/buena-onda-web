import type { Metadata } from 'next'
import Link from 'next/link'
import AdminLogout from './AdminLogout'

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s | Admin — Buena Onda' },
  robots: { index: false, follow: false },
}

const sidebarLinks = [
  { href: '/admin',               label: '00 · Dashboard' },
  { href: '/admin/themes',        label: '01 · Themes'    },
  { href: '/admin/items',         label: '02 · Catalog'   },
  { href: '/admin/posts',         label: '03 · Posts'     },
  { href: '/admin/episodes',      label: '04 · Episodes'  },
  { href: '/admin/drops',         label: '05 · Drops'     },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-cream font-mono">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-sand-bg border-r border-pale-stone
                        fixed left-0 top-0 bottom-0 z-40">
        {/* Logo */}
        <div className="px-5 py-6 border-b border-pale-stone">
          <Link href="/" className="block">
            <span className="font-display text-near-black text-base">Buena Onda</span>
            <span className="archive-label text-[0.58rem] text-stone-grey block mt-0.5">
              Admin Panel
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          {sidebarLinks.map(({ href, label }) => (
            <Link key={href} href={href} className="admin-sidebar-link">
              {label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-pale-stone flex flex-col gap-2">
          <Link
            href="/"
            className="archive-label text-[0.6rem] text-stone-grey hover:text-burnished transition-colors"
          >
            ← Back to site
          </Link>
          <AdminLogout />
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 md:ml-56 p-6 md:p-10 max-w-5xl">
        {children}
      </main>
    </div>
  )
}
