export type EventStatus = 'recurring' | 'one-time' | 'archived'

export type EventGalleryItem = {
  image: string
  caption?: string
}

export type EventVideo = {
  url: string
  label?: string
}

export type EventAudioFile = {
  file: string
  label: string
}

export type EventPartner = {
  name: string
  logo?: string
}

export type EventArchiveSheet = {
  file: string
  label: string
}

export interface LiveEvent {
  id: string
  name: string
  slug: string
  tagline: string | null
  description: string | null
  tags: string[] | null
  status: EventStatus
  venue_name: string | null
  venue_city: string | null
  event_date: string | null
  lineup: string | null
  cover_image_url: string | null
  gallery: EventGalleryItem[] | null
  videos: EventVideo[] | null
  playlist_url: string | null
  audio_files: EventAudioFile[] | null
  partners: EventPartner[] | null
  archive_sheets: EventArchiveSheet[] | null
  archive_notes: string | null
  created_at: string
  updated_at: string
}
