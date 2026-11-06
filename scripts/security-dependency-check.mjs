// Small, offline compatibility checks for security dependency overrides.
// Does not send notifications, call providers, or download inference models.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import sharp from 'sharp'
import Anthropic from '@anthropic-ai/sdk'

const require = createRequire(import.meta.url)
const originalFetch = globalThis.fetch
globalThis.fetch = async () => { throw new Error('Dependency smoke checks forbid external network calls') }

try {
  const png = await sharp({ create: { width: 3, height: 2, channels: 4, background: '#008080' } }).png().toBuffer()
  for (const format of ['jpeg', 'webp']) {
    const encoded = await sharp(png).toFormat(format).toBuffer()
    const metadata = await sharp(encoded).metadata()
    assert.equal(metadata.width, 3)
    assert.equal(metadata.height, 2)
    assert.equal(metadata.format, format)
  }

  const background = await import('@imgly/background-removal-node')
  // Exercise its Zod 3 function schema before inference/model loading begins.
  await assert.rejects(background.removeBackground(new Uint8Array(), { model: 'invalid-fixture-model' }), error => error?.name === 'ZodError')

  const notifierRequire = createRequire(require.resolve('node-notifier'))
  const uuid = notifierRequire('uuid')
  assert.equal(uuid.validate(uuid.v4()), true)
  assert.equal(typeof require('node-notifier').notify, 'function')

  const sdk = new Anthropic({
    apiKey: 'fixture-only',
    fetch: async input => {
      assert.equal(new URL(String(input)).hostname, 'api.anthropic.com')
      return new Response(JSON.stringify({
        id: 'msg_fixture', type: 'message', role: 'assistant', model: 'fixture',
        content: [{ type: 'text', text: 'fixture' }], stop_reason: 'end_turn', stop_sequence: null,
        usage: { input_tokens: 1, output_tokens: 1 },
      }), { headers: { 'content-type': 'application/json' } })
    },
  })
  assert.equal((await sdk.messages.create({ model: 'fixture', max_tokens: 1, messages: [{ role: 'user', content: 'fixture' }] })).id, 'msg_fixture')

  if (!process.argv.includes('--native-only')) {
    const nextRequire = createRequire(require.resolve('next'))
    assert.equal(nextRequire('postcss/package.json').version, '8.5.32')
    const { render } = await import('@react-email/render')
    const React = await import('react')
    assert.match(await render(React.createElement('p', null, 'Fixture email')), /Fixture email/)
    console.log('PASS: Next PostCSS, email renderer')
  }
  console.log('PASS: sharp codecs, IMG.LY schema, notifier UUID, SDK transport')
} finally {
  globalThis.fetch = originalFetch
}
