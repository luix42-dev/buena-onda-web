'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import SectionHead from '@/components/studio/SectionHead'
import SearchInput from '@/components/studio/SearchInput'
import FilterChip from '@/components/studio/FilterChip'
import StatusPill from '@/components/studio/StatusPill'
import EmptyState from '@/components/studio/EmptyState'
import ItemDrawer from './ItemDrawer'
import type { Item, ItemAvailability, Theme } from './types'

type Props = {
  initialItems: Item[]
  themes:       Theme[]
}

const AVAIL_FILTERS: { label: string; value: ItemAvailability | ''; variant?: 'av' | 're' | 'so' }[] = [
  { label: 'All',       value: ''          },
  { label: 'Available', value: 'available', variant: 'av' },
  { label: 'Reserved',  value: 'reserved',  variant: 're' },
  { label: 'Sold',      value: 'sold',      variant: 'so' },
]

export default function CatalogClient({ initialItems, themes }: Props) {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [items,      setItems]      = useState<Item[]>(initialItems)
  const [drawerItem, setDrawerItem] = useState<Item | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [visible,    setVisible]    = useState<Set<string>>(new Set())

  // URL-reflected filter state
  const [q,           setQRaw]      = useState(searchParams.get('q') ?? '')
  const [availFilter, setAvailRaw]  = useState<ItemAvailability | ''>(
    (searchParams.get('availability') as ItemAvailability) ?? ''
  )
  const [themeFilter, setThemeRaw]  = useState(searchParams.get('theme_id') ?? '')

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pushURL = useCallback((nextQ: string, nextAvail: string, nextTheme: string) => {
    const p = new URLSearchParams()
    if (nextQ)     p.set('q',            nextQ)
    if (nextAvail) p.set('availability', nextAvail)
    if (nextTheme) p.set('theme_id',     nextTheme)
    router.replace(`/studio/catalog${p.size ? `?${p}` : ''}`, { scroll: false })
  }, [router])

  const setQ = (val: string) => {
    setQRaw(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => pushURL(val, availFilter, themeFilter), 300)
  }

  const setAvailFilter = (val: ItemAvailability | '') => {
    setAvailRaw(val)
    pushURL(q, val, themeFilter)
  }

  const setThemeFilter = (val: string) => {
    setThemeRaw(val)
    pushURL(q, availFilter, val)
  }

  // Filtered items (client-side)
  const filtered = items.filter(item => {
    if (q           && !item.title.toLowerCase().includes(q.toLowerCase())) return false
    if (availFilter && item.availability !== availFilter)                    return false
    if (themeFilter && item.theme_id     !== themeFilter)                   return false
    return true
  })

  // Staggered card enter animation
  useEffect(() => {
    const ids = filtered.map(i => i.id)
    let idx = 0
    const next = () => {
      if (idx >= ids.length) return
      setVisible(prev => new Set([...prev, ids[idx]]))
      idx++
      requestAnimationFrame(() => setTimeout(next, 16))
    }
    requestAnimationFrame(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, availFilter, themeFilter, q])

  const openDrawer = (item: Item | null) => {
    setDrawerItem(item)
    setDrawerOpen(true)
  }

  const handleSave = (saved: Item) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === saved.id)
      if (idx === -1) return [saved, ...prev]
      const next = [...prev]
      next[idx] = saved
      return next
    })
    setDrawerOpen(false)
  }

  const handleDelete = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
    setDrawerOpen(false)
  }

  return (
    <>
      <SectionHead
        title="The Catalog"
        subtitle="Every piece in the house"
        actionLabel="+ New piece"
        onAction={() => openDrawer(null)}
      />

      <div className="toolbar">
        <SearchInput value={q} onChange={setQ} placeholder="Search pieces…" />
        <div className="chips">
          {AVAIL_FILTERS.map(f => (
            <FilterChip
              key={f.value}
              active={availFilter === f.value}
              variant={f.variant}
              onClick={() => setAvailFilter(f.value)}
            >
              {f.label}
            </FilterChip>
          ))}
        </div>
        {themes.length > 0 && (
          <div className="chips">
            {themes.map(t => (
              <FilterChip
                key={t.id}
                active={themeFilter === t.id}
                onClick={() => setThemeFilter(themeFilter === t.id ? '' : t.id)}
              >
                {t.code} {t.title}
              </FilterChip>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No pieces found."
          message={items.length === 0 ? 'Add your first piece with "+ New piece".' : 'Try adjusting your filters.'}
        />
      ) : (
        <div className="grid">
          {filtered.map(item => (
            <div
              key={item.id}
              className={[
                'card',
                visible.has(item.id) ? 'in' : '',
                item.availability === 'sold' ? 'sold' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => openDrawer(item)}
            >
              <div className="thumb" style={{ background: 'var(--paper-2)' }}>
                {item.cover_image_url && (
                  <Image
                    src={item.cover_image_url}
                    alt={item.title}
                    fill
                    sizes="(max-width: 820px) 50vw, 25vw"
                    style={{ objectFit: 'cover' }}
                  />
                )}
                <StatusPill variant={item.availability} />
                {item.catalog_number && (
                  <span className="idx">{item.catalog_number}</span>
                )}
              </div>
              <div className="meta">
                {item.theme && <div className="theme">{item.theme.code}</div>}
                <div className="ttl">{item.title}</div>
                {item.price != null ? (
                  <div className="price">${item.price}</div>
                ) : (
                  <div className="price none">No price</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ItemDrawer
        item={drawerItem}
        themes={themes}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </>
  )
}
