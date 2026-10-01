-- Read-only inventory audit. Never blanket-release historical reservations.
select id, availability, updated_at from items where availability = 'reserved';
-- Check completed orders and processor payment evidence for every ID before any update.
