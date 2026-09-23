import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hasStudioAccess } from '../lib/studio-auth'

function withEnv(env: Record<string, string | undefined>, fn: () => void) {
  const saved = { STUDIO_PASSWORD: process.env.STUDIO_PASSWORD, NODE_ENV: process.env.NODE_ENV }
  Object.assign(process.env, env)
  for (const [key, value] of Object.entries(env)) if (value === undefined) delete process.env[key]
  try { fn() } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

test('authorized studio session is allowed', () => {
  withEnv({ STUDIO_PASSWORD: 'correct horse', NODE_ENV: 'production' }, () => {
    assert.equal(hasStudioAccess('correct horse'), true)
  })
})

test('missing or wrong session is rejected', () => {
  withEnv({ STUDIO_PASSWORD: 'correct horse', NODE_ENV: 'production' }, () => {
    assert.equal(hasStudioAccess(undefined), false)
    assert.equal(hasStudioAccess('guess'), false)
  })
})

test('production fails closed when STUDIO_PASSWORD is not configured', () => {
  withEnv({ STUDIO_PASSWORD: undefined, NODE_ENV: 'production' }, () => {
    assert.equal(hasStudioAccess(undefined), false)
    assert.equal(hasStudioAccess('anything'), false)
  })
})
