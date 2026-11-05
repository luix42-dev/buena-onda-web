export type HighwayDriver={id:number;distance:number;lateral:number;speed:number;cruise:number;oncoming:boolean;brake:number}
type Obstacle={distance:number;lateral:number;speed:number}
export function createHighwayTraffic(distance:number):HighwayDriver[]{
 return Array.from({length:24},(_,id)=>{
  const oncoming=id%2===1,slot=Math.floor(id/2)
  return {id,oncoming,distance:distance+90+slot*100,lateral:oncoming?-22.4+[-5.55,-1.85,1.85,5.55][slot%4]:[-5.55,5.55][slot%2],speed:25+id%7,cruise:25+id%7,brake:0}
 })
}
/** Independent drivers with a two-second following gap. Outer lanes leave the
 * touring pair's central passing lanes free; the opposing carriageway is separate. */
export function stepHighwayTraffic(cars:HighwayDriver[],player:Obstacle,leaders:Obstacle[],delta:number,paused:boolean){
 if(paused||!Number.isFinite(delta)||delta<=0)return
 const dt=Math.min(delta,.1),snapshot=cars.map(c=>({...c}))
 for(const car of cars){
  const dir=car.oncoming?-1:1
  const obstacles:Obstacle[]=snapshot.filter(c=>c.id!==car.id&&c.oncoming===car.oncoming)
  if(!car.oncoming)obstacles.push(player,...leaders)
  let target=car.cruise,nearest=Infinity
  for(const other of obstacles){
   const gap=(other.distance-car.distance)*dir
   if(Math.abs(other.lateral-car.lateral)<2.3&&gap>0){nearest=Math.min(nearest,gap);target=Math.min(target,Math.max(0,other.speed+(gap-8-car.speed*2)*.45))}
  }
  const acceleration=Math.max(-7,Math.min(1.5,(target-car.speed)*1.4))
  car.brake=acceleration<-.7?Math.min(1,-acceleration/5):0
  car.speed=Math.max(0,car.speed+acceleration*dt)
  // Contact guard prevents tunnelling into a stopped queue on a slow frame.
  car.distance+=dir*Math.min(car.speed*dt,Math.max(0,nearest-6))
  const relative=car.distance-player.distance
  if(relative < -180 || relative > 1800){
   let spawn=player.distance+850+car.id*29
   while(obstacles.some(o=>Math.abs(o.lateral-car.lateral)<2.3&&Math.abs(o.distance-spawn)<70))spawn+=90
   car.distance=spawn;car.speed=car.cruise;car.brake=0
  }
 }
}
