import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatShippingLines, shippingCountries, shippingFromSession } from '../lib/shipping'

const address = { line1: '1 Ocean Dr', line2: null, city: 'Miami Beach', state: 'FL', postal_code: '33139', country: 'US' }

test('reads shipping from the pinned API shape', () => {
  const shipping = shippingFromSession({ shipping_details: { name: 'A Buyer', address }, customer_details: { phone: '+13055550100' } })
  assert.equal(shipping?.city, 'Miami Beach')
  assert.equal(shipping?.phone, '+13055550100')
  assert.deepEqual(formatShippingLines(shipping!), ['A Buyer', '1 Ocean Dr', 'Miami Beach, FL, 33139', 'US', '+13055550100'])
})

test('reads shipping from the newer collected_information shape', () => {
  const shipping = shippingFromSession({ collected_information: { shipping_details: { name: 'B', address } } })
  assert.equal(shipping?.postal_code, '33139')
})

test('missing shipping address is reported as null, not an empty address', () => {
  assert.equal(shippingFromSession({}), null)
  assert.equal(shippingFromSession({ shipping_details: { name: 'x', address: { line1: null } } }), null)
})

test('allowed countries default to the published US delivery policy and accept config', () => {
  delete process.env.SHIPPING_ALLOWED_COUNTRIES
  assert.deepEqual(shippingCountries(), ['US'])
  process.env.SHIPPING_ALLOWED_COUNTRIES = 'us, pr ,bogus'
  assert.deepEqual(shippingCountries(), ['US', 'PR'])
  delete process.env.SHIPPING_ALLOWED_COUNTRIES
})
