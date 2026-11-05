import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createInputGate,parseControllerInput,validRoom} from '../../lib/cruise/controller-protocol'
const input=(seq:number)=>({kind:'input',seq,steer:.4,throttle:1,brake:0})
test('controller rejects malformed axes and sequences',()=>{
 for(const value of [null,{},input(-1),{...input(1),steer:NaN},{...input(1),throttle:2},{...input(1),brake:-1},{...input(1),seq:1.2}])assert.equal(parseControllerInput(value),null)
 assert.ok(parseControllerInput(input(0)));assert.equal(validRoom('123456'),false)
})
test('late input cannot restart a disarmed controller',()=>{
 const gate=createInputGate();assert.equal(gate.accept(input(1),0),null)
 gate.arm(0);assert.ok(gate.accept(input(2),20));assert.equal(gate.accept(input(1),25),null)
 assert.equal(gate.expired(600),false);assert.equal(gate.expired(700),true)
 assert.equal(gate.accept(input(3),701),null);gate.arm(702);assert.ok(gate.accept(input(4),703))
 gate.stop();assert.equal(gate.accept(input(5),704),null)
})
