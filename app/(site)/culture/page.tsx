import type { Metadata } from 'next'
import { headers } from 'next/headers'
import ScanReveal from '@/components/ui/ScanReveal'
import type { Post } from '@/types'

export const metadata: Metadata = {
  title: 'Culture',
  description: 'Essays, dispatches, and stories from the analog world.',
}

export const dynamic = 'force-dynamic'

type PostsResponse = {
  posts?: Post[]
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Unpublished'
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
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

async function getBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (configured) return configured.replace(/\/$/, '')

  const headerStore = await headers()
  const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host')
  const proto = headerStore.get('x-forwarded-proto') ?? (host?.includes('localhost') ? 'http' : 'https')

  if (host) return `${proto}://${host}`
  return 'http://localhost:3000'
}

async function fetchTaggedPosts(tag: string): Promise<Post[]> {
  const baseUrl = await getBaseUrl()
  const res = await fetch(`${baseUrl}/api/posts?tag=${encodeURIComponent(tag)}&limit=50`, {
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Failed to load ${tag} posts.`)
  }

  const body = (await res.json()) as PostsResponse
  return Array.isArray(body.posts) ? body.posts : []
}

async function loadCulturePosts() {
  try {
    const [culturePosts, essayPosts] = await Promise.all([
      fetchTaggedPosts('culture'),
      fetchTaggedPosts('essay'),
    ])

    return mergePosts(culturePosts, essayPosts)
  } catch {
    return []
  }
}

export default async function CulturePage() {
  const posts = await loadCulturePosts()

  return (
    <>
      <div className="pt-32 pb-16 bg-warm-page">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <ScanReveal>
            <span className="section-label">Culture</span>
            <h1
              className="font-display text-near-black mt-2"
              style={{ fontSize: 'clamp(2.2rem, 6vw, 4rem)' }}
            >
              Essays & Dispatches
            </h1>
            <p className="text-charcoal mt-4 max-w-prose leading-relaxed">
              Published writing from the house: music, objects, Miami, and the analog world that still
              moves underneath all of it.
            </p>
          </ScanReveal>
        </div>
      </div>

      <section className="py-16 bg-cream">
        <div className="max-w-site mx-auto px-5 md:px-10">
          {posts.length === 0 ? (
            <ScanReveal>
              <div className="bg-linen-white border border-pale-stone p-8 md:p-10">
                <p className="archive-label text-[0.62rem] text-teal">Culture Archive</p>
                <h2 className="font-display text-near-black mt-3" style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)' }}>
                  Nothing published yet.
                </h2>
                <p className="text-charcoal text-sm leading-relaxed mt-3 max-w-prose">
                  The archive is wired to live post data now, but there are no published entries tagged
                  `culture` or `essay` yet.
                </p>
              </div>
            </ScanReveal>
          ) : (
            <div className="border-y border-pale-stone">
              {posts.map((post, index) => (
                <ScanReveal key={post.id} delay={index * 70}>
                  <article className="grid md:grid-cols-[180px_1fr] gap-6 md:gap-10 py-8 border-b border-pale-stone last:border-b-0">
                    <div className="flex flex-col gap-2">
                      <span className="archive-label text-[0.58rem] text-teal">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="font-mono text-xs text-stone-grey">
                        {formatDate(post.published_at ?? post.created_at)}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <h2
                        className="font-display text-near-black"
                        style={{ fontSize: 'clamp(1.25rem, 2.8vw, 2rem)' }}
                      >
                        {post.title}
                      </h2>
                      <p className="text-charcoal text-sm md:text-base leading-relaxed mt-3 max-w-3xl">
                        {post.excerpt ?? 'No excerpt yet.'}
                      </p>
                    </div>
                  </article>
                </ScanReveal>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
