CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  tagline TEXT,
  description TEXT,
  tags TEXT[],
  status TEXT DEFAULT 'recurring'
    CHECK (status IN ('recurring','one-time','archived')),
  venue_name TEXT,
  venue_city TEXT,
  cover_image_url TEXT,
  gallery JSONB DEFAULT '[]',
  videos JSONB DEFAULT '[]',
  playlist_url TEXT,
  audio_files JSONB DEFAULT '[]',
  partners JSONB DEFAULT '[]',
  archive_sheets JSONB DEFAULT '[]',
  archive_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
