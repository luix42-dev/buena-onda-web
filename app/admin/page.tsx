import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Dashboard' }

const quickLinks = [
  { href: '/admin/items/new',  label: 'New Catalog Item', sub: 'Upload photo → draft item'    },
  { href: '/admin/themes/new', label: 'New Theme',        sub: 'Create an editorial spread'   },
  { href: '/admin/posts',      label: 'New Post',         sub: 'Culture essays & dispatches'  },
  { href: '/admin/episodes',   label: 'New Episode',      sub: 'Radio archive'                },
  { href: '/admin/drops',      label: 'New Drop',         sub: 'Objects & limited editions'   },
]

export default function AdminDashboard() {
  return (
    <div>
      <div className="mb-10">
        <p className="archive-label text-[0.65rem] text-stone-grey">Admin Dashboard</p>
        <h1 className="font-display text-near-black text-3xl mt-1">Buena Onda CMS</h1>
      </div>

      {/* Quick actions */}
      <div className="grid md:grid-cols-3 gap-4 mb-12">
        {quickLinks.map(({ href, label, sub }) => (
          <Link
            key={href}
            href={href}
            className="block p-6 border border-pale-stone bg-linen-white hover:border-warm-sand
                       hover:bg-sand-bg transition-colors group paper-hover"
          >
            <p className="archive-label text-[0.6rem] text-warm-sand mb-2">+ Create</p>
            <p className="font-display text-near-black text-xl group-hover:text-burnished transition-colors">
              {label}
            </p>
            <p className="archive-label text-[0.6rem] text-stone-grey mt-2">{sub}</p>
          </Link>
        ))}
      </div>

      {/* Catalog overview */}
      <div className="grid md:grid-cols-2 gap-4 mb-12">
        <Link href="/admin/items"
          className="p-5 border border-pale-stone hover:border-burnished transition-colors">
          <p className="archive-label text-[0.6rem] text-stone-grey mb-1">Catalog</p>
          <p className="font-mono text-sm text-near-black">View all items →</p>
        </Link>
        <Link href="/admin/themes"
          className="p-5 border border-pale-stone hover:border-burnished transition-colors">
          <p className="archive-label text-[0.6rem] text-stone-grey mb-1">Themes</p>
          <p className="font-mono text-sm text-near-black">View all themes →</p>
        </Link>
      </div>

      {/* Setup info */}
      <div className="p-6 border border-pale-stone bg-sand-bg max-w-lg">
        <p className="archive-label text-[0.62rem] mb-3">Setup</p>
        <ul className="flex flex-col gap-2 text-xs text-charcoal font-mono">
          <li>1. Run <code className="text-burnished">supabase/schema.sql</code> then <code className="text-burnished">catalog_migration.sql</code></li>
          <li>2. Set <code className="text-burnished">ADMIN_PASSWORD</code> env var for auth gate</li>
          <li>3. Set Supabase env vars (URL + keys)</li>
          <li>4. Create themes first, then add catalog items</li>
        </ul>
      </div>
    </div>
  )
}
