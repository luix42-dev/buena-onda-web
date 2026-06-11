import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

const { error } = await supabase
  .from('items')
  .select('id,sourcing_model')
  .limit(1)

if (error) {
  console.log(JSON.stringify({ exists: false, error: error.message }, null, 2))
  process.exit(1)
}

console.log(JSON.stringify({ exists: true }, null, 2))
