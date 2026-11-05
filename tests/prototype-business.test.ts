import test from 'node:test'
import assert from 'node:assert/strict'
import {createDemoBusinessRecorder,type DemoBusinessEvent} from '../components/experience/prototype-business'

test('qualified opportunity records once per continuous placement encounter, separate from deliberate activation',()=>{
  const events:DemoBusinessEvent[]=[];const recorder=createDemoBusinessRecorder(event=>events.push(event))
  for(let at=2000;at<7000;at+=250)recorder.opportunity('house','sign',true,at)
  assert.equal(events.length,1);assert.equal(events[0].type,'opportunity')
  recorder.activate('house','sign','world',7000)
  recorder.activate('house','sign','world',7001)
  assert.equal(events.length,2);assert.equal(events[1].type,'activation')
  recorder.opportunity('house','sign',false,7200)
  recorder.opportunity('house','sign',true,9500)
  assert.equal(events.length,3)
})

test('retiring one placement preserves other opportunity dedup; obscuring resets encounters',()=>{
  const events:DemoBusinessEvent[]=[];const recorder=createDemoBusinessRecorder(event=>events.push(event))
  recorder.opportunity('a','one',true,2000);recorder.opportunity('b','two',true,2000)
  recorder.retain(new Set(['b:two']))
  recorder.opportunity('b','two',true,2250);assert.equal(events.length,2)
  recorder.opportunity('a','one',true,2500);assert.equal(events.length,3)
  recorder.resetOpportunities();recorder.opportunity('b','two',true,5000);assert.equal(events.length,4)
})

test('local recorder emits bounded explicit test fields without storage, network or music identifiers',()=>{
  const events:DemoBusinessEvent[]=[];const recorder=createDemoBusinessRecorder(event=>events.push(event))
  recorder.activate('demo','directory','directory',100)
  recorder.activate('demo','directory','directory',NaN)
  recorder.opportunity('demo','sign',true,Infinity)
  assert.equal(events.length,1)
  assert.deepEqual(Object.keys(events[0]).sort(),['atMs','campaignId','label','placementId','surface','type'])
  assert.equal(events[0].label,'DEMO / TEST')
  assert.equal(recorder.activate('demo','directory','directory',800),true)
})
