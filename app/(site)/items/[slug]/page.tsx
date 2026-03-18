import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ScanReveal from '@/components/ui/ScanReveal'
import ImageGallery from '@/components/ui/ImageGallery'
import ReserveForm from '@/components/ui/ReserveForm'
import SoldNotifyForm from '@/components/ui/SoldNotifyForm'
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
      .in('status', ['published', 'sold_out', 'archived'])
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

// Ordered detail fields to display
const DETAIL_FIELDS: { key: string; label: string }[] = [
  { key: 'era',        label: 'Era'        },
  { key: 'dimensions', label: 'Dimensions' },
  { key: 'material',   label: 'Material'   },
  { key: 'condition',  label: 'Condition'  },
  { key: 'origin',     label: 'Origin'     },
]

export default async function ItemPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  // Fetch item — visible in all non-draft states
  const { data: itemData } = await supabase
    .from('items')
    .select('*, theme:themes(*), images:item_images(*)')
    .eq('slug', slug)
    .in('status', ['published', 'sold_out', 'archived'])
    .single()

  if (!itemData) notFound()

  const item   = itemData as Item
  const theme  = itemData.theme  as Theme | null
  const images = (itemData.images as ItemImage[] | null) ?? []
  const details = (item.details as Record<string, string> | null) ?? {}

  const isSold = item.status === 'sold_out' || item.status === 'archived'

  // "From the Catalog" — up to 3 other published items, same theme first
  let related: Item[] = []
  if (theme) {
    const { data: sameTheme } = await supabase
      .from('items')
      .select('id, title, slug, price, cover_image_url, catalog_number')
      .eq('status', 'published')
      .eq('theme_id', theme.id)
      .neq('id', item.id)
      .order('published_at', { ascending: false })
      .limit(3)
    related = (sameTheme ?? []) as Item[]
  }

  // Fill up to 3 with other recent published items if needed
  if (related.length < 3) {
    const exclude = [item.id, ...related.map(r => r.id)]
    const { data: others } = await supabase
      .from('items')
      .select('id, title, slug, price, cover_image_url, catalog_number')
      .eq('status', 'published')
      .not('id', 'in', `(${exclude.join(',')})`)
      .order('published_at', { ascending: false })
      .limit(3 - related.length)
    related = [...related, ...((others ?? []) as Item[])]
  }

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

            {/* ── Left: Image gallery ──────────────────────────────────────── */}
            <ScanReveal>
              <ImageGallery
                images={images}
                coverUrl={item.cover_image_url}
                title={item.title}
                isSold={isSold}
              />
            </ScanReveal>

            {/* ── Right: Archive record ────────────────────────────────────── */}
            <div>

              {/* Catalog number */}
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

              {/* Price + shipping badge */}
              {item.price && (
                <ScanReveal delay={100}>
                  <div className="mb-8">
                    <p className="font-mono text-charcoal" style={{ fontSize: '1.05rem' }}>
                      ${item.price.toFixed(2)}
                    </p>
                    <p className="font-mono text-xs text-stone-grey mt-1 tracking-wide">
                      📍 Free Delivery — Miami &amp; Surroundings
                    </p>
                  </div>
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

              {/* Structured details block */}
              <ScanReveal delay={140}>
                <div className="py-2">
                  {DETAIL_FIELDS.map(({ key, label }) =>
                    details[key] ? (
                      <div key={key} className="catalog-field">
                        <span className="archive-label text-[0.6rem] text-stone-grey">{label}</span>
                        <span className="font-mono text-xs text-near-black">{details[key]}</span>
                      </div>
                    ) : null
                  )}
                  {item.catalog_number && (
                    <div className="catalog-field">
                      <span className="archive-label text-[0.6rem] text-stone-grey">Catalog No.</span>
                      <span className="font-mono text-xs text-near-black">{item.catalog_number}</span>
                    </div>
                  )}
                </div>
              </ScanReveal>

              {/* "Why We Chose This" */}
              {details.why_we_chose_this && (
                <ScanReveal delay={160}>
                  <div className="py-8 border-t border-pale-stone">
                    <p className="archive-label text-[0.58rem] text-stone-grey mb-3">
                      Why We Chose This
                    </p>
                    <p className="editorial-body text-sm leading-relaxed">
                      {details.why_we_chose_this}
                    </p>
                  </div>
                </ScanReveal>
              )}

              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <ScanReveal delay={170}>
                  <div className="py-8 flex flex-wrap gap-x-6 gap-y-2 border-t border-pale-stone">
                    {item.tags.map(tag => (
                      <Link key={tag} href={`/search?q=${encodeURIComponent(tag)}`}
                        className="catalog-ordinal text-stone-grey hover:text-burnished transition-colors">
                        {tag}
                      </Link>
                    ))}
                  </div>
                </ScanReveal>
              )}

              {/* CTA section */}
              <ScanReveal delay={200}>
                <div className="pt-8 border-t border-pale-stone">

                  {/* Guarantee line */}
                  <p className="font-mono text-[0.68rem] text-stone-grey leading-relaxed mb-6 max-w-xs">
                    Every object is personally sourced, condition-verified, and delivered by our team in Miami.
                  </p>

                  {/* Reserve / Sold notify */}
                  {isSold ? (
                    <SoldNotifyForm itemId={item.id} />
                  ) : (
                    <>
                      <ReserveForm itemId={item.id} itemTitle={item.title} />
                      {/* Return policy */}
                      <p className="font-mono text-[0.62rem] text-stone-grey mt-4">
                        7-day return policy. No questions asked.
                      </p>
                    </>
                  )}

                  {/* View theme link */}
                  {theme && (
                    <div className="mt-6">
                      <Link href={`/themes/${theme.slug}`}
                        className="font-mono text-xs text-stone-grey hover:text-burnished
                                   transition-colors underline underline-offset-4">
                        View all from {theme.title}
                      </Link>
                    </div>
                  )}
                </div>
              </ScanReveal>

            </div>
          </div>
        </div>
      </div>

      {/* ── From the Catalog ──────────────────────────────────────────────────── */}
      {related.length > 0 && (
        <section className="py-20 bg-warm-page border-t border-pale-stone">
          <div className="max-w-site mx-auto px-5 md:px-10">
            <ScanReveal>
              <p className="archive-label text-[0.6rem] mb-10">From the Catalog</p>
            </ScanReveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
              {related.map((rel, i) => (
                <ScanReveal key={rel.id} delay={i * 60}>
                  <Link href={`/items/${rel.slug}`} className="group block">
                    <div className="aspect-[3/4] bg-sand-bg overflow-hidden mb-3">
                      {rel.cover_image_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={rel.cover_image_url}
                          alt={rel.title}
                          className="w-full h-full object-cover group-hover:scale-105
                                     transition-transform duration-500 grayscale group-hover:grayscale-0"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-sand-bg to-linen-white
                                        flex items-end p-3">
                          <span className="catalog-ordinal text-stone-grey text-[0.55rem]">
                            {rel.catalog_number ?? '—'}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="font-display text-near-black text-base group-hover:text-burnished
                                  transition-colors">
                      {rel.title}
                    </p>
                    {rel.price && (
                      <p className="font-mono text-xs text-stone-grey mt-1">
                        ${rel.price.toFixed(2)}
                      </p>
                    )}
                  </Link>
                </ScanReveal>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}
