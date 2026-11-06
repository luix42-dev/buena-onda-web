import test from 'node:test'
import assert from 'node:assert/strict'

test('custom Cast cancellation preserves local ownership; receiver playback gates transfer and commands',async()=>{
 process.env.NEXT_PUBLIC_CRUISE_CAST_APP_ID='test-only-app'
 process.env.NEXT_PUBLIC_CRUISE_CAST_STATIONS='jolt-radio'
 let cancelled=true,current:any=null,onMessage:any,changed:any
 const sent:any[]=[]
 const receiver={addMessageListener:(_n:string,fn:any)=>{onMessage=fn},removeMessageListener:()=>{},sendMessage:async(_n:string,m:any)=>{sent.push(m)},getCastDevice:()=>({friendlyName:'Test TV'})}
 const context={setOptions:()=>{},getCurrentSession:()=>current,addEventListener:(_n:string,fn:any)=>{changed=fn},removeEventListener:()=>{},requestSession:async()=>{if(cancelled)throw 'cancel';current=receiver;changed()},endCurrentSession:()=>{current=null;changed()}}
 const win=Object.assign(new EventTarget(),{cast:{framework:{CastContext:{getInstance:()=>context},CastContextEventType:{SESSION_STATE_CHANGED:'session'}}},chrome:{cast:{AutoJoinPolicy:{ORIGIN_SCOPED:'origin'}}}})
 Object.defineProperty(globalThis,'window',{value:win,configurable:true})
 const cast=await import('../lib/cruise/google-cast')
 await cast.loadCastSdk();cast.attachCast(()=>{},()=>{})
 assert.equal(await cast.requestCast({type:'sync',station:'jolt-radio',playing:true}),false)
 assert.equal(cast.castIsRemote(),false)
 cancelled=false;assert.equal(await cast.requestCast({type:'sync',station:'jolt-radio',playing:true}),true)
 onMessage('',JSON.stringify({version:1,type:'state',ready:true,playing:false,station:'jolt-radio',volume:.5,muted:false}))
 assert.equal(cast.castIsRemote(),false,'local audio retained before receiver plays')
 onMessage('',JSON.stringify({version:1,type:'state',ready:true,playing:true,station:'jolt-radio',volume:.5,muted:false}))
 assert.equal(cast.castIsRemote(),true);assert.equal(cast.castDeviceName(),'Test TV')
 assert.equal(cast.sendCast({type:'pause'}),true);assert.equal(sent.at(-1).type,'pause')
 assert.equal(cast.sendCast({type:'station',station:'not-validated'}),false)
 assert(sent.every((m,i)=>i===0||m.sequence>sent[i-1].sequence))
 cast.disconnectCast();assert.equal(cast.castIsRemote(),false)
 delete (globalThis as any).window
})
