import { createServiceRoleClient } from '@/lib/supabase/service-role'

export const dynamic = 'force-dynamic'

type ThemeRow = {
  id: string
  slug: string
  title: string
}

type ItemImageRow = {
  url: string
  sort_order: number
}

type FeedItemRow = {
  id: string
  slug: string
  title: string
  description: string | null
  why_chosen: string | null
  price: number | null
  availability: 'available' | 'reserved' | 'sold' | null
  theme_id: string | null
  theme: ThemeRow | null
  images: ItemImageRow[] | null
}

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://buenaondalifestyle.com').replace(/\/$/, '')

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function asHttpsUrl(value: string | null | undefined) {
  if (!value) return null

  try {
    const normalized = new URL(value, BASE_URL)
    if (normalized.protocol === 'http:') normalized.protocol = 'https:'
    return normalized.toString()
  } catch {
    return null
  }
}

function truncateTitle(value: string) {
  return value.length <= 70 ? value : `${value.slice(0, 67).trimEnd()}...`
}

function getAvailability(value: FeedItemRow['availability']) {
  if (value === 'reserved' || value === 'sold') return 'out of stock'
  return 'in stock'
}

function getCondition(themeSlug: string | null | undefined) {
  if (themeSlug === 'buena-onda-original') return 'new'
  if (
    themeSlug === 'curated-vintage' ||
    themeSlug === 'analog-objects' ||
    themeSlug === 'sound-collection'
  ) {
    return 'used'
  }
  return 'used'
}

function buildDescription(item: FeedItemRow) {
  const raw = item.description?.trim() || item.why_chosen?.trim() || item.title
  return raw.length <= 5000 ? raw : `${raw.slice(0, 4997).trimEnd()}...`
}

function tag(name: string, value: string | null | undefined) {
  if (!value) return ''
  return `<g:${name}>${escapeXml(value)}</g:${name}>`
}

export async function GET() {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('items')
    .select('id,slug,title,description,why_chosen,price,availability,theme_id,theme:themes(id,slug,title),images:item_images(url,sort_order)')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  if (error) {
    return new Response(error.message, { status: 500 })
  }

  const rows = (data ?? []) as Array<FeedItemRow & { theme: ThemeRow | ThemeRow[] | null }>

  const items = rows
    .map(row => {
      const theme = Array.isArray(row.theme) ? row.theme[0] ?? null : row.theme
      const imageList = [...(row.images ?? [])].sort((a, b) => a.sort_order - b.sort_order)
      const cover = asHttpsUrl(imageList[0]?.url)
      const extras = imageList
        .map(image => asHttpsUrl(image.url))
        .filter((url): url is string => Boolean(url) && url !== cover)
      return { ...row, theme, cover, extras }
    })
    .filter(item => item.cover)

  const xmlItems = items.map(item => {
    const productUrl = `${BASE_URL}/items/${encodeURIComponent(item.slug)}`
    const themeSlug = item.theme?.slug ?? null
    const themeTitle = item.theme?.title ?? null
    const groupId = item.theme_id ?? null
    const price = item.price != null ? `${item.price.toFixed(2)} USD` : null

    return [
      '<item>',
      `<g:id>${escapeXml(item.id)}</g:id>`,
      `<title>${escapeXml(truncateTitle(item.title))}</title>`,
      `<description>${escapeXml(buildDescription(item))}</description>`,
      `<link>${escapeXml(productUrl)}</link>`,
      `<g:image_link>${escapeXml(item.cover!)}</g:image_link>`,
      ...item.extras.slice(0, 10).map(url => `<g:additional_image_link>${escapeXml(url)}</g:additional_image_link>`),
      `<g:availability>${escapeXml(getAvailability(item.availability))}</g:availability>`,
      `<g:condition>${escapeXml(getCondition(themeSlug))}</g:condition>`,
      tag('price', price),
      '<g:brand>Buena Onda</g:brand>',
      tag('product_type', themeTitle ?? themeSlug),
      tag('item_group_id', groupId),
      '</item>',
    ].join('')
  })

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    '<channel>',
    '<title>Buena Onda Product Feed</title>',
    `<link>${escapeXml(BASE_URL)}</link>`,
    '<description>Published Buena Onda catalog items for Meta Commerce Manager.</description>',
    ...xmlItems,
    '</channel>',
    '</rss>',
  ].join('')

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 's-maxage=900, stale-while-revalidate=86400',
    },
  })
}
