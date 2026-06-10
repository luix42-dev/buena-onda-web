import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ScanReveal from '@/components/ui/ScanReveal'
import ImageGallery from '@/components/ui/ImageGallery'
import BuyNowButton from '@/components/ui/BuyNowButton'
import ReserveForm from '@/components/ui/ReserveForm'
import { createClient } from '@/lib/supabase/server'
import type { Item, ItemImage, Theme } from '@/types'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

type PrimaryImageRow = {
  item_id: string
  url: string
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
        title: `${data.catalog_number ? `${data.catalog_number} - ` : ''}${data.title}`,
        description: data.description ?? undefined,
      }
    }
  } catch {
    // noop
  }

  return { title: 'Catalog Item' }
}

const DETAIL_FIELDS: { key: string; label: string }[] = [
  { key: 'era', label: 'Era' },
  { key: 'dimensions', label: 'Dimensions' },
  { key: 'material', label: 'Material' },
  { key: 'condition', label: 'Condition' },
  { key: 'origin', label: 'Origin' },
]

export default async function ItemPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: itemData } = await supabase
    .from('items')
    .select('id, title, slug, catalog_number, theme_id, description, why_chosen, details, price, buy_url, tags, status, availability, sourcing_model, featured, published_at, created_at, updated_at, theme:themes(*), images:item_images(*)')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!itemData) notFound()

  const item = itemData as unknown as Item
  const theme = Array.isArray(itemData.theme)
    ? (itemData.theme[0] ?? null) as Theme | null
    : (itemData.theme as Theme | null)
  const images = (itemData.images as ItemImage[] | null) ?? []
  const details = (item.details as Record<string, string> | null) ?? {}
  const whyChosen = item.why_chosen?.trim() ?? ''
  const sourcingModel = item.sourcing_model ?? 'reservation'
  const isPublishedAndAvailable = item.status === 'published' && item.availability === 'available'
  const canBuyNow = isPublishedAndAvailable && sourcingModel === 'direct' && item.price != null && item.price > 0
  const isSold = item.availability === 'sold'
  const isReserved = item.availability === 'reserved'

  const hasDetails = DETAIL_FIELDS.some(field => details[field.key]) || !!item.catalog_number

  let related: Item[] = []
  if (theme) {
    const { data: sameTheme } = await supabase
      .from('items')
      .select('id, title, slug, price, catalog_number')
      .eq('status', 'published')
      .eq('theme_id', theme.id)
      .neq('id', item.id)
      .order('published_at', { ascending: false })
      .limit(4)

    related = (sameTheme ?? []) as Item[]
  }

  if (related.length < 4) {
    const exclude = [item.id, ...related.map(rel => rel.id)]
    const { data: others } = await supabase
      .from('items')
      .select('id, title, slug, price, catalog_number')
      .eq('status', 'published')
      .not('id', 'in', `(${exclude.join(',')})`)
      .order('published_at', { ascending: false })
      .limit(4 - related.length)

    related = [...related, ...((others ?? []) as Item[])]
  }

  const relatedIds = related.map(rel => rel.id)
  const relatedPrimaryImagesRes = relatedIds.length === 0
    ? { data: [] as PrimaryImageRow[] }
    : await supabase
        .from('item_primary_images')
        .select('item_id, url')
        .in('item_id', relatedIds)

  const relatedPrimaryImageMap = new Map(
    ((relatedPrimaryImagesRes.data ?? []) as PrimaryImageRow[]).map(image => [image.item_id, image.url]),
  )

  related = related.map(rel => ({
    ...rel,
    primary_image_url: relatedPrimaryImageMap.get(rel.id) ?? null,
  }))

  return (
    <>
      <div className="pt-32 pb-32 bg-cream">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <ScanReveal>
            <div className="flex gap-2 items-center mb-16 font-mono text-xs text-stone-grey">
              <Link href="/themes" className="hover:text-burnished transition-colors">Catalog</Link>
              {theme && (
                <>
                  <span>/</span>
                  <Link href={`/themes/${theme.slug}`} className="hover:text-burnished transition-colors">
                    {theme.title}
                  </Link>
                </>
              )}
              <span>/</span>
              <span className="text-near-black">{item.title}</span>
            </div>
          </ScanReveal>

          <div className="grid md:grid-cols-[1.2fr_1fr] gap-16 lg:gap-24 items-start">
            <ScanReveal>
              <ImageGallery
                images={images}
                fallbackCoverUrl={null}
                title={item.title}
                isSold={isSold}
              />
            </ScanReveal>

            <div className="lg:sticky lg:top-8">
              {item.catalog_number && (
                <ScanReveal>
                  <p
                    className="font-mono text-warm-sand/60 tracking-[0.3em] mb-6 select-none"
                    style={{ fontSize: 'clamp(0.65rem, 1.2vw, 0.85rem)' }}
                  >
                    {item.catalog_number}
                  </p>
                </ScanReveal>
              )}

              {theme && (
                <ScanReveal>
                  <Link
                    href={`/themes/${theme.slug}`}
                    className="catalog-ordinal text-warm-sand hover:text-burnished transition-colors block mb-3"
                  >
                    {theme.title}
                  </Link>
                </ScanReveal>
              )}

              <ScanReveal delay={80}>
                <h1
                  className="font-display text-near-black mb-5 text-balance"
                  style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', lineHeight: 1.05 }}
                >
                  {item.title}
                </h1>
              </ScanReveal>

              {item.price != null && (
                <ScanReveal delay={100}>
                  <div className="mb-8">
                    <p className="font-mono text-charcoal" style={{ fontSize: '1.05rem' }}>
                      ${item.price.toFixed(2)}
                    </p>
                    <p className="font-mono text-xs text-stone-grey mt-1 tracking-wide">
                      📍 Free Delivery - Miami &amp; Surroundings
                    </p>
                  </div>
                </ScanReveal>
              )}

              {item.description && (
                <ScanReveal delay={110}>
                  <div className="mb-8 pt-8 border-t border-pale-stone">
                    <p className="editorial-body">{item.description}</p>
                  </div>
                </ScanReveal>
              )}

              {whyChosen && (
                <ScanReveal delay={120}>
                  <div className="mb-8">
                    <p className="font-serif italic text-near-black mb-3" style={{ fontSize: '1rem' }}>
                      Why We Chose This
                    </p>
                    <p className="editorial-body text-sm leading-relaxed">
                      {whyChosen}
                    </p>
                  </div>
                </ScanReveal>
              )}

              {hasDetails && (
                <ScanReveal delay={130}>
                  <div className="mb-8 border-t border-pale-stone">
                    {DETAIL_FIELDS.map(({ key, label }) =>
                      details[key] ? (
                        <div key={key} className="flex justify-between items-baseline py-3 border-b border-pale-stone/60">
                          <span className="archive-label text-[0.6rem] text-stone-grey uppercase tracking-widest">{label}</span>
                          <span className="font-mono text-xs text-near-black text-right">{details[key]}</span>
                        </div>
                      ) : null,
                    )}
                    {item.catalog_number && (
                      <div className="flex justify-between items-baseline py-3 border-b border-pale-stone/60">
                        <span className="archive-label text-[0.6rem] text-stone-grey uppercase tracking-widest">Catalog No.</span>
                        <span className="font-mono text-xs text-near-black">{item.catalog_number}</span>
                      </div>
                    )}
                  </div>
                </ScanReveal>
              )}

              {item.tags && item.tags.length > 0 && (
                <ScanReveal delay={160}>
                  <div className="mb-8 flex flex-wrap gap-x-5 gap-y-2">
                    {item.tags.map(tag => (
                      <Link
                        key={tag}
                        href={`/search?q=${encodeURIComponent(tag)}`}
                        className="catalog-ordinal text-stone-grey hover:text-burnished transition-colors"
                      >
                        {tag}
                      </Link>
                    ))}
                  </div>
                </ScanReveal>
              )}

              <ScanReveal delay={180}>
                <div className="pt-8 border-t border-pale-stone">
                  {canBuyNow && (
                    <div className="mb-8">
                      <p className="font-mono text-[0.68rem] text-stone-grey leading-relaxed mb-6 max-w-xs">
                        In stock. Ships within 3 business days.
                      </p>
                      <BuyNowButton itemId={item.id} itemTitle={item.title} />
                    </div>
                  )}

                  <div className={canBuyNow ? 'pt-8 border-t border-pale-stone' : ''}>
                    {isPublishedAndAvailable ? (
                      <>
                        <p className="font-mono text-[0.68rem] text-stone-grey leading-relaxed mb-6 max-w-xs">
                          Every object is personally sourced, condition-verified, and delivered by our team in Miami.
                        </p>
                        <ReserveForm itemId={item.id} itemTitle={item.title} />
                      </>
                    ) : isReserved ? (
                      <>
                        <p
                          className="font-display text-near-black mb-1"
                          style={{ fontSize: 'clamp(1.1rem, 2vw, 1.4rem)', lineHeight: 1.1 }}
                        >
                          This piece is reserved.
                        </p>
                      </>
                    ) : (
                      <>
                        <p
                          className="font-display text-near-black mb-1"
                          style={{ fontSize: 'clamp(1.1rem, 2vw, 1.4rem)', lineHeight: 1.1 }}
                        >
                          This piece has found a home.
                        </p>
                      </>
                    )}
                  </div>

                  {theme && (
                    <div className="mt-6">
                      <Link
                        href={`/themes/${theme.slug}`}
                        className="font-mono text-xs text-stone-grey hover:text-burnished transition-colors underline underline-offset-4"
                      >
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

      {related.length > 0 && (
        <section className="py-20 bg-warm-page border-t border-pale-stone">
          <div className="max-w-site mx-auto px-5 md:px-10">
            <ScanReveal>
              <p className="archive-label text-[0.6rem] mb-10">From the Catalog</p>
            </ScanReveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {related.map((rel, index) => (
                <ScanReveal key={rel.id} delay={index * 60}>
                  <Link href={`/items/${rel.slug}`} className="group block">
                    <div className="aspect-[3/4] bg-sand-bg overflow-hidden mb-3">
                      {rel.primary_image_url ? (
                        <img
                          src={rel.primary_image_url}
                          alt={rel.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-sand-bg to-linen-white flex items-end p-3">
                          <span className="catalog-ordinal text-stone-grey text-[0.55rem]">
                            {rel.catalog_number ?? '-'}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="font-display text-near-black text-base group-hover:text-burnished transition-colors">
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
