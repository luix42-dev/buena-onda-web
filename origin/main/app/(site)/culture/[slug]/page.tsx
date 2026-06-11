import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ScanReveal from '@/components/ui/ScanReveal'
import { createClient } from '@/lib/supabase/server'
import type { Post } from '@/types'

export const runtime = 'edge'
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

function renderParagraphs(text: string) {
  return text
    .trim()
    .split(/\n\n+/)
    .filter(Boolean)
    .map((paragraph, index) => (
      <p key={index} className="mb-6 last:mb-0">
        {paragraph.split('\n').map((line, lineIndex, lines) => (
          <span key={lineIndex}>
            {line}
            {lineIndex < lines.length - 1 ? <br /> : null}
          </span>
        ))}
      </p>
    ))
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
      <div className="pt-32 pb-16 bg-warm-page">
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
              {post.body?.trim()
                ? renderParagraphs(post.body)
                : <p>No body copy has been published for this piece yet.</p>}
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
    </>
  )
}
