'use client'
const places=[['1','North Ocean Drive'],['2','12th Street'],['3','11th Street'],['4','10th Street'],['5','8th Street'],['6','7th Street'],['7','6th Street'],['8','South Ocean Drive'],['9','Hotel Row'],['0','Where You Began']] as const
export default function OceanDrivePlaces(){
 return <><p>Explore the boulevard and all six side streets in your car. Use WASD or the touch stick to take the wheel. Pick a starting point below.</p><div className="os-rides">{places.map(([key,name])=><button key={key} data-return-world onClick={()=>window.dispatchEvent(new CustomEvent('cruise:ocean-travel',{detail:key}))}>{name}</button>)}</div></>
}
