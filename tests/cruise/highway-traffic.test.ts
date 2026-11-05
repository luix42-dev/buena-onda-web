import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createHighwayTraffic,stepHighwayTraffic} from '../../lib/cruise-os/highway-traffic'
const player={distance:0,lateral:2,speed:0}
test('traffic moves independently of a stationary player and freezes when paused',()=>{
 const cars=createHighwayTraffic(0),before=cars.map(c=>c.distance)
 stepHighwayTraffic(cars,player,[],.1,false)
 assert.ok(cars.every((c,i)=>c.oncoming?c.distance<before[i]:c.distance>before[i]))
 const stopped=JSON.stringify(cars);stepHighwayTraffic(cars,player,[],.1,true);assert.equal(JSON.stringify(cars),stopped)
})
test('drivers brake and stop behind an occupied lane without crossing the obstacle',()=>{
 const car=createHighwayTraffic(0)[0];car.distance=0;car.speed=30
 const obstacle={distance:70,lateral:car.lateral,speed:0};let braked=false
 for(let i=0;i<600;i++){stepHighwayTraffic([car],player,[obstacle],1/60,false);braked ||= car.brake>0;assert.ok(car.distance<=64)}
 assert.ok(braked);assert.ok(car.speed<1)
})
test('traffic on the opposite carriageway does not brake for the player',()=>{
 const car=createHighwayTraffic(0)[1],speed=car.speed
 stepHighwayTraffic([car],{distance:car.distance-10,lateral:2,speed:0},[],.1,false)
 assert.equal(car.speed,speed);assert.equal(car.brake,0)
})
