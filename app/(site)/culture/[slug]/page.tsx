import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ScanReveal from '@/components/ui/ScanReveal'
import SubscribeBlock from '@/components/SubscribeBlock'
import { createClient } from '@/lib/supabase/server'
import type { Post } from '@/types'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ slug: string }>
}

function formatDate(value: string | null | undefined) {
  if (!value) return null
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function renderBody(post: Post) {
  const raw = post.body?.trim()
  if (!raw) {
    return <p>No body copy has been published for this piece yet.</p>
  }

  const paragraphs = raw.split(/\n\n+/).filter(Boolean)

  const renderParagraph = (text: string, index: number) => (
    <p key={index} className="mb-6 last:mb-0">
      {text.split('\n').map((line, lineIndex, lines) => (
        <span key={lineIndex}>
          {line}
          {lineIndex < lines.length - 1 ? <br /> : null}
        </span>
      ))}
    </p>
  )

  const renderInlineImage = (
    src: string,
    caption: string | null | undefined,
    key: string
  ) => (
    <figure key={key} style={{ margin: '40px 0' }}>
      <Image
        src={src}
        alt={caption ?? ''}
        width={960}
        height={540}
        style={{ objectFit: 'cover', width: '100%', height: 'auto' }}
      />
      {caption ? (
        <figcaption
          className="font-mono"
          style={{ fontSize: 11, color: '#7A7873', marginTop: 8 }}
        >
          {caption}
        </figcaption>
      ) : null}
    </figure>
  )

  const nodes: React.ReactNode[] = []

  paragraphs.forEach((para, index) => {
    nodes.push(renderParagraph(para, index))

    if (index === 2 && post.inline_image_1) {
      nodes.push(renderInlineImage(post.inline_image_1, post.inline_image_1_caption, 'inline-1'))
    }
    if (index === 5 && post.inline_image_2) {
      nodes.push(renderInlineImage(post.inline_image_2, post.inline_image_2_caption, 'inline-2'))
    }
  })

  // Append inline images if paragraphs array is shorter than injection index
  if (paragraphs.length <= 3 && post.inline_image_1) {
    nodes.push(renderInlineImage(post.inline_image_1, post.inline_image_1_caption, 'inline-1-tail'))
  }
  if (paragraphs.length <= 6 && post.inline_image_2) {
    nodes.push(renderInlineImage(post.inline_image_2, post.inline_image_2_caption, 'inline-2-tail'))
  }

  return <>{nodes}</>
}

async function getPost(slug: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle()

  return data as Post | null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)

  if (!post) {
    return { title: 'Culture' }
  }

  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    openGraph: post.hero_image
      ? { images: [{ url: post.hero_image, width: 1280, height: 640 }] }
      : undefined,
  }
}

export default async function CulturePostPage({ params }: Props) {
  const { slug } = await params
  const post = await getPost(slug)

  if (!post) {
    notFound()
  }

  const publishedLabel = formatDate(post.published_at ?? post.created_at)

  return (
    <>
      {post.hero_image ? (
        <div style={{ lineHeight: 0 }}>
          <Image
            src={post.hero_image}
            alt={post.title}
            width={1280}
            height={640}
            style={{ objectFit: 'cover', width: '100%', height: 'auto' }}
            priority
          />
        </div>
      ) : null}

      <div className="pt-16 pb-16 bg-warm-page">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <ScanReveal>
            <Link href="/culture" className="archive-label text-[0.58rem] text-teal">
              Back to Culture
            </Link>
            <h1
              className="font-display text-near-black mt-4 text-balance"
              style={{ fontSize: 'clamp(2.2rem, 6vw, 4.5rem)' }}
            >
              {post.title}
            </h1>
            {publishedLabel ? (
              <p className="font-mono text-xs text-stone-grey mt-4">{publishedLabel}</p>
            ) : null}
            {post.excerpt ? (
              <p className="text-charcoal text-base leading-relaxed mt-6 max-w-3xl">{post.excerpt}</p>
            ) : null}
          </ScanReveal>
        </div>
      </div>

      <section className="py-16 bg-cream">
        <div className="max-w-site mx-auto px-5 md:px-10">
          {post.cover_image ? (
            <ScanReveal>
              <div className="aspect-[16/9] overflow-hidden bg-pale-stone mb-12">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover" />
              </div>
            </ScanReveal>
          ) : null}

          <ScanReveal delay={80}>
            <article className="prose-brand max-w-3xl text-near-black text-base leading-relaxed">
              {post.editorial_note ? (
                <div style={{ position: 'relative', marginBottom: 32 }}>
                  <span
                    className="font-mono"
                    style={{
                      display: 'block',
                      fontSize: 10,
                      textTransform: 'uppercase',
                      letterSpacing: '0.18em',
                      color: '#E8176A',
                      marginBottom: 8,
                    }}
                  >
                    A Note on Voice
                  </span>
                  <div
                    style={{
                      border: '1px solid #0E0E0E',
                      padding: '20px 24px',
                      background: '#F2F1EB',
                      position: 'relative',
                    }}
                  >
                    <p
                      className="font-serif"
                      style={{ fontStyle: 'italic', fontSize: 14, color: '#2A2A28', margin: 0 }}
                    >
                      {post.editorial_note}
                    </p>
                  </div>
                </div>
              ) : null}

              {renderBody(post)}
            </article>
          </ScanReveal>

          {post.tags?.length ? (
            <ScanReveal delay={120}>
              <div className="flex flex-wrap gap-4 mt-12 pt-8 border-t border-pale-stone">
                {post.tags.map(tag => (
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
          ) : null}
        </div>
      </section>

      <SubscribeBlock source={post.slug} />
    </>
  )
}
