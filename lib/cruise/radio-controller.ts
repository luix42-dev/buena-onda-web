/** A projection of the single media-element owner, safe for UI and remote state. */
export type RadioStatus='idle'|'loading'|'playing'|'buffering'|'paused'|'reconnecting'|'error'|'unavailable'
export type RadioSignals={requested:boolean;playing:boolean;loading:boolean;available:boolean;error:string|null;reconnecting?:boolean}
export function radioStatus(value:RadioSignals):RadioStatus{
 if(value.error)return 'error'
 if(value.reconnecting)return 'reconnecting'
 if(value.playing)return value.loading?'buffering':'playing'
 if(value.requested)return 'loading'
 if(!value.available)return 'idle'
 return 'paused'
}
export const RADIO_VOLUME_KEY='buena-onda:cruise:volume:v1'
export function parseRadioVolume(raw:string|null,fallback=.82):number{
 if(raw===null)return fallback
 const value=Number(raw)
 return Number.isFinite(value)&&value>=0&&value<=1?value:fallback
}
