import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

const slugPrefix = `sourcing-model-test-${Date.now()}`

const { data: theme, error: themeError } = await supabase
  .from('themes')
  .select('id')
  .order('created_at', { ascending: true })
  .limit(1)
  .maybeSingle()

if (themeError) throw themeError

const rows = [
  {
    title: 'Sourcing Model Test Reservation Available',
    slug: `${slugPrefix}-reservation-available`,
    description: 'Test item for reservation sourcing.',
    price: 125,
    status: 'published',
    availability: 'available',
    sourcing_model: 'reservation',
  },
  {
    title: 'Sourcing Model Test Direct Available',
    slug: `${slugPrefix}-direct-available`,
    description: 'Test item for direct purchase sourcing.',
    price: 125,
    status: 'published',
    availability: 'available',
    sourcing_model: 'direct',
  },
  {
    title: 'Sourcing Model Test Reserved',
    slug: `${slugPrefix}-reserved`,
    description: 'Test item for reserved availability.',
    price: 125,
    status: 'published',
    availability: 'reserved',
    sourcing_model: 'reservation',
  },
  {
    title: 'Sourcing Model Test Sold',
    slug: `${slugPrefix}-sold`,
    description: 'Test item for sold availability.',
    price: 125,
    status: 'published',
    availability: 'sold',
    sourcing_model: 'direct',
  },
].map((row) => ({
  ...row,
  theme_id: theme?.id ?? null,
  tags: ['sourcing-model-test'],
  details: {},
  published_at: new Date().toISOString(),
}))

const { data, error } = await supabase
  .from('items')
  .insert(rows)
  .select('id,slug,sourcing_model,availability')

if (error) throw error

console.log(JSON.stringify({ items: data }, null, 2))
