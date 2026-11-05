'use client'
import type {RideVehicleId} from '@/lib/real-miami/ride-vehicles'
import type {DriveMode} from '@/components/cruise-os/DriveDeck'
import RidePicker from '@/components/real-miami/jeep/RidePicker'
import './prototype-opening.css'

const roadRides: readonly RideVehicleId[] = ['coastal-coupe','classic-coupe','island-trail','countach']
export default function PrototypeOpening({onPlay,onListen,vehicle,onVehicle,night,onNight,ready,drive='city',onDrive}:{onPlay:()=>void;onListen?:()=>void;vehicle:RideVehicleId;onVehicle:(id:RideVehicleId)=>void;night:boolean;onNight:()=>void;ready:boolean;drive?:DriveMode;onDrive?:(drive:DriveMode)=>void}){
 return <div className="prototype-garage">
  <RidePicker humanRadio vehicle={vehicle} onSelect={onVehicle} only={drive==='retrowave'?[...roadRides,'delorean']:roadRides} night={night} onNightChange={next=>{if(next!==night)onNight()}} onStart={onPlay} ready={ready} routeReady={ready} startLabel="LET’S CRUISE"
   secondaryAction={onListen&&<button type="button" className="rp-listen" onClick={onListen}>Just the radio <span aria-hidden="true">♪</span></button>}
   routeControls={onDrive&&<div className="prototype-routes"><label>Choose your drive<select aria-label="Choose your drive" value={drive} onChange={e=>onDrive(e.target.value as DriveMode)}><option value="city">City / Ocean Drive</option><option value="highway">Highway / I-95</option><option value="retrowave">Retrowave / Neon city &amp; skyway</option></select></label>{drive==='retrowave'&&<small>DeLorean available exclusively in Retrowave.</small>}</div>}/>
 </div>
}
