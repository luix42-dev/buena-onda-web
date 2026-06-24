import type { MetadataRoute } from 'next'
import { createPublicClient } from '@/lib/supabase/public'

export const revalidate = 3600

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.buenaondalifestyle.com').replace(/\/$/, '')

const staticPaths = [
  '/',
  '/about',
  '/contact',
  '/culture',
  '/events',
  '/objects',
  '/radio',
  '/themes',
]

function route(path: string, priority: number, changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] = 'weekly'): MetadataRoute.Sitemap[number] {
  return {
    url: `${SITE}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }
}

function fromUpdatedAt(value: string | null | undefined) {
  return value ? new Date(value) : new Date()
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = [
    ...staticPaths.map((path) => route(path, path === '/' ? 1 : 0.7)),
  ]

  try {
    const supabase = createPublicClient()

    const [{ data: items }, { data: themes }, { data: posts }, { data: episodes }, { data: events }] = await Promise.all([
      supabase
        .from('items')
        .select('slug, updated_at')
        .in('status', ['published', 'sold_out']),
      supabase
        .from('themes')
        .select('slug, updated_at')
        .eq('published', true),
      supabase
        .from('posts')
        .select('slug, updated_at')
        .eq('published', true),
      supabase
        .from('episodes')
        .select('slug, published_at, created_at')
        .eq('published', true),
      supabase
        .from('events')
        .select('slug, updated_at'),
    ])

    const themeRoutes: MetadataRoute.Sitemap = (themes ?? []).map((theme) => ({
      url: `${SITE}/themes/${theme.slug}`,
      lastModified: fromUpdatedAt(theme.updated_at),
      changeFrequency: 'monthly',
      priority: 0.75,
    }))

    const itemRoutes: MetadataRoute.Sitemap = (items ?? []).map((item) => ({
      url: `${SITE}/items/${item.slug}`,
      lastModified: fromUpdatedAt(item.updated_at),
      changeFrequency: 'weekly',
      priority: 0.8,
    }))

    const cultureRoutes: MetadataRoute.Sitemap = (posts ?? []).map((post) => ({
      url: `${SITE}/culture/${post.slug}`,
      lastModified: fromUpdatedAt(post.updated_at),
      changeFrequency: 'monthly',
      priority: 0.7,
    }))

    const radioRoutes: MetadataRoute.Sitemap = (episodes ?? []).map((episode) => ({
      url: `${SITE}/radio#${episode.slug}`,
      lastModified: fromUpdatedAt(episode.published_at ?? episode.created_at),
      changeFrequency: 'monthly',
      priority: 0.55,
    }))

    const eventRoutes: MetadataRoute.Sitemap = (events ?? []).map((event) => ({
      url: `${SITE}/events/${event.slug}`,
      lastModified: fromUpdatedAt(event.updated_at),
      changeFrequency: 'monthly',
      priority: 0.65,
    }))

    return [...routes, ...themeRoutes, ...itemRoutes, ...cultureRoutes, ...radioRoutes, ...eventRoutes]
  } catch {
    return routes
  }
}