-- New image/editorial columns on posts
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS hero_image               text,
  ADD COLUMN IF NOT EXISTS inline_image_1           text,
  ADD COLUMN IF NOT EXISTS inline_image_1_caption   text,
  ADD COLUMN IF NOT EXISTS inline_image_2           text,
  ADD COLUMN IF NOT EXISTS inline_image_2_caption   text,
  ADD COLUMN IF NOT EXISTS editorial_note           text;

-- Add source tracking to existing newsletter_subscribers
ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS source text;
