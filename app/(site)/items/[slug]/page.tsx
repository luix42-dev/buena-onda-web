import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ScanReveal from '@/components/ui/ScanReveal'
import ImageGallery from '@/components/ui/ImageGallery'
import BuyNowButton from '@/components/ui/BuyNowButton'
import ReserveForm from '@/components/ui/ReserveForm'
import JsonLd from '@/components/seo/JsonLd'
import GAItemView from '@/components/analytics/GAItemView'
import { absoluteUrl, breadcrumbList } from '@/lib/seo/json-ld'
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
        title: `${data.catalog_number ? `${data.catalog_number} \u2014 ` : ''}${data.title}`,
        description: data.description ?? undefined,
      }
    }
  } catch { /* noop */ }
  return { title: 'Catalog Item' }
}

const DETAIL_FIELDS: { key: string; label: string }[] = [
  { key: 'era', label: 'Era' },
  { key: 'dimensions', label: 'Dimensions' },
  { key: 'material', label: 'Material' },
  { key: 'condition', label: 'Condition' },
  { key: 'origin', label: 'Origin' },
]

const RESERVE_FORM_ID = 'reserve-form'

function productAvailability(value: Item['availability']) {
  if (value === 'available') return 'https://schema.org/InStock'
  if (value === 'sold') return 'https://schema.org/SoldOut'
  return 'https://schema.org/OutOfStock'
}

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
  const theme = (Array.isArray(itemData.theme) ? itemData.theme[0] : itemData.theme) as Theme | null
  const images = (itemData.images as ItemImage[] | null) ?? []
  const details = (item.details as Record<string, string> | null) ?? {}
  const whyChosen = item.why_chosen?.trim() ?? ''
  const sourcingModel = item.sourcing_model ?? 'reservation'
  const isDirectPurchase = sourcingModel === 'direct' || sourcingModel === 'direct_purchase'
  const isPublishedAndAvailable = item.status === 'published' && item.availability === 'available'
  const canBuyNow = isPublishedAndAvailable && isDirectPurchase && item.price != null && item.price > 0
  const canReserve = isPublishedAndAvailable && !isDirectPurchase
  const isSold = item.availability === 'sold'
  const isReserved = item.availability === 'reserved'

  const hasDetails = DETAIL_FIELDS.some(f => details[f.key]) || !!item.catalog_number

  // Pairs Well With - up to 4 other available published items, same theme first.
  let related: Item[] = []
  if (theme) {
    const { data: sameTheme } = await supabase
      .from('items')
      .select('id, title, slug, price, catalog_number')
      .eq('status', 'published')
      .eq('availability', 'available')
      .eq('theme_id', theme.id)
      .neq('id', item.id)
      .order('published_at', { ascending: false })
      .limit(4)
    related = (sameTheme ?? []) as Item[]
  }
  if (related.length < 4) {
    const exclude = [item.id, ...related.map(r => r.id)]
    const { data: others } = await supabase
      .from('items')
      .select('id, title, slug, price, catalog_number')
      .eq('status', 'published')
      .eq('availability', 'available')
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

  const imageUrls = images.map(image => image.url).filter(Boolean)
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: item.title,
    description: item.description ?? item.why_chosen ?? undefined,
    image: imageUrls.length > 0 ? imageUrls : undefined,
    sku: item.catalog_number ?? item.id,
    url: absoluteUrl(`/items/${item.slug}`),
    offers: item.price != null ? {
      '@type': 'Offer',
      price: item.price.toFixed(2),
      priceCurrency: 'USD',
      availability: productAvailability(item.availability),
      url: absoluteUrl(`/items/${item.slug}`),
    } : undefined,
  }
  const breadcrumbs = breadcrumbList([
    { name: 'Home', path: '/' },
    { name: 'Catalog', path: '/themes' },
    ...(theme ? [{ name: theme.title, path: `/themes/${theme.slug}` }] : []),
    { name: item.title, path: `/items/${item.slug}` },
  ])
  return (
    <>
      <JsonLd data={[breadcrumbs, productJsonLd]} />
      <GAItemView itemId={item.id} itemTitle={item.title} itemSlug={item.slug} />
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
            <div className="md:sticky md:top-20 md:self-start">
              <ImageGallery
                images={images}
                fallbackCoverUrl={null}
                title={item.title}
                isSold={isSold}
              />
            </div>

            <div>
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
                  <div className="mb-6">
                    <p className="font-mono" style={{ fontSize: '21px', color: '#2F2F2D' }}>
                      ${item.price.toFixed(2)}
                    </p>
                    <p className="font-mono" style={{ fontSize: '13px', color: '#7C7B73', lineHeight: 1.6, marginTop: '10px' }}>
                      Free Delivery &mdash; Miami &amp; Surroundings
                    </p>
                  </div>
                </ScanReveal>
              )}

              <ScanReveal delay={110}>
                <div className="mb-8">
                  <p className="font-mono mb-5 max-w-sm" style={{ fontSize: '13px', color: '#7C7B73', lineHeight: 1.6 }}>
                    Final sale, non-returnable. Every piece is one of one &mdash; when it&apos;s gone, it&apos;s gone.
                  </p>

                  {canBuyNow ? (
                    <BuyNowButton itemId={item.id} itemTitle={item.title} />
                  ) : canReserve ? (
                    <a
                      href={`#${RESERVE_FORM_ID}`}
                      className="px-8 py-3.5 bg-near-black text-linen-peach
                                 font-mono text-xs tracking-[0.2em] uppercase
                                 hover:bg-burnished transition-colors self-start inline-block"
                    >
                      Reserve this piece -&gt;
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="px-8 py-3.5 bg-near-black text-linen-peach
                                 font-mono text-xs tracking-[0.2em] uppercase
                                 opacity-50 cursor-not-allowed self-start inline-block"
                    >
                      {isReserved ? 'Reserved' : 'Sold'}
                    </button>
                  )}
                </div>
              </ScanReveal>

              {item.description && (
                <ScanReveal delay={120}>
                  <div
                    className="border-t border-pale-stone"
                    style={{ margin: '30px 0', paddingTop: '30px' }}
                  >
                    {item.description.split('\n\n').map((para, i, arr) => (
                      <p
                        key={i}
                        style={{
                          fontFamily: 'var(--font-fraunces)',
                          fontSize: '18px',
                          lineHeight: 1.72,
                          color: '#2F2F2D',
                          maxWidth: '34em',
                          marginBottom: i < arr.length - 1 ? '1.05em' : 0,
                        }}
                      >
                        {para}
                      </p>
                    ))}
                  </div>
                </ScanReveal>
              )}

              {whyChosen && (
                <ScanReveal delay={130}>
                  <div className="mb-8">
                    <p style={{ fontFamily: 'var(--font-fraunces)', fontStyle: 'italic', fontSize: '16px', color: '#2F2F2D', marginTop: '1.9rem', marginBottom: '0.75rem' }}>
                      Why We Chose This
                    </p>
                    {whyChosen.split('\n\n').map((para, i, arr) => (
                      <p
                        key={i}
                        style={{
                          fontFamily: 'var(--font-fraunces)',
                          fontSize: '18px',
                          lineHeight: 1.72,
                          color: '#2F2F2D',
                          maxWidth: '34em',
                          marginBottom: i < arr.length - 1 ? '1.05em' : 0,
                        }}
                      >
                        {para}
                      </p>
                    ))}
                  </div>
                </ScanReveal>
              )}

              {hasDetails && (
                <ScanReveal delay={140}>
                  <div className="mb-8 border-t border-pale-stone">
                    {DETAIL_FIELDS.map(({ key, label }) =>
                      details[key] ? (
                        <div key={key} className="flex justify-between items-baseline py-3 border-b border-pale-stone/60">
                          <span className="archive-label text-[0.6rem] text-stone-grey uppercase tracking-widest">{label}</span>
                          <span className="font-mono text-xs text-near-black text-right">{details[key]}</span>
                        </div>
                      ) : null
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

              {canReserve && (
                <ScanReveal delay={180}>
                  <div
                    id={RESERVE_FORM_ID}
                    tabIndex={-1}
                    className="scroll-mt-28 pt-8 border-t border-pale-stone focus:outline-none"
                  >
                    <p className="font-mono text-[0.68rem] text-stone-grey leading-relaxed mb-6 max-w-xs">
                      Every object is personally sourced, condition-verified, and delivered by our team in Miami.
                    </p>
                    <ReserveForm itemId={item.id} itemTitle={item.title} />
                  </div>
                </ScanReveal>
              )}

              {theme && (
                <div className="mt-6">
                  <Link
                    href={`/themes/${theme.slug}`}
                    className="font-mono text-xs text-stone-grey hover:text-burnished
                               transition-colors underline underline-offset-4"
                  >
                    View all from {theme.title}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="py-20 bg-warm-page border-t border-pale-stone">
          <div className="max-w-site mx-auto px-5 md:px-10">
            <ScanReveal>
              <p className="archive-label text-[0.6rem] mb-10">Pairs Well With</p>
            </ScanReveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {related.map((rel, i) => (
                <ScanReveal key={rel.id} delay={i * 60}>
                  <Link href={`/items/${rel.slug}`} className="group block">
                    <div className="aspect-[3/4] bg-sand-bg overflow-hidden mb-3">
                      {rel.primary_image_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={rel.primary_image_url}
                          alt={rel.title}
                          className="w-full h-full object-cover group-hover:scale-105
                                     transition-transform duration-500"
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
