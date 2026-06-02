import 'dotenv/config'

const itemId = process.argv[2]
if (!itemId) throw new Error('Item id is required')

async function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

const password = process.env.STUDIO_PASSWORD
if (!password) throw new Error('STUDIO_PASSWORD is missing')

const login = await fetchWithTimeout('http://127.0.0.1:3000/studio/auth/start', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ password }),
})

if (!login.ok) throw new Error(`Studio login failed: ${login.status} ${await login.text()}`)
const cookie = login.headers.get('set-cookie')?.split(';')[0]
if (!cookie) throw new Error('Studio login did not return a cookie')

const get = await fetchWithTimeout(`http://127.0.0.1:3000/api/admin/items/${itemId}`, {
  headers: { cookie },
})

if (!get.ok) throw new Error(`Item fetch failed: ${get.status} ${await get.text()}`)
const item = await get.json()

async function updateStatus(status) {
  return fetchWithTimeout(`http://127.0.0.1:3000/api/admin/items/${itemId}`, {
  method: 'PUT',
  headers: {
    'content-type': 'application/json',
    cookie,
  },
  body: JSON.stringify({
    title: item.title,
    slug: item.slug,
    theme_id: item.theme_id,
    price: item.price,
    buy_url: item.buy_url,
    description: item.description,
    tags: item.tags,
    cover_image_url: item.cover_image_url,
    details: item.details,
    availability: item.availability,
    status,
  }),
})
}

if (process.env.RESET_DRAFT === '1') {
  const reset = await updateStatus('draft')
  if (!reset.ok) throw new Error(`Draft reset failed: ${reset.status} ${await reset.text()}`)
}

const put = await updateStatus('published')

const body = await put.json().catch(async () => ({ raw: await put.text() }))
console.log(JSON.stringify({ ok: put.ok, status: put.status, body }, null, 2))
if (!put.ok) process.exit(1)
