ALTER TABLE posts
ADD COLUMN post_type text NOT NULL DEFAULT 'culture'
CHECK (post_type IN ('transmission', 'culture'));
