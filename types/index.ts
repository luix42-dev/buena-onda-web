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
  status?: 'draft' | 'live' | null
  instagram_url?: string | null
  hero_image?: string | null
  inline_image_1?: string | null
  inline_image_1_caption?: string | null
  inline_image_2?: string | null
  inline_image_2_caption?: string | null
  editorial_note?: string | null
}

export interface TransmissionIssue {
  id: string
  title: string
  slug: string
  excerpt: string | null
  body: string | null
  status: 'draft' | 'live'
  published_at: string | null
  created_at: string
  updated_at: string
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
  why_chosen: string | null
  details: Record<string, string> | null
  price: number | null
  buy_url: string | null
  tags: string[] | null
  status:       'draft' | 'published' | 'archived' | 'sold_out'
  availability: 'available' | 'reserved' | 'sold'
  sourcing_model: 'reservation' | 'direct'
  featured: boolean
  cover_image_url?: string | null
  primary_image_url?: string | null
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

export interface ItemNotifyRequest {
  id:         string
  item_id:    string
  email:      string
  created_at: string
}

export interface Order {
  id: string
  item_id: string
  customer_email: string | null
  customer_name: string | null
  stripe_session_id: string
  stripe_payment_intent_id: string | null
  status: 'pending' | 'paid' | 'failed' | 'canceled'
  amount_total: number
  currency: string
  created_at: string
  updated_at: string
}

// ── Cruise ──────────────────────────────────────────────────────────────────

export interface CruiseScene {
  id: string
  city: string
  city_label: string
  route_label: string | null
  time_of_day: string
  title: string
  video_key: string | null
  duration_seconds: number | null
  sort: number
  published: boolean
  created_at: string
}

export interface CruiseChannel {
  id: string
  name: string
  slug: string
  track_keys: string[]
  sort: number
  published: boolean
  created_at: string
}
