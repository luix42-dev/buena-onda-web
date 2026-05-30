import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.buenaondalifestyle.com'

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: `${BASE_URL}/`,        lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 },
  { url: `${BASE_URL}/themes`,  lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
  { url: `${BASE_URL}/culture`, lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
  { url: `${BASE_URL}/radio`,   lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
  { url: `${BASE_URL}/about`,   lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) return STATIC_ROUTES

  try {
    const supabase = createClient(url, key)

    const [{ data: items }, { data: themes }] = await Promise.all([
      supabase
        .from('items')
        .select('slug, updated_at')
        .in('status', ['published', 'sold_out']),
      supabase
        .from('themes')
        .select('slug, updated_at')
        .eq('published', true),
    ])

    const itemRoutes: MetadataRoute.Sitemap = (items ?? []).map(item => ({
      url: `${BASE_URL}/items/${item.slug}`,
      lastModified: new Date(item.updated_at),
      changeFrequency: 'monthly',
      priority: 0.7,
    }))

    const themeRoutes: MetadataRoute.Sitemap = (themes ?? []).map(theme => ({
      url: `${BASE_URL}/themes/${theme.slug}`,
      lastModified: new Date(theme.updated_at),
      changeFrequency: 'monthly',
      priority: 0.75,
    }))

    return [...STATIC_ROUTES, ...themeRoutes, ...itemRoutes]
  } catch {
    return STATIC_ROUTES
  }
}
