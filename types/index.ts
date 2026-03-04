export interface Post {
  id: string
  title: string
  slug: string
  excerpt: string | null
  body: string | null
  cover_image: string | null
  tags: string[] | null
  published_at: string | null
  created_at: string
  updated_at: string
  published: boolean
}

export interface Episode {
  id: string
  title: string
  slug: string
  description: string | null
  audio_url: string | null
  cover_image: string | null
  duration: number | null
  episode_number: number | null
  tags: string[] | null
  published_at: string | null
  created_at: string
  published: boolean
}

export interface Drop {
  id: string
  name: string
  slug: string
  description: string | null
  price: number | null
  images: string[] | null
  status: 'upcoming' | 'live' | 'sold_out'
  drop_date: string | null
  created_at: string
  available: boolean
}

export interface MediaAsset {
  id: string
  filename: string
  url: string
  type: 'image' | 'audio' | 'video' | null
  width: number | null
  height: number | null
  size: number | null
  alt_text: string | null
  tags: string[] | null
  created_at: string
}

export interface SiteSetting {
  key: string
  value: Record<string, unknown>
  updated_at: string
}

export interface NavLink {
  href: string
  label: string
  external?: boolean
}

// ── Catalog ──────────────────────────────────────────────────────────────────

export interface Theme {
  id: string
  title: string
  slug: string
  code: string
  description: string | null
  editorial_text: string | null
  cover_image: string | null
  featured: boolean
  published: boolean
  sort_order: number
  created_at: string
  updated_at: string
  items?: Item[]
}

export interface Item {
  id: string
  title: string
  slug: string
  catalog_number: string | null
  theme_id: string | null
  description: string | null
  details: Record<string, string> | null
  price: number | null
  buy_url: string | null
  tags: string[] | null
  status: 'draft' | 'published' | 'archived'
  featured: boolean
  cover_image_url: string | null
  published_at: string | null
  created_at: string
  updated_at: string
  theme?: Theme
  images?: ItemImage[]
}

export interface ItemImage {
  id: string
  item_id: string
  url: string
  storage_path: string | null
  alt_text: string | null
  sort_order: number
  created_at: string
}
