import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ScanReveal from '@/components/ui/ScanReveal'
import { createClient } from '@/lib/supabase/server'
import type { Theme, Item } from '@/types'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('themes')
      .select('title, description')
      .eq('slug', slug)
      .eq('published', true)
      .single()

    if (data) {
      return {
        title:       data.title,
        description: data.description ?? undefined,
      }
    }
  } catch { /* noop */ }
  return { title: 'Theme' }
}

export default async function ThemeSpreadPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: themeData } = await supabase
    .from('themes')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .single()

  if (!themeData) notFound()
  const theme = themeData as Theme

  const { data: itemsData } = await supabase
    .from('items')
    .select('*')
    .eq('theme_id', theme.id)
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  const items = (itemsData ?? []) as Item[]

  return (
    <>
      {/* ── Editorial header — dark ground ─────────────────────────────────── */}
      <div className="pt-32 bg-near-black overflow-hidden">
        <div className="max-w-site mx-auto px-5 md:px-10">

          {/* Breadcrumb */}
          <ScanReveal>
            <div className="flex gap-2 items-center mb-10 font-mono text-xs text-stone-grey/60">
              <Link href="/themes" className="hover:text-stone-grey transition-colors">Catalog</Link>
              <span>/</span>
              <span>{theme.title}</span>
            </div>
          </ScanReveal>

          {/* Hero layout: huge title left + portrait image right */}
          <div className="grid md:grid-cols-2 gap-0 items-end">
            <ScanReveal>
              {/* Archive ordinal */}
              <span className="catalog-ordinal text-stone-grey/50 block mb-8">
                {theme.code} — Catalog Theme
              </span>

              <h1
                className="font-display leading-[0.92]"
                style={{
                  fontSize: 'clamp(3rem, 9vw, 7rem)',
                  color: '#F5F0E8',
                }}
              >
                {theme.title}
              </h1>

              {theme.description && (
                <p className="font-mono text-sm text-stone-grey mt-8 pb-16 max-w-sm leading-relaxed">
                  {theme.description}
                </p>
              )}
            </ScanReveal>

            {theme.cover_image && (
              <ScanReveal delay={200}>
                <div className="aspect-[3/4] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={theme.cover_image}
                    alt={theme.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </ScanReveal>
            )}
          </div>
        </div>
      </div>

      {/* ── Editorial text ─────────────────────────────────────────────────── */}
      {theme.editorial_text && (
        <section className="py-24 bg-sand-bg">
          <div className="max-w-site mx-auto px-5 md:px-10">
            <div className="grid md:grid-cols-2 gap-16">
              <ScanReveal>
                <div className="pull-quote">
                  <EditorialTextBlock text={theme.editorial_text} />
                </div>
              </ScanReveal>
            </div>
          </div>
        </section>
      )}

      {/* ── Object list — editorial rows ───────────────────────────────────── */}
      <section className="py-24 bg-cream">
        <div className="max-w-site mx-auto px-5 md:px-10">

          <ScanReveal>
            <div className="flex items-baseline gap-4 mb-2">
              <span className="section-label">Objects</span>
              <span className="catalog-ordinal text-stone-grey">
                {items.length} {items.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>
          </ScanReveal>

          {items.length === 0 ? (
            <>
              <div className="editorial-rule" />
              <ScanReveal>
                <div className="py-24 text-center">
                  <p className="catalog-ordinal">Objects for this theme coming soon.</p>
                </div>
              </ScanReveal>
              <div className="editorial-rule" />
            </>
          ) : (
            <div>
              {items.map((item, i) => (
                <ScanReveal key={item.id} delay={i * 50}>
                  <div className="editorial-rule" />
                  <Link href={`/items/${item.slug}`} className="group block">
                    <div className="grid md:grid-cols-[180px_1fr] gap-8 lg:gap-16 py-10 items-start">

                      {/* Portrait thumbnail */}
                      <div className="aspect-[3/4] overflow-hidden bg-sand-bg flex-shrink-0">
                        {item.cover_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.cover_image_url}
                            alt={item.title}
                            className="w-full h-full object-cover grayscale
                                       group-hover:grayscale-0 transition-all duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="catalog-ordinal">
                              {item.catalog_number ?? '—'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Archive info */}
                      <div className="flex flex-col justify-start py-2">
                        {item.catalog_number && (
                          <span className="catalog-ordinal block mb-5">
                            {item.catalog_number}
                          </span>
                        )}

                        <h3
                          className="font-display text-near-black mb-5
                                     group-hover:text-burnished transition-colors"
                          style={{ fontSize: 'clamp(1.4rem, 2.5vw, 2.2rem)', lineHeight: 1.05 }}
                        >
                          {item.title}
                        </h3>

                        {item.description && (
                          <p className="editorial-body mb-8" style={{ maxWidth: '44ch' }}>
                            {item.description.length > 200
                              ? item.description.slice(0, 200) + '…'
                              : item.description}
                          </p>
                        )}

                        <div className="flex items-baseline gap-8 flex-wrap">
                          <span className="text-cta">View object →</span>
                          {item.price && (
                            <span className="catalog-ordinal">
                              ${item.price.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>

                    </div>
                  </Link>
                </ScanReveal>
              ))}
              <div className="editorial-rule" />
            </div>
          )}

        </div>
      </section>

      {/* ── Back to catalog ────────────────────────────────────────────────── */}
      <div className="py-12 bg-cream">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <Link href="/themes" className="text-cta">
            ← All themes
          </Link>
        </div>
      </div>
    </>
  )
}

function EditorialTextBlock({ text }: { text: string }) {
  const paragraphs = text.split('\n\n').filter(Boolean)
  return (
    <div className="flex flex-col gap-6">
      {paragraphs.map((p, i) => (
        <p
          key={i}
          className={i === 0
            ? 'font-display text-near-black text-2xl leading-relaxed italic'
            : 'editorial-body'
          }
        >
          {p}
        </p>
      ))}
    </div>
  )
}
