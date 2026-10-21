/** Small kinematic presentation model, not a tire/collision simulator.
 * Road texture is an authored millimetre-scale profile, sampled by distance.
 * Springs respond independently of frame rate; tires are not attached to the
 * sprung body's visual roll/pitch. Units: metres, seconds, radians. */
export type VehicleFeel = {heave:number;pitch:number;roll:number;steering:number;frontSteer:number;frontRoad:number;rearRoad:number;hv:number;pv:number;rv:number}
export const createVehicleFeel=():VehicleFeel=>({heave:0,pitch:0,roll:0,steering:0,frontSteer:0,frontRoad:0,rearRoad:0,hv:0,pv:0,rv:0})
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x))
export function roadMicroProfile(distance:number){
  const joint=((distance%11)+11)%11
  return .0022*Math.sin(distance*1.7)+.0012*Math.sin(distance*4.1)+.004*Math.exp(-Math.pow((joint-.24)/.14,2))
}
export function stepVehicleFeel(m:VehicleFeel,input:{distance:number;speed:number;acceleration:number;curvature:number;wheel:number;paused:boolean;reduced:boolean;focused:boolean},delta:number){
  if(!Number.isFinite(delta)||delta<=0)return m
  const active=!input.paused&&!input.reduced&&!input.focused
  const speed=input.paused?0:Math.max(0,input.speed),strength=active?Math.min(1,speed/5):0
  m.frontRoad=roadMicroProfile(input.distance+1.225)*strength
  m.rearRoad=roadMicroProfile(input.distance-1.225)*strength
  const lateral=clamp(-input.curvature*speed*speed,-3,3)
  const heave=(m.frontRoad+m.rearRoad)/2
  const pitch=active?clamp((m.frontRoad-m.rearRoad)/2.45+input.acceleration*.003,-.018,.018):0
  const roll=active?clamp(lateral*.0045,-.014,.014):0
  let remaining=Math.min(delta,.1)
  while(remaining>1e-7){
    const dt=Math.min(remaining,1/120);remaining-=dt
    for(const [value,velocity,target,frequency] of [['heave','hv',heave,12],['pitch','pv',pitch,10],['roll','rv',roll,9]] as const){
      m[velocity]+=(frequency*frequency*(target-m[value])-2*.78*frequency*m[velocity])*dt
      m[value]+=m[velocity]*dt
    }
    // Bicycle steering follows the actual route; cabin wheel uses a 13:1 ratio.
    const roadWheel=clamp(Math.atan(input.curvature*2.45),-.48,.48)
    m.frontSteer+=(roadWheel-m.frontSteer)*(1-Math.exp(-9*dt))
    const wheel=clamp(roadWheel*13,-2.6,2.6)
    m.steering+=(wheel-m.steering)*(1-Math.exp(-8*dt))
  }
  return m
}
