export const INPUT_TIMEOUT=650
export const ACTIONS=['drive','stop','camera','radio','previous','next','music'] as const
export type ControllerAction=typeof ACTIONS[number]
export type ControllerInput={kind:'input';seq:number;steer:number;throttle:number;brake:number}
export type ControllerState={kind:'state';armed:boolean;available:boolean;paused:boolean;mode:string;speed:number;station:string;camera:string;radio:boolean;radioV2?:RadioRemoteState}
export const RADIO_PROTOCOL_VERSION=2
export const RADIO_COMMANDS=['play','pause','previous','next','surprise','tune','save-station','save-find','mute','volume'] as const
export type RadioRemoteAction=typeof RADIO_COMMANDS[number]
export type RadioRemoteCommand={kind:'radio-command';version:2;id:number;action:RadioRemoteAction;stationId?:string;value?:number}
export type RadioRemoteAck={kind:'radio-ack';version:2;id:number;ok:boolean;reason?:string}
export type RadioRemoteStation={id:string;name:string;url:string|null;city:string|null;genres:readonly string[];playable:boolean;surpriseEligible:boolean;favorite:boolean}
export type RadioRemoteState={status:'idle'|'loading'|'playing'|'buffering'|'paused'|'reconnecting'|'error'|'unavailable';stationId:string;stationName:string;track:string|null;kind:'track'|'show'|'unknown';verified:boolean;volume:number;muted:boolean;favorite:boolean;canSaveTrack:boolean;presets:RadioRemoteStation[];stations:RadioRemoteStation[];savedTracks:number;savedMoments:number;error:string|null}
export function parseRadioRemoteCommand(value:unknown):RadioRemoteCommand|null{
 if(!value||typeof value!=='object')return null
 const p=value as Record<string,unknown>
 if(p.kind!=='radio-command'||p.version!==RADIO_PROTOCOL_VERSION||!Number.isSafeInteger(p.id)||(p.id as number)<0||!RADIO_COMMANDS.includes(p.action as RadioRemoteAction))return null
 if(p.action==='tune'&&!(typeof p.stationId==='string'&&/^[a-z0-9-]{1,48}$/.test(p.stationId)))return null
 if(p.action==='volume'&&!(typeof p.value==='number'&&Number.isFinite(p.value)&&p.value>=0&&p.value<=1))return null
 return {kind:'radio-command',version:2,id:p.id as number,action:p.action as RadioRemoteAction,...(typeof p.stationId==='string'?{stationId:p.stationId}:{}),...(typeof p.value==='number'?{value:p.value}:{})}
}
export function parseControllerInput(value:unknown):ControllerInput|null{
 if(!value||typeof value!=='object')return null
 const p=value as Record<string,unknown>
 if(p.kind!=='input'||!Number.isSafeInteger(p.seq)||(p.seq as number)<0)return null
 if(![p.steer,p.throttle,p.brake].every(v=>typeof v==='number'&&Number.isFinite(v)))return null
 if(Math.abs(p.steer as number)>1||Math.abs(p.throttle as number)>1||(p.brake as number)<0||(p.brake as number)>1)return null
 return {kind:'input',seq:p.seq as number,steer:p.steer as number,throttle:p.throttle as number,brake:p.brake as number}
}
export function createInputGate(){
 let armed=false,sequence=-1,last=0
 return {
  get armed(){return armed},
  arm(now:number){armed=true;sequence=-1;last=now},
  stop(){const was=armed;armed=false;return was},
  accept(value:unknown,now:number){const input=parseControllerInput(value);if(!armed||!input||input.seq<=sequence)return null;sequence=input.seq;last=now;return input},
  expired(now:number){if(armed&&now-last>INPUT_TIMEOUT){armed=false;return true}return false},
 }
}
export const validRoom=(room:string)=>/^[a-f0-9]{32}$/.test(room)
export const newControllerRoom=()=>crypto.randomUUID().replaceAll('-','')
