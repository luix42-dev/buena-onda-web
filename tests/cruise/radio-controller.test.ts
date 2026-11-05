import {test} from 'node:test'
import assert from 'node:assert/strict'
import {parseRadioVolume,radioStatus} from '../../lib/cruise/radio-controller'
import {parseRadioRemoteCommand} from '../../lib/cruise/controller-protocol'

test('radio status follows confirmed playback rather than a play request',()=>{
 const base={requested:false,playing:false,loading:false,available:false,error:null}
 assert.equal(radioStatus(base),'idle')
 assert.equal(radioStatus({...base,requested:true,loading:true}),'loading')
 assert.equal(radioStatus({...base,requested:true,playing:true,loading:true}),'buffering')
 assert.equal(radioStatus({...base,requested:true,playing:true,loading:false}),'playing')
 assert.equal(radioStatus({...base,available:true}),'paused')
 assert.equal(radioStatus({...base,requested:true,error:'Signal unavailable'}),'error')
})

test('stored volume is bounded and malformed values fall back safely',()=>{
 assert.equal(parseRadioVolume(null),.82)
 assert.equal(parseRadioVolume('0'),0)
 assert.equal(parseRadioVolume('0.55'),.55)
 for(const value of ['-1','1.1','Infinity','broken'])assert.equal(parseRadioVolume(value),.82)
})

test('phone radio protocol rejects malformed and unsupported commands',()=>{
 assert.deepEqual(parseRadioRemoteCommand({kind:'radio-command',version:2,id:3,action:'volume',value:.4}),{kind:'radio-command',version:2,id:3,action:'volume',value:.4})
 for(const value of [{kind:'radio-command',version:1,id:1,action:'pause'},{kind:'radio-command',version:2,id:-1,action:'pause'},{kind:'radio-command',version:2,id:1,action:'record'},{kind:'radio-command',version:2,id:1,action:'tune',stationId:'../../secrets'},{kind:'radio-command',version:2,id:1,action:'volume',value:2}])assert.equal(parseRadioRemoteCommand(value),null)
})
