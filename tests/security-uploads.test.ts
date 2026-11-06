import { test } from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { mediaContentType, safeStoragePath, readUploadForm, validateFile } from '../app/api/admin/upload/validation'
import { readLimitedBytes } from '../lib/api/request-security'
import { createStudioSession, STUDIO_COOKIE } from '../lib/studio-auth'
import { POST as signedUpload } from '../app/api/admin/upload-url/route'

test('media validation rejects active content, disguised files and unsafe object paths', async () => {
  assert.equal(mediaContentType('attack.svg', 'image/svg+xml', 'image'), null)
  assert.equal(mediaContentType('attack.html', 'text/html', 'audio'), null)
  assert.equal(mediaContentType('file.jpg', 'text/html', 'image'), null)
  assert.equal(mediaContentType('file.mp3', 'audio/mpeg', 'audio'), 'audio/mpeg')
  for (const path of ['../x.png', 'a/../x.png', '/x.png', 'a//x.png', 'a\\x.png', 'a/%2e%2e/x.png']) assert.equal(safeStoragePath(path), false)
  assert.equal(safeStoragePath('posts/culture/example/cover.jpg'), true)
  await assert.rejects(validateFile(new File(['<html>bad'], 'cover.jpg', { type: 'image/jpeg' }), 'image'), /does not match/)
  await assert.rejects(validateFile('not a file', 'image'), /No file/)
  const png = new File([new Uint8Array([0x89, 80, 78, 71, 13, 10, 26, 10])], 'cover.png', { type: 'image/png' })
  assert.equal((await validateFile(png, 'image')).contentType, 'image/png')
})

test('multipart bytes are bounded without Content-Length and valid binary stays intact', async () => {
  await assert.rejects(readLimitedBytes(new Request('https://example.test', { method: 'POST', body: new Uint8Array(1025) }), 1024), /too large/)
  const form = new FormData()
  form.set('file', new File([new Uint8Array([0xff, 0xd8, 0xff])], 'image.jpg', { type: 'image/jpeg' }))
  const parsed = await readUploadForm(new Request('https://example.test', { method: 'POST', body: form }))
  assert.equal((await validateFile(parsed.get('file'), 'image')).contentType, 'image/jpeg')
})

test('signed uploads restrict MIME type, prefix and key and sign the required Content-Type', async () => {
  const values = {
    STUDIO_PASSWORD: 'security-test-password', R2_ACCOUNT_ID: 'test-account',
    R2_ACCESS_KEY_ID: 'test-access', R2_SECRET_ACCESS_KEY: 'test-secret',
    R2_BUCKET_NAME: 'test-bucket', R2_PUBLIC_URL: 'https://media.example.test',
  }
  const saved = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]))
  Object.assign(process.env, values)
  try {
    const cookie = `${STUDIO_COOKIE}=${await createStudioSession()}`
    const call = (body: unknown) => signedUpload(new NextRequest('https://studio.example.test/api/admin/upload-url', {
      method: 'POST', headers: { cookie, origin: 'https://studio.example.test', 'content-type': 'application/json' }, body: JSON.stringify(body),
    }))
    for (const body of [null, { filename: 'x.html', contentType: 'text/html' },
      { filename: 'x.mp3', contentType: 'audio/mpeg', prefix: '../anything' },
      { filename: 'x.mp3', contentType: 'audio/mpeg', prefix: 'audio', key: 'cruise/audio/x.mp3' },
    ]) assert.equal((await call(body)).status, 400)
    const response = await call({ filename: 'song.mp3', contentType: 'audio/mpeg', prefix: 'audio' })
    assert.equal(response.status, 200)
    const body = await response.json()
    const url = new URL(body.uploadUrl)
    assert.equal(url.searchParams.get('X-Amz-SignedHeaders'), 'content-type;host')
    assert.equal(url.searchParams.get('X-Amz-Expires'), '900')
    assert.ok(body.key.startsWith('audio/'))
  } finally {
    for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value }
  }
})
