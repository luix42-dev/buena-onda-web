import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ScanReveal from '@/components/ui/ScanReveal'
import { createClient } from '@/lib/supabase/server'
import type { Item, ItemImage, Theme } from '@/types'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('items')
      .select('title, description, catalog_number')
      .eq('slug', slug)
      .eq('status', 'published')
      .single()
    if (data) {
      return {
        title:       `${data.catalog_number ? `${data.catalog_number} — ` : ''}${data.title}`,
        description: data.description ?? undefined,
      }
    }
  } catch { /* noop */ }
  return { title: 'Catalog Item' }
}

export default async function ItemPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: itemData } = await supabase
    .from('items')
    .select('*, theme:themes(*), images:item_images(*)')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!itemData) notFound()

  const item   = itemData as Item
  const theme  = itemData.theme  as Theme | null
  const images = (itemData.images as ItemImage[] | null) ?? []
  const allImages = [
    ...(item.cover_image_url
      ? [{ id: 'cover', url: item.cover_image_url, alt_text: item.title, sort_order: -1 }]
      : []),
    ...images.filter(img => img.url !== item.cover_image_url),
  ]

  const details = item.details as Record<string, string> | null ?? {}

  return (
    <>
      {/* ── Museum record ────────────────────────────────────────────────────── */}
      <div className="pt-32 pb-32 bg-cream">
        <div className="max-w-site mx-auto px-5 md:px-10">

          {/* Breadcrumb */}
          <ScanReveal>
            <div className="flex gap-2 items-center mb-16 font-mono text-xs text-stone-grey">
              <Link href="/themes" className="hover:text-burnished transition-colors">Catalog</Link>
              {theme && (
                <>
                  <span>/</span>
                  <Link href={`/themes/${theme.slug}`}
                    className="hover:text-burnished transition-colors">
                    {theme.title}
                  </Link>
                </>
              )}
              <span>/</span>
              <span className="text-near-black">{item.title}</span>
            </div>
          </ScanReveal>

          {/* ── Main two-column layout ──────────────────────────────────────── */}
          <div className="grid md:grid-cols-[1fr_1fr] gap-16 lg:gap-24 items-start">

            {/* ── Left: Primary image ─────────────────────────────────────── */}
            <div>
              {allImages.length > 0 ? (
                <>
                  <ScanReveal>
                    <div className="aspect-[3/4] bg-sand-bg overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={allImages[0].url}
                        alt={allImages[0].alt_text ?? item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </ScanReveal>

                  {/* Additional thumbnails — horizontal strip */}
                  {allImages.length > 1 && (
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {allImages.slice(1, 5).map((img, i) => (
                        <ScanReveal key={img.id ?? i} delay={i * 50}>
                          <div className="aspect-square bg-sand-bg overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img.url}
                              alt={img.alt_text ?? item.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </ScanReveal>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <ScanReveal>
                  <div className="aspect-[3/4] bg-sand-bg flex items-center justify-center">
                    <span className="catalog-ordinal">No image</span>
                  </div>
                </ScanReveal>
              )}
            </div>

            {/* ── Right: Archive record ───────────────────────────────────── */}
            <div>

              {/* Catalog number — large design element */}
              {item.catalog_number && (
                <ScanReveal>
                  <p
                    className="font-mono text-warm-sand/60 tracking-[0.3em] mb-8 select-none"
                    style={{ fontSize: 'clamp(0.65rem, 1.2vw, 0.85rem)' }}
                  >
                    {item.catalog_number}
                  </p>
                </ScanReveal>
              )}

              {/* Theme link */}
              {theme && (
                <ScanReveal>
                  <Link
                    href={`/themes/${theme.slug}`}
                    className="catalog-ordinal text-warm-sand hover:text-burnished transition-colors block mb-4"
                  >
                    {theme.title}
                  </Link>
                </ScanReveal>
              )}

              {/* Title */}
              <ScanReveal delay={80}>
                <h1
                  className="font-display text-near-black mb-6 text-balance"
                  style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', lineHeight: 1.05 }}
                >
                  {item.title}
                </h1>
              </ScanReveal>

              {/* Price */}
              {item.price && (
                <ScanReveal delay={100}>
                  <p className="font-mono text-charcoal mb-8" style={{ fontSize: '1.05rem' }}>
                    ${item.price.toFixed(2)}
                  </p>
                </ScanReveal>
              )}

              <div className="editorial-rule mb-0" />

              {/* Description */}
              {item.description && (
                <ScanReveal delay={120}>
                  <div className="py-8">
                    <p className="editorial-body">{item.description}</p>
                  </div>
                  <div className="editorial-rule" />
                </ScanReveal>
              )}

              {/* Archive details — catalog-field rows */}
              {Object.keys(details).length > 0 && (
                <ScanReveal delay={150}>
                  <div className="py-2">
                    {Object.entries(details).map(([key, val]) => (
                      <div key={key} className="catalog-field">
                        <span className="archive-label text-[0.6rem] text-stone-grey capitalize">
                          {key}
                        </span>
                        <span className="font-mono text-xs text-near-black">{val}</span>
                      </div>
                    ))}
                  </div>
                </ScanReveal>
              )}

              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <ScanReveal delay={170}>
                  <div className="py-8 flex flex-wrap gap-x-6 gap-y-2">
                    {item.tags.map(tag => (
                      <Link key={tag} href={`/search?q=${encodeURIComponent(tag)}`}
                        className="catalog-ordinal text-stone-grey hover:text-burnished transition-colors">
                        {tag}
                      </Link>
                    ))}
                  </div>
                  <div className="editorial-rule" />
                </ScanReveal>
              )}

              {/* CTA — understated underline links, not block buttons */}
              <ScanReveal delay={200}>
                <div className="pt-10 flex flex-wrap gap-x-10 gap-y-4 items-baseline">
                  {item.buy_url ? (
                    <a
                      href={item.buy_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cta"
                    >
                      Acquire this object →
                    </a>
                  ) : (
                    <a href="mailto:hello@buenaonda.com" className="text-cta">
                      Enquire →
                    </a>
                  )}
                  {theme && (
                    <Link href={`/themes/${theme.slug}`} className="text-cta" style={{ color: 'var(--stone-grey)', borderColor: 'var(--stone-grey)' }}>
                      View theme
                    </Link>
                  )}
                </div>
              </ScanReveal>

            </div>
          </div>
        </div>
      </div>
    </>
  )
}
