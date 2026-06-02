export type ItemAvailability = 'available' | 'reserved' | 'sold'
export type ItemSourcingModel = 'reservation' | 'direct'
export type ItemStatus       = 'draft' | 'published' | 'archived' | 'sold_out'

export interface Theme {
  id:    string
  title: string
  code:  string
}

export interface ItemImage {
  id:           string
  item_id:      string
  url:          string
  storage_path: string | null
  alt_text:     string | null
  sort_order:   number
}

export interface Item {
  id:              string
  title:           string
  slug:            string
  catalog_number:  string | null
  theme_id:        string | null
  theme?:          Theme
  description:     string | null
  details:         Record<string, string> | null
  price:           number | null
  buy_url:         string | null
  tags:            string[]
  status:          ItemStatus
  availability:    ItemAvailability
  sourcing_model:  ItemSourcingModel
  featured:        boolean
  cover_image_url: string | null
  published_at:    string | null
  created_at:      string
  updated_at:      string
}
