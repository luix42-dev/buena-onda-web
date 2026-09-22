-- Run in the Supabase SQL Editor. Not executed automatically.
-- Releases items left stuck at availability='reserved' by the pre-fix checkout
-- route (it reserved inventory before redirecting to Stripe and nothing ever
-- released it on an abandoned/expired checkout). Safe: only touches 'reserved'
-- rows, never 'sold' ones.

-- 1. Inspect what will change first.
select id, title, slug, availability, updated_at
from items
where availability = 'reserved'
order by updated_at desc;

-- 2. Release them back to available.
update items
set availability = 'available'
where availability = 'reserved';
