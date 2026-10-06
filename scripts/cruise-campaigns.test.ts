import assert from 'node:assert/strict'
import { test } from 'node:test'

import { CRUISE_CAMPAIGNS, DEFAULT_CRUISE_CAMPAIGN, resolveCruiseCampaign } from '../lib/cruise/campaigns'

test('campaign manifest contains unique closed IDs and all three V1 formats', () => {
  assert.equal(new Set(CRUISE_CAMPAIGNS.map(campaign => campaign.id)).size, CRUISE_CAMPAIGNS.length)
  for (const campaign of CRUISE_CAMPAIGNS) {
    assert.deepEqual(Object.keys(campaign.creatives).sort(), ['billboard', 'poster', 'wall'])
    assert(campaign.destination === null || campaign.destination.startsWith('/'))
  }
})

test('known campaign IDs resolve without interpreting input as a URL', () => {
  assert.equal(resolveCruiseCampaign('vice-nights').campaign.id, 'vice-nights')
  const hostile = resolveCruiseCampaign('https://example.com/creative.png')
  assert.equal(hostile.valid, false)
  assert.equal(hostile.campaign.id, DEFAULT_CRUISE_CAMPAIGN.id)
})

test('duplicate query parameters use only the first known value', () => {
  assert.equal(resolveCruiseCampaign(['onda-tropical', 'vice-nights']).campaign.id, 'onda-tropical')
  assert.equal(resolveCruiseCampaign(['invalid', 'vice-nights']).valid, false)
})
