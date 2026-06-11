import { createClient } from '@supabase/supabase-js'

const themes = [
  {
    slug: 'curated-vintage',
    title: 'Curated Vintage',
    code: 'CV',
    description:
      'Garments and accessories sourced from private collections, estate sales, and deadstock inventories.',
  },
  {
    slug: 'analog-objects',
    title: 'Analog Objects',
    code: 'AO',
    description:
      'Furniture, lighting, and objects selected for the spaces where analog culture lives.',
  },
  {
    slug: 'sound-collection',
    title: 'Sound Collection',
    code: 'SC',
    description: 'Vinyl, gear, and audio equipment for the listening life.',
  },
  {
    slug: 'buena-onda-original',
    title: 'Buena Onda Original',
    code: 'BOO',
    description: 'Garments and objects designed and produced by Buena Onda.',
  },
]

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('SUPABASE: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})

let inserted = 0
let present = 0

for (const theme of themes) {
  const { data: existing, error: selectError } = await supabase
    .from('themes')
    .select('id')
    .eq('slug', theme.slug)
    .maybeSingle()

  if (selectError) throw selectError

  if (existing) {
    present += 1
    continue
  }

  const { error: insertError } = await supabase.from('themes').insert({
    ...theme,
    published: true,
  })

  if (insertError) throw insertError
  inserted += 1
}

console.log(JSON.stringify({ inserted, alreadyPresent: present, total: themes.length }, null, 2))
