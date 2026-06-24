export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.buenaondalifestyle.com').replace(/\/$/, '')

export const ORGANIZATION = {
  '@type': 'Organization',
  name: 'Buena Onda',
  description: 'Analog culture house based in Miami, est. 2014',
  url: SITE_URL,
  sameAs: ['https://instagram.com/buenaondalifestyle'],
}

export function absoluteUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

export function breadcrumbList(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    ...ORGANIZATION,
  }
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Buena Onda',
    url: SITE_URL,
    publisher: ORGANIZATION,
  }
}