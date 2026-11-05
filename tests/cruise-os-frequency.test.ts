import assert from 'node:assert/strict'
import test from 'node:test'
import {forwardMeters,nextFrequencyPlace} from '../lib/cruise-os/frequency'
const places=[{id:'a',name:'A',meters:100},{id:'b',name:'B',meters:400},{id:'far',name:'Far',meters:6000}]
test('geographic guide handles forward travel and a looping route without teleporting',()=>{
 assert.equal(forwardMeters(9900,100,10000),200)
 assert.equal(nextFrequencyPlace(places,9900,10000)?.id,'a')
 assert.equal(nextFrequencyPlace(places,80,10000)?.id,'b')
 assert.equal(nextFrequencyPlace(places,1000,10000),null)
})
test('guide rejects invalid route information and never invents a destination',()=>{
 assert.equal(forwardMeters(NaN,10,100),null);assert.equal(forwardMeters(10,20,0),null)
 assert.equal(nextFrequencyPlace([],0,10000),null);assert.equal(nextFrequencyPlace(places,0,-100),null)
 assert.equal(nextFrequencyPlace(places,Infinity,10000),null)
})
