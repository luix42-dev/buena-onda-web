import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
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

function formatYear(value: string | null | undefined) {
  if (!value) return new Date().getFullYear()
  return new Date(value).getFullYear()
}

function sortPosts(posts: Post[]) {
  return [...posts].sort((a, b) => {
    const aDate = new Date(a.published_at ?? a.created_at).getTime()
    const bDate = new Date(b.published_at ?? b.created_at).getTime()
    return bDate - aDate
  })
}

function mergePosts(...collections: Post[][]) {
  const byId = new Map<string, Post>()

  for (const collection of collections) {
    for (const post of collection) {
      byId.set(post.id, post)
    }
  }

  return sortPosts(Array.from(byId.values()))
}

function EditorialNote({ note }: { note: string }) {
  return (
    <aside
      style={{
        borderLeft: '2px solid #1A9E9E',
        background: 'rgba(26, 158, 158, 0.08)',
        padding: '20px 22px',
        margin: '30px 0',
      }}
    >
      <p
        className="font-mono"
        style={{
          color: '#1A9E9E',
          fontSize: 10,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          marginBottom: 10,
        }}
      >
        A note on voice
      </p>
      <p
        className="font-serif"
        style={{
          color: '#2F2F2D',
          fontSize: 18,
          fontStyle: 'italic',
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        {note}
      </p>
    </aside>
  )
}

async function getIssueNumber(post: Post) {
  const supabase = await createClient()
  const [cultureRes, essayRes] = await Promise.all([
    supabase.from('posts').select('*').eq('status', 'published').contains('tags', ['culture']),
    supabase.from('posts').select('*').eq('status', 'published').contains('tags', ['essay']),
  ])

  const posts = mergePosts(
    (cultureRes.data ?? []) as Post[],
    (essayRes.data ?? []) as Post[]
  )
  const index = posts.findIndex(entry => entry.id === post.id)
  return String((index >= 0 ? index : 0) + 1).padStart(3, '0')
}

function renderBody(post: Post, issueNumber: string) {
  const raw = post.body?.trim()
  if (!raw) {
    return (
      <p className="font-sans" style={{ color: '#2F2F2D' }}>
        No body copy has been published for this piece yet.
      </p>
    )
  }

  const paragraphs = raw.split(/\n\n+/).filter(Boolean)

  const renderParagraph = (text: string, index: number) => (
    <p
      key={index}
      className={`font-sans mb-7 leading-relaxed ${
        index === 0
          ? 'first-letter:float-left first-letter:mr-2 first-letter:font-serif first-letter:text-[42px] first-letter:leading-[0.85]'
          : ''
      }`}
      style={{ color: '#2F2F2D', fontSize: '1rem' }}
    >
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
    <figure key={key} style={{ margin: '34px 0' }}>
      <Image
        src={src}
        alt={caption ?? ''}
        width={960}
        height={540}
        style={{ objectFit: 'cover', width: '100%', height: 'auto', border: '1px solid #2F2F2D' }}
      />
      {caption ? (
        <figcaption
          className="font-mono"
          style={{
            fontSize: 10,
            color: '#2F2F2D',
            opacity: 0.68,
            marginTop: 8,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          {caption}
        </figcaption>
      ) : null}
    </figure>
  )

  const nodes: React.ReactNode[] = []

  paragraphs.forEach((para, index) => {
    nodes.push(renderParagraph(para, index))

    if (index === 1 && post.inline_image_1) {
      nodes.push(renderInlineImage(post.inline_image_1, post.inline_image_1_caption, 'inline-1'))
      if (post.editorial_note) {
        nodes.push(<EditorialNote key="editorial-note" note={post.editorial_note} />)
      }
    }

    if (index === 3 && post.inline_image_2 && post.inline_image_2 !== post.inline_image_1) {
      nodes.push(renderInlineImage(post.inline_image_2, post.inline_image_2_caption, 'inline-2'))
    }
  })

  if (paragraphs.length <= 2 && post.inline_image_1) {
    nodes.push(renderInlineImage(post.inline_image_1, post.inline_image_1_caption, 'inline-1-tail'))
    if (post.editorial_note) {
      nodes.push(<EditorialNote key="editorial-note" note={post.editorial_note} />)
    }
  }

  if (paragraphs.length <= 4 && post.inline_image_2 && post.inline_image_2 !== post.inline_image_1) {
    nodes.push(renderInlineImage(post.inline_image_2, post.inline_image_2_caption, 'inline-2-tail'))
  }

  if (post.editorial_note && !post.inline_image_1) {
    nodes.splice(Math.min(2, nodes.length), 0, (
      <EditorialNote key="editorial-note" note={post.editorial_note} />
    ))
  }

  return (
    <>
      {nodes}
      <div
        className="font-mono mt-12 pt-5"
        style={{
          borderTop: '1px solid #2F2F2D',
          color: '#2F2F2D',
          fontSize: 10,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
        }}
      >
        <span aria-hidden="true" style={{ color: '#1A9E9E', marginRight: 8 }}>
          ●
        </span>
        End of Transmission {issueNumber}
      </div>
    </>
  )
}

async function getPost(slug: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
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

  const createdLabel = formatDate(post.created_at)
  const year = formatYear(post.created_at)
  const issueNumber = await getIssueNumber(post)
  const isFirstIssue = issueNumber === '001'
  const dek = post.excerpt ?? null

  return (
    <main style={{ background: '#F8F7F3', color: '#2F2F2D' }}>
      <section
        className="grid grid-cols-1 gap-3 px-5 py-4 text-center md:grid-cols-3 md:px-8 md:text-left"
        style={{ borderBottom: '1px solid #2F2F2D' }}
      >
        <div className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: '0.15em' }}>
          <div>Buena Onda · Miami</div>
          <div style={{ opacity: 0.62 }}>Est. 2014</div>
        </div>
        <div
          className="font-mono uppercase md:text-center"
          style={{ fontSize: 10, letterSpacing: '0.15em' }}
        >
          The Transmission · <span style={{ color: '#1A9E9E' }}>{issueNumber}</span>
        </div>
        <div
          className="font-mono uppercase md:text-right"
          style={{ fontSize: 10, letterSpacing: '0.15em' }}
        >
          <div>{createdLabel}</div>
          <div style={{ opacity: 0.62 }}>Analog Culture House</div>
        </div>
      </section>

      <section className="relative" style={{ borderBottom: '1px solid #2F2F2D' }}>
        {post.hero_image ? (
          <>
            <Image
              src={post.hero_image}
              alt={post.title}
              width={1600}
              height={680}
              className="h-[260px] w-full object-cover md:h-[340px]"
              priority
            />
            <p
              className="font-mono absolute bottom-4 left-5 md:left-8"
              style={{
                color: 'rgba(255,255,255,0.74)',
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              Transmission {issueNumber} · Buena Onda Archive
            </p>
          </>
        ) : (
          <div
            className="flex h-[260px] items-center justify-center md:h-[340px]"
            style={{ background: '#2F2F2D' }}
          >
            <p
              className="font-mono uppercase"
              style={{ color: '#F8F7F3', fontSize: 10, letterSpacing: '0.16em' }}
            >
              Transmission {issueNumber} · Image pending
            </p>
          </div>
        )}
      </section>

      <section style={{ borderBottom: '1px solid #2F2F2D' }}>
        <div className="mx-auto grid max-w-[680px] grid-cols-1 md:grid-cols-[120px_1fr_80px]">
          <aside
            className="grid grid-cols-1 gap-5 p-5 md:block md:border-r md:p-4"
            style={{ borderColor: '#2F2F2D' }}
          >
            <div className="mb-5">
              <p
                className="font-mono uppercase"
                style={{
                  color: '#888',
                  fontSize: 8,
                  letterSpacing: '0.15em',
                  marginBottom: 8,
                }}
              >
                In this issue
              </p>
              <p
                className="font-serif"
                style={{ color: '#2F2F2D', fontSize: 18, lineHeight: 1.1, marginBottom: 8 }}
              >
                {post.title}
              </p>
              {dek ? (
                <p
                  className="font-sans"
                  style={{ color: '#2F2F2D', fontSize: 12, lineHeight: 1.45, opacity: 0.76 }}
                >
                  {dek}
                </p>
              ) : null}
            </div>

            <div className="mb-5">
              <p
                className="font-mono uppercase"
                style={{
                  color: '#888',
                  fontSize: 8,
                  letterSpacing: '0.15em',
                  marginBottom: 8,
                }}
              >
                Pillar
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(post.tags ?? []).map((tag, index) => {
                  const accent = index % 2 === 0 ? '#1A9E9E' : '#C46D63'
                  return (
                    <Link
                      key={tag}
                      href={`/search?q=${encodeURIComponent(tag)}`}
                      className="font-mono uppercase"
                      style={{
                        border: `1px solid ${accent}`,
                        color: accent,
                        fontSize: 8,
                        letterSpacing: '0.12em',
                        padding: '3px 5px',
                      }}
                    >
                      {tag}
                    </Link>
                  )
                })}
              </div>
            </div>

            <div>
              <p
                className="font-mono uppercase"
                style={{
                  color: '#888',
                  fontSize: 8,
                  letterSpacing: '0.15em',
                  marginBottom: 8,
                }}
              >
                Issue
              </p>
              <p
                className="font-mono"
                style={{ color: '#1A9E9E', fontSize: 18, letterSpacing: '0.14em' }}
              >
                {issueNumber}
              </p>
            </div>
          </aside>

          <article className="px-5 py-10 md:px-8 md:py-12">
            <Link
              href="/culture"
              className="font-mono uppercase"
              style={{ color: '#1A9E9E', fontSize: 10, letterSpacing: '0.15em' }}
            >
              Back to Culture
            </Link>
            <p
              className="font-mono uppercase mt-8"
              style={{ color: '#1A9E9E', fontSize: 10, letterSpacing: '0.15em' }}
            >
              {isFirstIssue ? `Founder's Note · Transmission ${issueNumber}` : `Transmission ${issueNumber}`}
            </p>
            <h1
              className="font-serif mt-4"
              style={{ color: '#2F2F2D', fontSize: 28, fontWeight: 400, lineHeight: 1.04 }}
            >
              {post.title}
            </h1>
            {dek ? (
              <p
                className="font-mono mt-5 pt-4"
                style={{
                  borderTop: '1px solid #2F2F2D',
                  color: '#2F2F2D',
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  lineHeight: 1.6,
                }}
              >
                {dek}
              </p>
            ) : null}
            <div className="mt-9">
              {renderBody(post, issueNumber)}
            </div>
          </article>

          <aside className="hidden items-start justify-between px-4 py-12 md:flex">
            <p
              className="font-mono uppercase"
              style={{
                writingMode: 'vertical-rl',
                color: '#999',
                fontSize: 9,
                letterSpacing: '0.15em',
              }}
            >
              Analog Culture House
            </p>
            <p
              className="font-mono uppercase"
              style={{
                writingMode: 'vertical-rl',
                color: '#999',
                fontSize: 9,
                letterSpacing: '0.15em',
              }}
            >
              Miami · {year}
            </p>
          </aside>
        </div>
      </section>

      <section style={{ borderTop: '1px solid #2F2F2D' }}>
        <SubscribeBlock source={post.slug} />
      </section>
    </main>
  )
}
