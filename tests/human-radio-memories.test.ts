import {test} from 'node:test'
import assert from 'node:assert/strict'
import {addRadioMoment,emptyRadioMemories,mergeRadioMemories,parseRadioMemories,removeRadioMoment,type RadioMoment,type RadioSession} from '../lib/human-radio/memories'

const time='2026-10-23T12:00:00.000Z'
const session:RadioSession={id:'session-1',startedAt:time,endedAt:null,stations:[{stationId:'jolt-radio',startedAt:time,endedAt:null}],momentIds:[],artwork:{palette:'bottle-green',title:'The long way'},rights:'metadata-only'}
const moment:RadioMoment={id:'moment-1',sessionId:'session-1',stationId:'jolt-radio',stationName:'Jolt Radio',savedAt:time,show:null,note:'Great drums',stationUrl:'https://www.joltradio.org/',identification:'unknown'}

test('unknown listening moments stay distinct from verified songs and contain no audio',()=>{
 const result=addRadioMoment({...emptyRadioMemories(),sessions:[session]},moment)
 assert.equal(result.moments[0].identification,'unknown')
 assert.deepEqual(result.sessions[0].momentIds,['moment-1'])
 assert.equal(JSON.stringify(result).includes('audioUrl'),false)
 assert.deepEqual(removeRadioMoment(result,'moment-1').sessions[0].momentIds,[])
})

test('versioned moment parser bounds data and drops unsafe station URLs',()=>{
 const source=addRadioMoment({...emptyRadioMemories(),sessions:[session]},{...moment,stationUrl:'javascript:alert(1)'})
 const parsed=parseRadioMemories(JSON.stringify(source))
 assert.equal(parsed.moments[0].stationUrl,null)
 assert.equal(parsed.version,2)
 assert.throws(()=>parseRadioMemories(JSON.stringify({...source,version:3})))
 assert.deepEqual(parseRadioMemories(null),emptyRadioMemories())
})

test('restoring memories keeps existing moments and deduplicates matching ids',()=>{
 const existing=addRadioMoment({...emptyRadioMemories(),sessions:[session]},moment)
 const imported=addRadioMoment({...emptyRadioMemories(),sessions:[{...session,id:'session-2'}]},{...moment,id:'moment-2',sessionId:'session-2'})
 const restored=mergeRadioMemories(existing,imported)
 assert.deepEqual(new Set(restored.moments.map(item=>item.id)),new Set(['moment-1','moment-2']))
 assert.equal(restored.sessions.length,2)
 assert.equal(mergeRadioMemories(restored,imported).moments.length,2)
 const sameSession=addRadioMoment({...emptyRadioMemories(),sessions:[session]},{...moment,id:'moment-3'})
 const merged=mergeRadioMemories(existing,sameSession)
 assert.deepEqual(new Set(merged.sessions[0].momentIds),new Set(['moment-1','moment-3']))
})
