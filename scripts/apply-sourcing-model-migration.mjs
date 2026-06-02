import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

const sql = `
alter table items
  add column if not exists sourcing_model text not null default 'reservation'
  check (sourcing_model in ('reservation', 'direct'));

create index if not exists items_sourcing_model_idx on items (sourcing_model);
`

const rpcNames = ['exec_sql', 'execute_sql', 'run_sql']

for (const name of rpcNames) {
  const { error } = await supabase.rpc(name, { sql })
  if (!error) {
    console.log(JSON.stringify({ applied: true, rpc: name }, null, 2))
    process.exit(0)
  }
  console.error(`${name}: ${error.message}`)
}

console.error('No SQL execution RPC is available through Supabase REST.')
process.exit(1)
