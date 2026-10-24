import { createClient } from '@supabase/supabase-js'

export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is required')
  if (!key) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required')

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      // supabase-js sends an Authorization header (the anon key). Next.js
      // treats an Authorization header with no explicit cache option as
      // uncacheable, which silently turned every [slug] page into a fully
      // dynamic render (private, no-store; 1-2s TTFB per click). An explicit
      // revalidate keeps these public reads in the ISR data cache;
      // revalidatePath() in the admin/webhook routes still purges them.
      fetch: (input, init) => fetch(input, {
        ...init,
        next: { revalidate: PUBLIC_REVALIDATE_SECONDS },
      }),
    },
  })
}

export const PUBLIC_REVALIDATE_SECONDS = 300

export function createPublicServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is required')
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required')

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) => fetch(input, {
        ...init,
        cache: 'force-cache',
        next: { revalidate: 300 },
      }),
    },
  })
}
