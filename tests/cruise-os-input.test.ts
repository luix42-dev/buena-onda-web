import assert from 'node:assert/strict'
import test from 'node:test'
import {cruiseShortcut,pressedEdges} from '../lib/cruise-os/input'
import {stationShareUrl} from '../lib/human-radio/explore'
const base={editable:false,modal:false,started:true,modified:false,repeat:false}
test('shortcuts preserve text entry, native activation, dialogs and browser combinations',()=>{
 for(const flag of ['editable','modal','modified','repeat'] as const)for(const key of ['r','g','v','d',' ','Escape'])assert.equal(cruiseShortcut(key,{...base,[flag]:true}),null)
})
test('only music and secondary navigation are available before start',()=>{
 assert.equal(cruiseShortcut('R',{...base,started:false}),'radio')
 assert.equal(cruiseShortcut('g',{...base,started:false}),'glovebox')
 for(const key of ['v','d',' '])assert.equal(cruiseShortcut(key,{...base,started:false}),null)
 assert.equal(cruiseShortcut('v',base),'camera');assert.equal(cruiseShortcut('d',base),'cinematic');assert.equal(cruiseShortcut(' ',base),'park')
})
test('standard controller edges prevent held buttons from repeating',()=>{
 assert.deepEqual(pressedEdges([true,false,true],[false,false,true]),[0])
 assert.deepEqual(pressedEdges([true,false,true],[true,false,true]),[])
 assert.deepEqual(pressedEdges([false,false,false],[true,false,true]),[])
})
test('OS share links preserve explicit route and encode station, legacy defaults remain safe',()=>{
 assert.equal(new URL(stationShareUrl('https://example.com','jolt-radio','/cruise/prototype')).pathname,'/cruise/prototype')
 assert.equal(new URL(stationShareUrl('https://example.com','nts-1&car=bad','/cruise/os')).pathname,'/cruise/os')
 assert.equal(new URL(stationShareUrl('https://example.com','nts-1&car=bad','/cruise/os')).searchParams.get('car'),null)
 assert.equal(new URL(stationShareUrl('https://example.com','nts-1')).pathname,'/cruise/human-radio')
 assert.equal(new URL(stationShareUrl('https://example.com','nts-1','//bad.test' as never)).pathname,'/cruise/human-radio')
})
