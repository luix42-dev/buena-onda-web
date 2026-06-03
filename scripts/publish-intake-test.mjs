import 'dotenv/config'
import { spawn } from 'node:child_process'
import fs from 'node:fs'

const responsePath = process.argv[2] ?? '/tmp/bo-intake-response.json'
const intake = fs.existsSync(responsePath) ? JSON.parse(fs.readFileSync(responsePath, 'utf8')) : { id: responsePath }
const itemId = intake.id

if (!itemId) {
  throw new Error(`No intake item id found in ${responsePath}`)
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForServer() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const response = await fetch('http://127.0.0.1:3000/studio/login')
      if (response.ok) return
    } catch {
      // keep waiting
    }
    await wait(1000)
  }
  throw new Error('Dev server did not become ready')
}

const server = spawn('npm', ['run', 'dev'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: {
    ...process.env,
    PATH: `/home/luix4/.nvm/versions/node/v20.20.2/bin:${process.env.PATH}`,
  },
})

server.stdout.on('data', (chunk) => process.stdout.write(chunk))
server.stderr.on('data', (chunk) => process.stderr.write(chunk))

try {
  await waitForServer()

  const password = process.env.STUDIO_PASSWORD
  if (!password) throw new Error('STUDIO_PASSWORD is missing')

  const login = await fetch('http://127.0.0.1:3000/studio/auth/start', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ password }),
  })

  if (!login.ok) throw new Error(`Studio login failed: ${login.status} ${await login.text()}`)
  const cookie = login.headers.get('set-cookie')?.split(';')[0]
  if (!cookie) throw new Error('Studio login did not return a cookie')

  const get = await fetch(`http://127.0.0.1:3000/api/admin/items/${itemId}`, {
    headers: { cookie },
  })

  if (!get.ok) throw new Error(`Item fetch failed: ${get.status} ${await get.text()}`)
  const item = await get.json()

  const put = await fetch(`http://127.0.0.1:3000/api/admin/items/${itemId}`, {
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
      status: 'published',
    }),
  })

  const body = await put.json().catch(async () => ({ raw: await put.text() }))
  console.log(JSON.stringify({ ok: put.ok, status: put.status, body }, null, 2))
  if (!put.ok) process.exitCode = 1
} finally {
  server.kill()
}
