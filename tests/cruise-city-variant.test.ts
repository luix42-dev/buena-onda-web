import test from 'node:test'
import assert from 'node:assert/strict'
import {cruiseCityVariant} from '../lib/cruise-os/city-variant'

test('City opens the mapped district mix by default while old and standalone variants stay explicit',()=>{
  assert.equal(cruiseCityVariant(null),'district')
  assert.equal(cruiseCityVariant('district'),'district')
  assert.equal(cruiseCityVariant('hybrid'),'hybrid')
  assert.equal(cruiseCityVariant('legacy'),'legacy')
  assert.equal(cruiseCityVariant('source'),'source')
  assert.equal(cruiseCityVariant('unexpected'),'district')
})
